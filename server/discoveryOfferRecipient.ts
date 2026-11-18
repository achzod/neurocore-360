// Database glue for the Discovery -20 % window of a recipient known only by email
// (recovery CTA campaign, recovery click follow-up, formula-choice lead).
// The rule itself lives in discoveryOfferWindow.ts (pure, tested): the latest
// delivered Discovery report of that email decides, report_sent_at + 7 days.
import { pool } from "./db";
import { storage } from "./storage";
import {
  DISCOVERY_OFFER_AUDIT_TYPES,
  LATEST_DISCOVERY_REPORT_SQL,
  loadDiscoveryOfferWindowForEmail,
  type DiscoveryOfferWindow,
} from "./discoveryOfferWindow";

export async function discoveryOfferWindowForRecipient(
  email: string,
  now: Date = new Date(),
): Promise<DiscoveryOfferWindow | null> {
  return loadDiscoveryOfferWindowForEmail(
    email,
    async (normalized) => {
      const result = await pool.query(LATEST_DISCOVERY_REPORT_SQL, [normalized, [...DISCOVERY_OFFER_AUDIT_TYPES]]);
      const row = result.rows[0];
      return row ? { id: String(row.id), reportSentAt: row.report_sent_at ?? null } : null;
    },
    (id) => storage.getAudit(id),
    now,
  );
}
