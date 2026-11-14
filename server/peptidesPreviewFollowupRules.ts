export const PEPTIDES_PREVIEW_FOLLOWUP_START_AT = "2026-09-14T00:00:00.000Z";
export const PEPTIDES_PREVIEW_FOLLOWUP_STAGES = ["J1", "J3", "J7"] as const;
export type PeptidesPreviewFollowupStage = typeof PEPTIDES_PREVIEW_FOLLOWUP_STAGES[number];

const SUCCESS_STATUSES = new Set(["success", "sent", "delivered"]);
const INVALID_DOMAINS = new Set(["yopmail.com", "test.com", "test.fr", "example.com"]);
const INVALID_FRAGMENTS = ["achkou", "achzod", "johndoe", "noemail", "debug"];

export type PeptidesPreviewFollowupTracking = {
  emailType: string;
  sentAt: string;
  sendpulseStatus: string | null;
  sendpulseTaskId: string | null;
  id?: string;
  sendpulseError?: string | null;
  metadata?: Record<string, unknown> | null;
  deliveryEvents?: string[] | null;
};

export type PeptidesPreviewProviderOutcome = "success" | "confirmed_failed" | "reconcile_required";

export function classifyPeptidesPreviewProviderOutcome(result: {
  result: boolean;
  httpStatus?: number;
  error?: unknown;
}): PeptidesPreviewProviderOutcome {
  if (result.result === true) return "success";
  const error = (() => {
    try {
      return typeof result.error === "string" ? result.error : JSON.stringify(result.error || "");
    } catch {
      return String(result.error || "");
    }
  })().toLowerCase();
  if (Number.isFinite(result.httpStatus)) return "confirmed_failed";
  if (/unsubscribed|credentials not configured|auth failed|recipient invalid/.test(error)) return "confirmed_failed";
  return "reconcile_required";
}

