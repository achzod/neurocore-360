import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildDiscoveryOfferEmailSection } from "./emailService";

const BASE = "https://apexlabs.achzodcoaching.com";
const OPEN = { untilIso: "2026-11-26", label: "jeudi 26 novembre 2026" };

function visibleText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

test("Discovery email: one recommended formula, its deduction up front, the rest behind a discreet link", () => {
  const html = buildDiscoveryOfferEmailSection({
    recommendation: { offer: "elite", reason: "plusieurs_axes", weakDomains: ["sommeil", "stress", "nutrition"] },
    baseUrl: BASE,
    openWindow: OPEN,
    color: "#FCDD00",
  });
  const text = visibleText(html);
  assert.match(text, /Coaching Elite/);
  assert.match(text, /-20\s% sur ton coaching grâce à ton Discovery/);
  assert.match(text, /DISCOVERY20/);
  assert.match(text, /jusqu'au jeudi 26 novembre 2026/);
  assert.match(text, /Voir les autres formules/);
  // No multi-offer table: the other tiers are not listed.
  assert.doesNotMatch(text, /Essential|Private Lab|Peptides|Anabolic|Ultimate/);
  assert.match(html, /tier=ELITE/);
  assert.match(html, /until=2026-11-26/);
  assert.match(html, /utm_campaign=discovery_offre_unique/);
});

test("Discovery email: Anabolic Bioscan shows its coaching deduction, Peptides Engine never shows a price", () => {
  const bioscan = visibleText(buildDiscoveryOfferEmailSection({
    recommendation: { offer: "anabolic-bioscan", reason: "engagement_faible", weakDomains: [] },
    baseUrl: BASE,
    openWindow: null,
    color: "#FCDD00",
  }));
  assert.match(bioscan, /59\s€ de ton Anabolic Bioscan sont déduits à 100\s%/);
  assert.doesNotMatch(bioscan, /DISCOVERY20/);

  const peptidesHtml = buildDiscoveryOfferEmailSection({
    recommendation: { offer: "peptides-engine", reason: "plateau_bases_solides", weakDomains: [] },
    baseUrl: BASE,
    openWindow: OPEN,
    color: "#FCDD00",
  });
  const peptides = visibleText(peptidesHtml);
  assert.match(peptides, /Peptides Engine/);
  assert.match(peptides, /intégralement déduit de ton coaching/);
  assert.doesNotMatch(peptides, /\d+\s?€|EUR/);
  assert.match(peptidesHtml, /\/offers\/peptides-engine\?/);
});

test("Discovery email copy: tutoiement, no long dash, no emoji, no forbidden word", () => {
  const forbidden = /\bIA\b|moteur|g[ée]n[ée]r[ée]|r[ée]g[ée]n[ée]r|personnalis|automatique|—|–/i;
  for (const recommendation of [
    { offer: "essential", reason: "bases_a_structurer", weakDomains: [] },
    { offer: "elite", reason: "plusieurs_axes", weakDomains: ["sommeil"] },
    { offer: "private-lab", reason: "beaucoup_axes_engagement_fort", weakDomains: ["sommeil", "stress", "energie", "mindset"] },
    { offer: "anabolic-bioscan", reason: "engagement_faible", weakDomains: [] },
    { offer: "peptides-engine", reason: "plateau_bases_solides", weakDomains: [] },
  ] as const) {
    for (const openWindow of [OPEN, null]) {
      const text = visibleText(buildDiscoveryOfferEmailSection({
        recommendation: { ...recommendation, weakDomains: [...recommendation.weakDomains] },
        baseUrl: BASE,
        openWindow,
        color: "#FCDD00",
      }));
      assert.doesNotMatch(text, forbidden, recommendation.offer);
      assert.doesNotMatch(text, /\p{Extended_Pictographic}/u, recommendation.offer);
      assert.doesNotMatch(text, /\bvous\b|\bvotre\b/i, recommendation.offer);
    }
  }
});

test("report-ready email uses the single-offer block for Discovery and keeps the old block otherwise", () => {
  const email = readFileSync(new URL("./emailService.ts", import.meta.url), "utf8");
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  assert.match(email, /auditType === "GRATUIT" && discoveryRecommendation\s*\? buildDiscoveryOfferEmailSection\(/);
  assert.match(routes, /sendReportReadyEmail\(email, auditId, auditType, baseUrl, discoveryRecommendation\)/);
  const getStart = routes.indexOf('app.get("/api/discovery-scan/:auditId"');
  const getRoute = routes.slice(getStart, routes.indexOf('app.post("/api/discovery-scan/:auditId/regenerate"', getStart));
  assert.equal((getRoute.match(/res\.json\(withOfferRecommendation\(/g) || []).length, 4);
});
