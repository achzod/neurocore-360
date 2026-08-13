import assert from "node:assert/strict";
import {
  DEFAULT_OPERATIONAL_OPENING_WINDOW_SOURCE,
  formatOperationalVials,
  parseDocumentedStabilityConfig,
  planOperationalVials,
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
assert.match(formatOperationalVials(noInventedStability, "10 semaines"), /Achat operationnel non chiffre/);
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
assert.match(formatOperationalVials(clementCjc, "10 semaines"), /fenetre operationnelle/i);
assert.match(formatOperationalVials(clementCjc, "10 semaines"), /ne constitue pas une affirmation de stabilite chimique/i);

console.log("Peptides vial planning tests: OK");