export function normalizePreviewFollowupEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export function isEligiblePreviewFollowupEmail(value: unknown): boolean {
  const email = normalizePreviewFollowupEmail(value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const domain = email.split("@").pop() || "";
  return !INVALID_DOMAINS.has(domain) && !INVALID_FRAGMENTS.some((fragment) => email.includes(fragment));
}

function successfulTracking(tracking: PeptidesPreviewFollowupTracking | undefined): boolean {
  if (!tracking) return false;
  return SUCCESS_STATUSES.has(String(tracking.sendpulseStatus || "").toLowerCase());
}

function successfulStageAt(
  tracking: PeptidesPreviewFollowupTracking[],
  stage: PeptidesPreviewFollowupStage,
): Date | null {
  const emailType = `peptidesPreviewFollowup${stage}`;
  const matches = tracking
    .filter((item) => item.emailType === emailType && successfulTracking(item))
    .map((item) => new Date(item.sentAt))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return matches[0] || null;
}

export type PreviewDeliveryBlock = "recipient_suppressed" | "reconcile_required" | "retryable" | "none";

export function classifyPreviewDeliveryFailure(item: PeptidesPreviewFollowupTracking): PreviewDeliveryBlock {
  const status = String(item.sendpulseStatus || "").toLowerCase();
  const events = Array.isArray(item.deliveryEvents) ? item.deliveryEvents : [];
  const providerId = item.sendpulseTaskId || item.metadata?.providerTaskId || item.metadata?.reconciledProviderTaskId;
  const errors = [item.sendpulseError, item.metadata?.providerError].map((value) => {
    if (value && typeof value === "object") return value as Record<string, unknown>;
    try { const data = JSON.parse(String(value || "")); return data && typeof data === "object" ? data : {}; } catch { return {}; }
  });
  const raw = [item.sendpulseError, item.metadata?.providerError].map((x) => typeof x === "string" ? x : JSON.stringify(x || "")).join(" ");
  const codes = [...errors.flatMap((x) => [x.smtpAnswerCode, x.smtp_answer_code]), item.metadata?.sendpulseSmtpAnswerCode, item.metadata?.sendpulseProviderSmtpAnswerCode].map(Number).filter((x) => Number.isFinite(x) && x > 0);
  const code = codes[0];
  if (["unsubscribed", "spam", "hard_bounce"].includes(status) || events.some((x) => x === "unsubscribe" || x === "spam") || /unsubscrib|spam complaint/i.test(raw)) return "recipient_suppressed";
  if (/bad recipients|no such (user|mailbox)|user unknown|recipient invalid|address not available|mailbox unavailable|5\.1\.[0-9]/i.test(raw)) return "recipient_suppressed";
  if (status === "pending" || status === "auth_failed" || /auth failed|credentials not configured/i.test(raw)) return "reconcile_required";
  // A provider task can still deliver after a transient SMTP deferral. Never
  // issue a second send until authoritative delivery evidence is reconciled.
  if (code >= 400 && code < 500) return providerId ? "reconcile_required" : "retryable";
  if (code >= 500 || /hard_fail/i.test(raw) || status === "bounced" || events.includes("bounce")) return "reconcile_required";
  return status === "failed" ? "retryable" : "none";
}

export function hasTerminalPreviewDeliveryFailure(item: PeptidesPreviewFollowupTracking): boolean {
  const state = classifyPreviewDeliveryFailure(item);
  return state === "recipient_suppressed" || state === "reconcile_required";
}

export async function collectPreviewCandidatePages<Row, Candidate>(
  fetchPage: (offset: number, limit: number) => Promise<Row[]>,
  map: (row: Row) => Candidate | null,
  pageSize = 500,
): Promise<Candidate[]> {
  const result: Candidate[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchPage(offset, pageSize);
    for (const row of page) { const candidate = map(row); if (candidate !== null) result.push(candidate); }
    if (page.length < pageSize) return result;
  }
}

function stageTemporarilyBlocked(
  tracking: PeptidesPreviewFollowupTracking[],
  stage: PeptidesPreviewFollowupStage,
  now: Date,
): boolean {
  const emailType = "peptidesPreviewFollowup" + stage;
  const failed = tracking.filter((item) => item.emailType === emailType && classifyPreviewDeliveryFailure(item) === "retryable");
  // Deduplicate only explicit provider identities. Unlinked legacy rows count
  // conservatively as separate attempts; temporal proximity is not identity.
  const identities = new Set(failed.map((item, index) => item.sendpulseTaskId || String(item.metadata?.reconciledProviderTaskId || item.metadata?.providerTaskId || item.id || "unlinked-" + index)));
  const attempts = identities.size;
  if (attempts >= 3) return true;
  const latest = Math.max(...failed.map((item) => new Date(item.sentAt).getTime()).filter(Number.isFinite));
  const backoffMs = 2 ** Math.max(1, attempts) * 3_600_000;
  return Number.isFinite(latest) && now.getTime() - latest < backoffMs;
}

export function choosePeptidesPreviewFollowupStage(
  capturedAt: Date,
  tracking: PeptidesPreviewFollowupTracking[],
  now = new Date(),
): PeptidesPreviewFollowupStage | null {
  const ageHours = (now.getTime() - capturedAt.getTime()) / 3_600_000;
  if (!Number.isFinite(ageHours) || ageHours < 24 || ageHours > 30 * 24) return null;

  if (tracking.some(hasTerminalPreviewDeliveryFailure)) return null;
  if (tracking.some((item) => String(item.sendpulseStatus || "").toLowerCase() === "pending")) return null;
  const j1 = successfulStageAt(tracking, "J1");
  const j3 = successfulStageAt(tracking, "J3");
  const j7 = successfulStageAt(tracking, "J7");
  if (!j1) return stageTemporarilyBlocked(tracking, "J1", now) ? null : "J1";
  if (!j3 && ageHours >= 72 && now.getTime() - j1.getTime() >= 36 * 3_600_000) {
    return stageTemporarilyBlocked(tracking, "J3", now) ? null : "J3";
  }
  if (!j7 && j3 && ageHours >= 168 && now.getTime() - j3.getTime() >= 72 * 3_600_000) {
    return stageTemporarilyBlocked(tracking, "J7", now) ? null : "J7";
  }
  return null;
}
