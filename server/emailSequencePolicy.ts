type EmailTrackingLike = {
  emailType?: unknown;
  sendpulseStatus?: unknown;
  sendpulseError?: unknown;
  sendpulse_error?: unknown;
  sentAt?: unknown;
};

export const normalizeSearchText = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const isPermanentEmailFailure = (tracking: EmailTrackingLike): boolean => {
  const error = normalizeSearchText(tracking?.sendpulseError || tracking?.sendpulse_error || "");
  return [
    "unsubscrib",
    "spam",
    "hard_fail",
    "hard fail",
    "bounce",
    "bad recipient",
    "no mx",
    "invalid recipient",
    "mailbox does not exist",
    "user unknown",
  ].some((fragment) => error.includes(fragment));
};

export const isEmailSequenceAttempted = (tracking: EmailTrackingLike): boolean => {
  const status = String(tracking?.sendpulseStatus || "").toLowerCase();
  if (["success", "sent", "delivered", "pending", "unsubscribed", "auth_failed"].includes(status)) return true;
  return status === "failed" && isPermanentEmailFailure(tracking);
};

export const getSuppressedSequenceEmailTypes = (
  history: EmailTrackingLike[],
  now = new Date(),
): string[] => {
  const byType = new Map<string, EmailTrackingLike[]>();
  for (const tracking of history || []) {
    const emailType = String(tracking?.emailType || "");
    if (!emailType) continue;
    const rows = byType.get(emailType) || [];
    rows.push(tracking);
    byType.set(emailType, rows);
  }

  const suppressed: string[] = [];
  for (const [emailType, rows] of byType) {
    if (rows.some(isEmailSequenceAttempted)) {
      suppressed.push(emailType);
      continue;
    }

    const failedRows = rows.filter((row) => String(row?.sendpulseStatus || "").toLowerCase() === "failed");
    const validAttemptTimes = rows
      .map((row) => new Date(String(row?.sentAt || 0)).getTime())
      .filter(Number.isFinite);
    const latestAttemptMs = validAttemptTimes.length > 0 ? Math.max(...validAttemptTimes) : 0;
    const hoursSinceLatest = latestAttemptMs > 0 ? (now.getTime() - latestAttemptMs) / 3_600_000 : Infinity;

    // Allow one delayed retry for a genuinely transient provider failure.
    // Suppress every other case so a frequent cron cannot hammer recipients.
    if (failedRows.length >= 2 || hoursSinceLatest < 12) suppressed.push(emailType);
  }
  return suppressed;
};
