import assert from "node:assert/strict";
import { buildConditionalReconstitutionText } from "../server/peptidesPurchasePlan";
import { hasCompleteConditionalReconstitution } from "../server/peptidesReportValidator";
import {
  DEFAULT_OPERATIONAL_OPENING_WINDOW_SOURCE,
  formatOperationalVials,
  formatOperationalVialPolicySummary,
  parseDocumentedStabilityConfig,
  planOperationalVials,
  withoutOperationalVialPolicySummary,
} from "../server/peptidesVialPlanning";

const documented28Days = parseDocumentedStabilityConfig("");

const clementCjc = planOperationalVials({
  name: "CJC-1295 (no DAC)", dosage: "100 mcg par injection, 5 fois par semaine",
  cycleDuration: "10 semaines", reconstitution: "Vial 5mg + 2ml BAC water", vialsNeeded: "1 vial de 5mg",
}, documented28Days);
assert.equal(clementCjc.pharmacologicalNeedMg, 5);
assert.equal(clementCjc.mathematicalMinimumVials, 1);
assert.equal(clementCjc.operationalVials, 3);
assert.equal(clementCjc.optionalSealedReserveVials, 4);
assert.equal(clementCjc.stabilitySource, DEFAULT_OPERATIONAL_OPENING_WINDOW_SOURCE);

const clementIpa = planOperationalVials({
  name: "Ipamorelin", dosage: "100 mcg par injection, 5 fois par semaine",
  cycleDuration: "10 semaines", reconstitution: "Vial 5mg + 2ml BAC water", vialsNeeded: "1 vial de 5mg",
}, documented28Days);
assert.equal(clementIpa.pharmacologicalNeedMg, 5);
assert.equal(clementIpa.operationalVials, 3);

const clementMots = planOperationalVials({
  name: "MOTS-c", dosage: "10 mg par injection, 1 fois par semaine",
  cycleDuration: "4 semaines", reconstitution: "Vial 10mg + 2ml BAC water", vialsNeeded: "4 vials de 10mg",
}, documented28Days);
assert.equal(clementMots.pharmacologicalNeedMg, 40);
assert.equal(clementMots.mathematicalMinimumVials, 4);
assert.equal(clementMots.operationalVials, 4);
assert.equal(clementMots.optionalSealedReserveVials, 5);

const noInventedStability = planOperationalVials({
  name: "BPC-157", dosage: "100 mcg par injection, 5 fois par semaine",
  cycleDuration: "10 semaines", reconstitution: "Vial 5mg + 2ml BAC water", vialsNeeded: "1 vial de 5mg",
}, documented28Days);
assert.equal(noInventedStability.status, "stability-unverified");
assert.equal(noInventedStability.mathematicalMinimumVials, 1);
assert.equal(noInventedStability.operationalVials, null);
assert.match(
  formatOperationalVials(noInventedStability, "10 semaines", "BPC-157"),
  /Achat minimum 1 vial de 5mg[\s\S]*Aucune reserve scellee n'est ajoutee pour BPC-157/
);
assert.throws(
  () => parseDocumentedStabilityConfig('{"Ipamorelin":{"days":28}}'),
  /source documentee obligatoires/,
  "Une duree sans source ne doit jamais devenir une hypothese de stabilite"
);

const previousEnvOverride = process.env.PEPTIDES_RECONSTITUTED_STABILITY_JSON;
process.env.PEPTIDES_RECONSTITUTED_STABILITY_JSON = JSON.stringify({
  Ipamorelin: { days: 21, source: "APEXLABS politique test override 21 jours" },
});
const envOverride = parseDocumentedStabilityConfig();
if (previousEnvOverride == null) delete process.env.PEPTIDES_RECONSTITUTED_STABILITY_JSON;
else process.env.PEPTIDES_RECONSTITUTED_STABILITY_JSON = previousEnvOverride;
const overriddenIpa = planOperationalVials({
  name: "Ipamorelin", dosage: "100 mcg par injection, 5 fois par semaine",
  cycleDuration: "10 semaines", reconstitution: "Vial 5mg + 2ml BAC water", vialsNeeded: "1 vial de 5mg",
}, envOverride);
assert.equal(overriddenIpa.stabilityDays, 21);
assert.equal(overriddenIpa.stabilitySource, "APEXLABS politique test override 21 jours");
assert.equal(overriddenIpa.operationalVials, 4);
const clementOperationalLine = formatOperationalVials(
  clementCjc,
  "10 semaines",
  "CJC-1295 sans DAC"
);
assert.match(clementOperationalLine, /Achat operationnel 3 vials de 5mg/i);
assert.doesNotMatch(clementOperationalLine, /fenetre operationnelle|stabilite chimique|reserve/i);

