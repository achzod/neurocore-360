export const PEPTIDES_PREVIEW_FOLLOWUP_START_AT = "2026-09-17T13:06:30.000Z";
export const PEPTIDES_PREVIEW_FOLLOWUP_STAGES = ["J1", "J3", "J7"] as const;
export type PeptidesPreviewFollowupStage = typeof PEPTIDES_PREVIEW_FOLLOWUP_STAGES[number];

const SUCCESS_STATUSES = new Set(["success", "sent", "delivered"]);
const INVALID_DOMAINS = new Set(["yopmail.com", "test.com", "test.fr", "example.com"]);
const INVALID_FRAGMENTS = ["achkou", "achzodcoaching", "johndoe", "noemail", "debug"];

export type PeptidesPreviewFollowupTracking = {
  emailType: string;
  sentAt: string;
  sendpulseStatus: string | null;
  sendpulseTaskId: string | null;
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
  return Boolean(tracking.sendpulseTaskId) || SUCCESS_STATUSES.has(String(tracking.sendpulseStatus || "").toLowerCase());
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

function stageTemporarilyBlocked(
  tracking: PeptidesPreviewFollowupTracking[],
  stage: PeptidesPreviewFollowupStage,
  now: Date,
): boolean {
  const emailType = `peptidesPreviewFollowup${stage}`;
  return tracking.some((item) => {
    if (item.emailType !== emailType || successfulTracking(item)) return false;
    const status = String(item.sendpulseStatus || "").toLowerCase();
    if (status === "pending") return true;
    if (status !== "failed") return false;
    const sentAt = new Date(item.sentAt).getTime();
    return Number.isFinite(sentAt) && now.getTime() - sentAt < 2 * 3_600_000;
  });
}

export function choosePeptidesPreviewFollowupStage(
  capturedAt: Date,
  tracking: PeptidesPreviewFollowupTracking[],
  now = new Date(),
): PeptidesPreviewFollowupStage | null {
  const ageHours = (now.getTime() - capturedAt.getTime()) / 3_600_000;
  if (!Number.isFinite(ageHours) || ageHours < 24 || ageHours > 30 * 24) return null;

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
