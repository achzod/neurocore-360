import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDiscoveryDefaultMechanismSelection,
  calculateDiscoveryDeterministicProfile,
  DISCOVERY_MECHANISM_CATALOG_SHA256,
  DISCOVERY_MECHANISM_CATALOG_VERSION,
  DISCOVERY_MECHANISM_EDITORIAL_SOURCE_SHA256,
  discoveryCatalogSelectionSha256,
  reconstructDiscoveryCatalogReport,
  validateDiscoveryCatalogReportProvenance,
  validateDiscoveryPersistenceContract,
} from "./discovery-scan";

function responses(): Record<string, unknown> {
  return {
    _discoveryQuestionnaireVersion: 2,
    sexe: "homme", prenom: "Alexandre", age: "30", taille: "180", poids: "80", objectif: "performance",
    "traitement-medical": "non", "diagnostic-medical": ["aucun"], "tca-historique": "jamais",
    "heures-sommeil": "7-8", "qualite-sommeil": "bonne", endormissement: "jamais",
    "reveil-fatigue": "jamais", "reveils-nocturnes": "jamais", "heure-coucher": "22h-23h",
    "niveau-stress": "modere", anxiete: "jamais", concentration: "bonne", "humeur-fluctuation": "stable",
    "energie-matin": "bonne", "energie-aprem": "stable", "coup-fatigue": "jamais",
    "envies-sucre": "rarement", motivation: "eleve", thermogenese: "non",
    "digestion-qualite": "bonne", ballonnements: "jamais", transit: "regulier", reflux: "jamais",
    intolerance: ["aucune"], "sport-frequence": "3-4", intensite: "intense", recuperation: "bonne",
    courbatures: "parfois", "performance-evolution": "progression", "nb-repas": "3",
    "proteines-jour": "bonne", "eau-jour": "2-3L", "aliments-transformes": "rarement",
    "sucres-ajoutes": "faible", alcool: "0", "cafe-jour": "1-2", tabac: "non",
    "temps-ecran": "2-4h", "exposition-soleil": "regulier", "heures-assis": "4-6h",
    "engagement-niveau": "8-9", "motivation-principale": "performance",
    "consignes-strictes": "oui", "temps-training-semaine": "4-6h",
  };
}

function provenance(responseId = "resp-alexandre-attempt-2") {
  const selection = buildDiscoveryDefaultMechanismSelection();
  return {
    editorialSourceSha256: DISCOVERY_MECHANISM_EDITORIAL_SOURCE_SHA256,
    catalogVersion: DISCOVERY_MECHANISM_CATALOG_VERSION,
    catalogSha256: DISCOVERY_MECHANISM_CATALOG_SHA256,
    selectionSha256: discoveryCatalogSelectionSha256(selection),
    selection,
    providerResponseId: responseId,
  };
}

test("catalog replay reconstructs exact canonical assets without provider work", () => {
  const sourceResponses = responses();
  const rebuilt = reconstructDiscoveryCatalogReport({
    responses: sourceResponses,
    catalogProvenance: provenance(),
    expectedProviderResponseId: "resp-alexandre-attempt-2",
    generatedAt: "2026-08-15T00:00:00.000Z",
  });
  const deterministic = calculateDiscoveryDeterministicProfile(sourceResponses);
  assert.equal(rebuilt.narrativeReport.clientName, "Alexandre");
  assert.equal(rebuilt.narrativeReport.generatedAt, "2026-08-15T00:00:00.000Z");
  assert.deepEqual(rebuilt.scores, {
    ...deterministic.scoresByDomain,
    global: deterministic.globalScore,
  });
  assert.deepEqual(
    validateDiscoveryCatalogReportProvenance(rebuilt.narrativeReport, "resp-alexandre-attempt-2"),
    [],
  );
  assert.equal(validateDiscoveryPersistenceContract({
    narrativeReport: rebuilt.narrativeReport,
    scores: rebuilt.scores,
    txt: rebuilt.txt,
    html: rebuilt.html,
    responses: sourceResponses,
  }).ok, true);
});

test("catalog replay fails closed on a changed selection hash or response id", () => {
  const changedHash = provenance();
  changedHash.selectionSha256 = "0".repeat(64);
  assert.throws(() => reconstructDiscoveryCatalogReport({
    responses: responses(),
    catalogProvenance: changedHash,
    expectedProviderResponseId: "resp-alexandre-attempt-2",
    generatedAt: "2026-08-15T00:00:00.000Z",
  }), /DISCOVERY_CATALOG_REPLAY_PROVENANCE_MISMATCH/);
  assert.throws(() => reconstructDiscoveryCatalogReport({
    responses: responses(),
    catalogProvenance: provenance(),
    expectedProviderResponseId: "different-response",
    generatedAt: "2026-08-15T00:00:00.000Z",
  }), /DISCOVERY_CATALOG_REPLAY_PROVENANCE_MISMATCH/);
});
