import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../client/src/pages/PeptidesEngineReport.tsx", import.meta.url), "utf8");

test("decision-support reports render the full personalized analysis without injection widgets", () => {
  assert.match(source, /report\.qualityVersion === "expert-review-v2"/);
  assert.match(source, /isNonOperationalReport/);
  assert.match(source, /Analyse personnalisée complète/);
  assert.match(source, /le plan de travail sur douze semaines/);
  assert.match(source, /Semaine type : mesures, nutrition, entrainement et maintien/);
  assert.match(source, /isNonOperationalReport \? \(/);
  assert.doesNotMatch(source, /Calcul et manipulation a faire valider/);
});

test("scientific source URLs render as safe external links", () => {
  assert.match(source, /text\.split\(\/\(https\?:\\\/\\\/\[\^\\s\]\+\)\/g\)/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.match(source, /target="_blank"/);
});