const clementPolicySummary = formatOperationalVialPolicySummary([
  { name: "CJC-1295 sans DAC", plan: clementCjc },
  { name: "Ipamorelin", plan: clementIpa },
  { name: "MOTS-c", plan: clementMots },
]);
assert.equal((clementPolicySummary.match(/fenetre operationnelle/gi) || []).length, 1);
assert.equal((clementPolicySummary.match(/stabilite chimique/gi) || []).length, 1);
assert.equal((clementPolicySummary.match(/Reserve scellee facultative/gi) || []).length, 1);
assert.match(clementPolicySummary, /CJC-1295 sans DAC: 4 vials au total/);
assert.match(clementPolicySummary, /Ipamorelin: 4 vials au total/);
assert.match(clementPolicySummary, /MOTS-c: 5 vials au total/);

// Regression fixture faithful to Clément's stored report and the deterministic
// recovery dry-run. It protects against the exact two client-facing failures:
// unresolved reconstitution prose and a policy/reserve paragraph cloned once
// per peptide (then cloned again into the narrative shopping section).
const staleClementReconstitution =
  "Aucune offre live exploitable ne fournit un format de vial. La reconstitution et les unités sont donc suspendues. " +
  "Formule future: concentration = 1000 x mg du vial divisé par ml de BAC water, puis unités U-100 = 100 mcg divisé par la concentration en mcg/ml, multiplié par 100.";
assert.equal(hasCompleteConditionalReconstitution(staleClementReconstitution), false);

const clementDryRun = [
  {
    name: "CJC-1295 sans DAC",
    dosage: "100 mcg par administration, 5 soirs par semaine, soit 500 mcg par semaine",
    cycleDuration: "10 semaines a dose fixe",
    vialMg: 5,
    unitPriceUsd: 23.16,
    plan: clementCjc,
    expectedUnits: ["2.0", "4.0"],
  },
  {
    name: "Ipamorelin",
    dosage: "100 mcg par administration, 5 soirs par semaine, soit 500 mcg par semaine",
    cycleDuration: "10 semaines a dose fixe",
    vialMg: 5,
    unitPriceUsd: 11.47,
    plan: clementIpa,
    expectedUnits: ["2.0", "4.0"],
  },
  {
    name: "MOTS-c",
    dosage: "5 mg une fois par semaine",
    cycleDuration: "8 semaines, de la semaine 3 a la semaine 10",
    vialMg: 10,
    unitPriceUsd: 20.36,
    plan: clementMots,
    expectedUnits: ["50.0", "100.0"],
  },
].map((entry) => {
  const reconstitution = buildConditionalReconstitutionText(entry.dosage, entry.vialMg);
  assert.ok(reconstitution, `${entry.name}: reconstitution conditionnelle absente`);
  assert.equal(hasCompleteConditionalReconstitution(reconstitution), true);
  assert.equal((reconstitution.match(/Si\s+[12]\s+ml\s+est confirme/gi) || []).length, 2);
  assert.doesNotMatch(reconstitution, /Si\s+3\s+ml|fabricant|professionnel|ne (?:reconstitue|commence) pas/i);
  for (const units of entry.expectedUnits) {
    assert.match(reconstitution, new RegExp(`soit ${units.replace(".", "\\.")} unites U-100`, "i"));
  }
  const operational = entry.plan.operationalVials!;
  return {
    ...entry,
    reconstitution,
    vialsNeeded: formatOperationalVials(entry.plan, entry.cycleDuration, entry.name),
    totalPriceUsd: Math.round(entry.unitPriceUsd * operational * 100) / 100,
  };
});

assert.deepEqual(clementDryRun.map((entry) => entry.plan.pharmacologicalNeedMg), [5, 5, 40]);
assert.deepEqual(clementDryRun.map((entry) => entry.plan.operationalVials), [3, 3, 4]);
assert.deepEqual(clementDryRun.map((entry) => entry.plan.optionalSealedReserveVials), [4, 4, 5]);
assert.equal(
  clementDryRun.reduce((total, entry) => total + entry.totalPriceUsd, 0).toFixed(2),
  "185.33"
);

const clementDryRunShoppingList = [
  ...clementDryRun.map(
    (entry) => `${entry.name}: ${entry.vialsNeeded} Total $${entry.totalPriceUsd.toFixed(2)}.`
  ),
  clementPolicySummary,
].join("\n");
assert.equal((clementDryRunShoppingList.match(/POLITIQUE LOGISTIQUE DES VIALS/gi) || []).length, 1);
assert.equal((clementDryRunShoppingList.match(/Reserve scellee facultative/gi) || []).length, 1);
for (const name of ["CJC-1295 sans DAC", "Ipamorelin", "MOTS-c"]) {
  assert.equal((clementDryRunShoppingList.match(new RegExp(name, "gi")) || []).length, 3);
}
const clementNarrativeLines = withoutOperationalVialPolicySummary(
  clementDryRunShoppingList.split("\n")
);
assert.equal(clementNarrativeLines.length, 3);
assert.doesNotMatch(clementNarrativeLines.join("\n"), /POLITIQUE LOGISTIQUE|Reserve scellee/i);

console.log("Peptides vial planning tests: OK");
