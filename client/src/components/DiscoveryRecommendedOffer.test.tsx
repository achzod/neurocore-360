import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DiscoveryOfferStickyBar, DiscoveryRecommendedOffer, buildDiscoveryOfferView } from "./DiscoveryRecommendedOffer";
import { readFileSync } from "node:fs";
import { ULTRAHUMAN_THEMES } from "./ultrahuman/themes";

const theme = ULTRAHUMAN_THEMES[0];
const NOW = new Date("2026-11-20T10:00:00Z");

test("report block shows one offer, the Discovery deduction and a discreet link to the other formulas", () => {
  const view = buildDiscoveryOfferView(
    { offer: "essential", reason: "bases_a_structurer", weakDomains: [] },
    "2026-11-19T10:00:00.000Z",
    NOW,
  );
  const html = renderToStaticMarkup(<DiscoveryRecommendedOffer theme={theme} view={view} clientName="Lea" />);
  assert.match(html, /Ma recommandation pour toi, Lea/);
  assert.match(html, /Coaching Essential/);
  assert.match(html, /DISCOVERY20/);
  assert.match(html, /tier=ESSENTIAL/);
  assert.match(html, /Voir les autres formules/);
  assert.equal((html.match(/data-testid="discovery-offer-cta"/g) || []).length, 1);
  assert.doesNotMatch(html, /Coaching Elite|Private Lab|Peptides|Anabolic|Ultimate/);
});

test("expired Discovery window: no code, direct link to the formula page", () => {
  const view = buildDiscoveryOfferView(
    { offer: "elite", reason: "plusieurs_axes", weakDomains: ["sommeil", "stress", "nutrition"] },
    "2026-10-01T10:00:00.000Z",
    NOW,
  );
  assert.equal(view.deduction, null);
  const html = renderToStaticMarkup(<DiscoveryRecommendedOffer theme={theme} view={view} clientName="Lea" />);
  assert.doesNotMatch(html, /DISCOVERY20/);
  assert.match(html, /https:\/\/www\.achzodcoaching\.com\/coaching-elite\?/);
  assert.match(html, /Je découvre Elite/);
});

test("Anabolic Bioscan and Peptides Engine highlight their coaching deduction, Peptides without any price", () => {
  const bioscan = buildDiscoveryOfferView({ offer: "anabolic-bioscan", reason: "engagement_faible", weakDomains: [] }, "2026-11-19T10:00:00Z", NOW);
  assert.match(bioscan.deduction!.detail, /59\s€/);
  const peptides = buildDiscoveryOfferView({ offer: "peptides-engine", reason: "plateau_bases_solides", weakDomains: [] }, "2026-11-19T10:00:00Z", NOW);
  const html = renderToStaticMarkup(<DiscoveryRecommendedOffer theme={theme} view={peptides} clientName="Lea" />);
  assert.match(html, /intégralement déduit de ton coaching/);
  assert.doesNotMatch(html.replace(/<[^>]+>/g, " "), /\d+\s?€/);
});

test("sticky bar points to the same single offer", () => {
  const view = buildDiscoveryOfferView({ offer: "private-lab", reason: "beaucoup_axes_engagement_fort", weakDomains: [] }, "2026-11-19T10:00:00Z", NOW);
  const html = renderToStaticMarkup(<DiscoveryOfferStickyBar theme={theme} view={view} show clientName="Lea" />);
  assert.match(html, /Coaching Private Lab/);
  assert.match(html, /utm_content=sticky/);
  assert.doesNotMatch(html, /Peptides/);
  assert.equal(renderToStaticMarkup(<DiscoveryOfferStickyBar theme={theme} view={view} show={false} />), "");
});

test("Discovery banner can hide its formula buttons", () => {
  // Source check: the banner component relies on the automatic JSX runtime,
  // which the node test runner does not provide for that file.
  const banner = readFileSync(new URL("./CoachingPromoBanner.tsx", import.meta.url), "utf8");
  assert.match(banner, /showFormules = true,/);
  assert.match(banner, /\{showFormules && promo\.recommendedFormules\.map/);
  const page = readFileSync(new URL("../pages/DiscoveryScanReport.tsx", import.meta.url), "utf8");
  assert.match(page, /showFormules=\{false\}/);
  for (const removed of ["UpgradeHero", "SmartRecommendation", "ComparisonTable", "FinalCTA", "StickyCTA", "ExitIntentPopup", "UpgradeTeaser"]) {
    assert.doesNotMatch(page, new RegExp(`<${removed}\\b`), removed);
  }
});
