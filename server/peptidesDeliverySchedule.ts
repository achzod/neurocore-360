const DELIVERY_DELAY_MS = 24 * 60 * 60 * 1000;
export const PEPTIDES_GENERATION_SCHEDULE_ANCHOR = "generation_plus_24h_v1";
export const PEPTIDES_PROVISIONAL_SCHEDULE_ANCHOR = "payment_plus_24h_provisional_v1";

function validDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export interface PeptidesDeliveryScheduleDecision {
  scheduledAt: Date;
  anchor: typeof PEPTIDES_GENERATION_SCHEDULE_ANCHOR | typeof PEPTIDES_PROVISIONAL_SCHEDULE_ANCHOR;
  shouldPersist: boolean;
}

export function decidePeptidesDeliverySchedule(
  order: any,
  now = new Date(),
): PeptidesDeliveryScheduleDecision {
  const metadata = (order?.metadata as Record<string, unknown> | null) || {};
  const existing = validDate(metadata.peptidesEmailScheduledAt);
  const existingAnchor = String(metadata.peptidesEmailScheduleAnchor || "");
  const generationCompletedAt = metadata.peptidesReportId
    ? validDate(metadata.peptidesGenerationCompletedAt)
    : null;

  const anchor = generationCompletedAt
    ? PEPTIDES_GENERATION_SCHEDULE_ANCHOR
    : PEPTIDES_PROVISIONAL_SCHEDULE_ANCHOR;
  const base = generationCompletedAt || validDate(order?.paidAt) || now;
  const scheduledAt = new Date(base.getTime() + DELIVERY_DELAY_MS);
  const existingMatches = existing
    && existingAnchor === anchor
    && Math.abs(existing.getTime() - scheduledAt.getTime()) < 1000;

  return {
    scheduledAt: existingMatches ? existing : scheduledAt,
    anchor,
    shouldPersist: !existingMatches,
  };
}
