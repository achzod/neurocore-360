import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../client/src/pages/PeptidesEngineReport.tsx", import.meta.url), "utf8");

test("medical-review reports explain the exact non-operational scope", () => {
  assert.match(source, /Analyse scientifique disponible · protocole injectable non fourni/);
  assert.match(source, /ne fournit pas de dose injectable personnalisée/);
  assert.match(source, /ni de lien d'achat d'une molécule expérimentale/);
  assert.doesNotMatch(source, /Calcul et manipulation a faire valider/);
});

test("scientific source URLs render as safe external links", () => {
  assert.match(source, /text\.split\(\/\(https\?:\\\/\\\/\[\^\\s\]\+\)\/g\)/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.match(source, /target="_blank"/);
});
