import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalUrlFor, isNoindexPath } from "./indexingRules";

const BASE = "https://apexlabs.achzodcoaching.com";

test("le questionnaire Peptides Engine est noindex et pointe vers l'offre", () => {
  assert.equal(isNoindexPath("/peptides-engine"), true);
  assert.equal(isNoindexPath("/peptides-engine/"), true);
  assert.equal(isNoindexPath("/peptides-engine?tier=pro"), true);
  assert.equal(canonicalUrlFor("/peptides-engine"), `${BASE}/offers/peptides-engine`);
});

test("les autres flows sont noindex avec le bon canonical", () => {
  for (const p of ["/questionnaire", "/audit-complet/questionnaire", "/audit-complet/checkout", "/peptides-preview", "/formcheck/upload", "/blood-analysis"]) {
    assert.equal(isNoindexPath(p), true, p);
  }
  assert.equal(canonicalUrlFor("/audit-complet/questionnaire"), `${BASE}/questionnaire`);
  assert.equal(canonicalUrlFor("/formcheck/upload"), `${BASE}/offers/formcheck`);
  assert.equal(canonicalUrlFor("/blood-analysis"), `${BASE}/offers/blood-analysis`);
});

test("les landings d'offre et le blog restent indexables", () => {
  for (const p of ["/", "/offers/peptides-engine", "/offers/discovery-scan", "/offers/blood-analysis", "/offers/formcheck", "/blog", "/blog/peptides-guide-complet", "/faq"]) {
    assert.equal(isNoindexPath(p), false, p);
  }
  assert.equal(canonicalUrlFor("/"), BASE);
  assert.equal(canonicalUrlFor("/offers/peptides-engine"), `${BASE}/offers/peptides-engine`);
});
