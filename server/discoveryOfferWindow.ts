// Discovery -20 % coaching offer window.
//
// Owner rule (2026-11-18): the Discovery coaching discount is valid 7 days
// after the report is delivered, everywhere. The report v3 offer section
// prints the validity date and links to /go/coaching?until=<date>; the bridge
// answers 410 after that date. Sequence emails must follow the same date:
// - emails sent inside the window (J3, J5, J7) may restate the code with the
//   exact deadline and must link through /go/coaching?until=<same date>;
// - emails sent after the window (J14, J30, or a late J5/J7) never carry the
//   code or the discount.
//
// Pure functions only: no I/O, no email, no database access.

export const DISCOVERY_OFFER_VALIDITY_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface DiscoveryOfferWindow {
  /** Last valid day, YYYY-MM-DD, as passed to /go/coaching?until=. */
  untilIso: string;
  /** French label of that day, e.g. "mercredi 25 novembre 2026". */
  label: string;
  /** Calendar days left before untilIso (0 = last valid day, Paris time). */
  daysLeft: number;
  /** True while today (Europe/Paris) is on or before untilIso, as the bridge checks. */
  active: boolean;
}

/** Today's date in Europe/Paris, YYYY-MM-DD: the same clock /go/coaching uses. */
export function parisDateIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
}

function isoDayNumber(iso: string): number {
  return Math.round(new Date(`${iso}T00:00:00Z`).getTime() / DAY_MS);
}

export function formatDiscoveryOfferLabel(untilIso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${untilIso}T12:00:00Z`));
}

/**
 * The until= date the delivered report printed, when the stored report has one
 * (v3 offer section). Legacy reports return null.
 */
export function extractReportOfferUntil(report: unknown): string | null {
  if (report == null) return null;
  let text: string;
  try {
    text = typeof report === "string" ? report : JSON.stringify(report);
  } catch {
    return null;
  }
  const match = /\/go\/coaching\?[^"'\s<>]*?until=(\d{4}-\d{2}-\d{2})/.exec(text);
  return match && ISO_DATE.test(match[1]) ? match[1] : null;
}

/**
 * Offer window for one delivered Discovery report.
 * Base: report_sent_at + 7 days. When the report itself printed an earlier
 * date, that date wins, so the email never promises more than the report.
 * Returns null when report_sent_at is missing or invalid (callers then send
 * the version without code).
 */
export function resolveDiscoveryOfferWindow(input: {
  reportSentAt: Date | string | null | undefined;
  reportUntilIso?: string | null;
  now?: Date;
}): DiscoveryOfferWindow | null {
  if (!input.reportSentAt) return null;
  const sentAt = input.reportSentAt instanceof Date ? input.reportSentAt : new Date(input.reportSentAt);
  if (Number.isNaN(sentAt.getTime())) return null;

  let untilIso = new Date(sentAt.getTime() + DISCOVERY_OFFER_VALIDITY_DAYS * DAY_MS).toISOString().slice(0, 10);
  const reportUntil = input.reportUntilIso && ISO_DATE.test(input.reportUntilIso) ? input.reportUntilIso : null;
  if (reportUntil && reportUntil < untilIso) untilIso = reportUntil;

  const today = parisDateIso(input.now ?? new Date());
  const daysLeft = isoDayNumber(untilIso) - isoDayNumber(today);
  return {
    untilIso,
    label: formatDiscoveryOfferLabel(untilIso),
    daysLeft: Math.max(0, daysLeft),
    active: today <= untilIso,
  };
}

/** A window the email may use to show the code: present and still active. */
export function activeDiscoveryOffer(window: DiscoveryOfferWindow | null | undefined): DiscoveryOfferWindow | null {
  return window && window.active ? window : null;
}

/** "Dernier jour", "Plus que 1 jour", "Plus que 3 jours". */
export function discoveryOfferCountdown(window: DiscoveryOfferWindow): string {
  if (window.daysLeft <= 0) return "Dernier jour";
  return window.daysLeft === 1 ? "Plus que 1 jour" : `Plus que ${window.daysLeft} jours`;
}

/**
 * Loads the window for an audit from its delivery timestamp and stored report.
 * `getAudit` is injected so this stays testable without a database.
 */
export async function loadDiscoveryOfferWindow(
  audit: { id: string; reportSentAt?: Date | string | null },
  getAudit: (id: string) => Promise<any>,
  now: Date = new Date(),
): Promise<DiscoveryOfferWindow | null> {
  let reportUntilIso: string | null = null;
  try {
    const full = await getAudit(audit.id);
    reportUntilIso = extractReportOfferUntil(full?.narrativeReport ?? null)
      ?? extractReportOfferUntil(full?.reportHtml ?? null);
  } catch {
    reportUntilIso = null;
  }
  return resolveDiscoveryOfferWindow({ reportSentAt: audit.reportSentAt, reportUntilIso, now });
}

/** Audit types whose delivered report opens the Discovery -20 % window. */
export const DISCOVERY_OFFER_AUDIT_TYPES = ["GRATUIT", "DISCOVERY"] as const;

/**
 * Window for a recipient known only by email (recovery CTA, formula-choice
 * lead): the latest delivered Discovery report of that email decides.
 * No delivered Discovery report means no window, so the email goes out
 * without code. `findLatestDiscovery` and `getAudit` are injected so this stays
 * testable without a database; a lookup failure also means no window.
 */
export async function loadDiscoveryOfferWindowForEmail(
  email: string,
  findLatestDiscovery: (email: string) => Promise<{ id: string; reportSentAt: Date | string | null } | null | undefined>,
  getAudit: (id: string) => Promise<any>,
  now: Date = new Date(),
): Promise<DiscoveryOfferWindow | null> {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;
  let latest: { id: string; reportSentAt: Date | string | null } | null | undefined;
  try {
    latest = await findLatestDiscovery(normalized);
  } catch {
    return null;
  }
  if (!latest?.id || !latest.reportSentAt) return null;
  return loadDiscoveryOfferWindow(latest, getAudit, now);
}

/** SQL used by the routes to find the latest delivered Discovery report of an email. */
export const LATEST_DISCOVERY_REPORT_SQL = `SELECT id, report_sent_at
   FROM audits
  WHERE LOWER(email) = $1
    AND type = ANY($2::text[])
    AND report_sent_at IS NOT NULL
  ORDER BY report_sent_at DESC
  LIMIT 1`;
