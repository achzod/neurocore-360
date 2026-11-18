import assert from "node:assert/strict";
import test from "node:test";
import {
  DISCOVERY_OFFER_VALIDITY_DAYS,
  activeDiscoveryOffer,
  discoveryOfferCountdown,
  extractReportOfferUntil,
  loadDiscoveryOfferWindow,
  resolveDiscoveryOfferWindow,
} from "./discoveryOfferWindow";
import { DISCOVERY_COACH_PROMO_VALIDITY_DAYS, discoveryCoachPromoDeadline } from "./discoveryCoachNarrative";

const SENT_AT = "2026-11-18T10:00:00.000Z";
const at = (iso: string) => new Date(iso);

test("the email window uses the same 7 days as the report offer", () => {
  assert.equal(DISCOVERY_OFFER_VALIDITY_DAYS, 7);
  assert.equal(DISCOVERY_OFFER_VALIDITY_DAYS, DISCOVERY_COACH_PROMO_VALIDITY_DAYS);
});

test("the deadline is report_sent_at + 7 days, the same date the report prints", () => {
  const window = resolveDiscoveryOfferWindow({ reportSentAt: SENT_AT, now: at("2026-11-21T09:00:00Z") });
  assert.ok(window);
  assert.equal(window.untilIso, "2026-11-25");
  assert.equal(window.untilIso, discoveryCoachPromoDeadline(SENT_AT).iso);
  assert.equal(window.label, "mercredi 25 novembre 2026");
  assert.equal(window.active, true);
  assert.equal(window.daysLeft, 4);
  assert.equal(discoveryOfferCountdown(window), "Plus que 4 jours");
});

test("J3, J5 and J7 fall inside the window; J14 and J30 never do", () => {
  const sent = new Date(SENT_AT).getTime();
  const day = 24 * 60 * 60 * 1000;
  const windowAtDay = (days: number) => resolveDiscoveryOfferWindow({ reportSentAt: SENT_AT, now: new Date(sent + days * day) });
  for (const days of [3, 5, 7]) assert.equal(windowAtDay(days)?.active, true, `J${days}`);
  for (const days of [8, 9, 14, 30]) assert.equal(windowAtDay(days)?.active, false, `J${days}`);
  assert.equal(discoveryOfferCountdown(windowAtDay(7)!), "Dernier jour");
  assert.equal(activeDiscoveryOffer(windowAtDay(14)), null);
});

test("the window follows the /go/coaching clock (Europe/Paris, inclusive last day)", () => {
  const lastEvening = resolveDiscoveryOfferWindow({ reportSentAt: SENT_AT, now: at("2026-11-25T22:30:00Z") });
  assert.equal(lastEvening?.active, true, "23:30 Paris on the last day");
  const nextDay = resolveDiscoveryOfferWindow({ reportSentAt: SENT_AT, now: at("2026-11-25T23:30:00Z") });
  assert.equal(nextDay?.active, false, "00:30 Paris the day after");
});

test("an earlier date printed in the report wins, a later one never extends the window", () => {
  const earlier = resolveDiscoveryOfferWindow({ reportSentAt: SENT_AT, reportUntilIso: "2026-11-24", now: at("2026-11-20T09:00:00Z") });
  assert.equal(earlier?.untilIso, "2026-11-24");
  const later = resolveDiscoveryOfferWindow({ reportSentAt: SENT_AT, reportUntilIso: "2026-12-30", now: at("2026-11-20T09:00:00Z") });
  assert.equal(later?.untilIso, "2026-11-25");
  const garbage = resolveDiscoveryOfferWindow({ reportSentAt: SENT_AT, reportUntilIso: "25/11/2026", now: at("2026-11-20T09:00:00Z") });
  assert.equal(garbage?.untilIso, "2026-11-25");
});

test("no delivery timestamp means no window, so no code", () => {
  assert.equal(resolveDiscoveryOfferWindow({ reportSentAt: null }), null);
  assert.equal(resolveDiscoveryOfferWindow({ reportSentAt: "not a date" }), null);
  assert.equal(activeDiscoveryOffer(null), null);
  assert.equal(activeDiscoveryOffer(undefined), null);
});

test("the until date is read from the stored v3 report offer link", () => {
  const report = {
    sections: [
      { id: "offre", content: '<a href="/go/coaching?code=DISCOVERY20&amp;until=2026-11-24&amp;utm_source=apexlabs">Voir</a>' },
    ],
  };
  assert.equal(extractReportOfferUntil(report), "2026-11-24");
  assert.equal(extractReportOfferUntil('<a href="/go/coaching?code=DISCOVERY20&until=2026-11-23">'), "2026-11-23");
  assert.equal(extractReportOfferUntil({ sections: [{ content: "legacy report, no offer link" }] }), null);
  assert.equal(extractReportOfferUntil(null), null);
});

test("loadDiscoveryOfferWindow combines report_sent_at and the stored report, and survives a lookup failure", async () => {
  const now = at("2026-11-20T09:00:00Z");
  const fromReport = await loadDiscoveryOfferWindow(
    { id: "a1", reportSentAt: SENT_AT },
    async () => ({ narrativeReport: { html: '<a href="/go/coaching?code=DISCOVERY20&until=2026-11-24">' } }),
    now,
  );
  assert.equal(fromReport?.untilIso, "2026-11-24");
  const lookupFails = await loadDiscoveryOfferWindow(
    { id: "a1", reportSentAt: SENT_AT },
    async () => { throw new Error("db down"); },
    now,
  );
  assert.equal(lookupFails?.untilIso, "2026-11-25");
});
