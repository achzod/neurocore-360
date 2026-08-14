import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DISCOVERY_PRELAUNCH_TEST_TARGETS,
  DISCOVERY_LENNY_QUALITY_FIX_TARGET,
  DISCOVERY_LENNY_WAKE_SUMMARY_FIX_TARGET,
  DISCOVERY_SUZIE_DUPLICATE_RESOLUTION_TARGET,
  DISCOVERY_VALID_NO_DELIVERY_TARGET,
} from "./discoveryBatchControl";

const controlSource = readFileSync(new URL("./discoveryBatchControl.ts", import.meta.url), "utf8");
const cliSource = readFileSync(new URL("../scripts/discovery-one-shot-ops.ts", import.meta.url), "utf8");

test("quarantine-test is bound to the three exact prelaunch identities", () => {
  assert.deepEqual(DISCOVERY_PRELAUNCH_TEST_TARGETS, [
    {
      id: "83720dda-b8fc-4892-ba9d-4a77e67aa46c",
      email: "test-discovery-v2@example.com",
    },
    {
      id: "5d977279-8158-4857-8a1d-eae36c6a3c26",
      email: "test-workflow-disc@test.com",
    },
    {
      id: "d8ff4fb6-961c-4b2f-8152-d181091e1ec5",
      email: "final-test-discovery@test.com",
    },
  ]);
  const start = controlSource.indexOf("export async function quarantineExactDiscoveryPrelaunchTests");
  const end = controlSource.indexOf("export async function promoteExactValidDiscoveryWithoutDelivery", start);
  const source = controlSource.slice(start, end);
  assert.match(source, /await client\.query\("BEGIN"\)/);
  assert.match(source, /assertDiscoveryOneShotLock/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /DISCOVERY_QUARANTINE_EXACT_TARGET_SET_MISMATCH/);
  assert.match(source, /report_delivery_status = 'NEEDS_REVIEW'/);
  assert.match(source, /report_delivery_status = 'SUPERSEDED'/);
  assert.match(source, /prelaunch_test_quarantine/);
  assert.match(source, /DISCOVERY_QUARANTINE_ALL_OR_NOTHING_CAS_FAILED/);
  assert.match(source, /await client\.query\("ROLLBACK"\)/);
});

test("promote-valid-no-delivery is exact, hash/gate bound and cannot deliver", () => {
  assert.deepEqual(DISCOVERY_VALID_NO_DELIVERY_TARGET, {
    id: "451d4b41-3784-4ede-9b32-d83ce33e882d",
    email: "eiphos17@gmail.com",
    expectedArtifactCount: 4,
  });
  const start = controlSource.indexOf("export async function promoteExactValidDiscoveryWithoutDelivery");
  const end = controlSource.indexOf("export async function createDiscoveryBatchRun", start);
  const source = controlSource.slice(start, end);
  assert.match(source, /expectedTxtSha256/);
  assert.match(source, /expectedHtmlSha256/);
  assert.match(source, /DISCOVERY_PROMOTION_AUDIT_HASH_MISMATCH/);
  assert.match(source, /DISCOVERY_PROMOTION_ARTIFACT_COUNT_MISMATCH/);
  assert.match(source, /DISCOVERY_PROMOTION_ARTIFACT_HASH_MISMATCH/);
  assert.match(source, /evaluateCanonicalDiscoveryArtifacts/);
  assert.match(source, /hasPassingPersistedDiscoveryDeliveryGate/);
  assert.match(source, /report_delivery_status = 'BATCH_READY'/);
  assert.match(source, /DISCOVERY_PROMOTION_CAS_FAILED/);
  assert.match(source, /emailsSent: 0/);
  assert.doesNotMatch(source, /sendReportReadyEmail\s*\(/);
  assert.doesNotMatch(source, /claimDiscoveryEmailDelivery\s*\(/);
});

test("Suzie duplicate resolution is exact, fenced, atomic and cannot generate or deliver", () => {
  assert.deepEqual(DISCOVERY_SUZIE_DUPLICATE_RESOLUTION_TARGET, {
    emailSha256: "ef7b4f356d8a3fe70f3ab85bc2306690b99cc73bc9003b7fc1b4f9fd4ec06b7c",
    userIdSha256: "1fa9d5c6a4cfb690db1740a98be4d4eb9988389956cf8ae175aa2ab19988846c",
    superseded: {
      id: "be690349-aaa7-4524-854c-ae38f5c05f6f",
      createdAt: "2026-08-13T14:45:03.692385Z",
      responsesSha256: "7b27c6698121fc07c553527054b84e39b38eab7fb6d07fa5015936be24043151",
      responseKeyCount: 65,
      expectedJobAttemptCount: 0,
    },
    canonical: {
      id: "311cbe89-30a7-40ae-94ba-ad906bf711d8",
      createdAt: "2026-08-14T09:17:12.089686Z",
      responsesSha256: "a08310574a9c5cc4d2a4b4f6ea23334bd9c0e89590b8378f2ac850174df79786",
      responseKeyCount: 62,
      expectedJobAttemptCount: 1,
    },
  });
  const start = controlSource.indexOf("export async function resolveExactDiscoveryDuplicateUnderLock");
  const end = controlSource.indexOf("export async function promoteExactValidDiscoveryWithoutDelivery", start);
  const source = controlSource.slice(start, end);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /assertDiscoveryOneShotLock/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /DISCOVERY_DUPLICATE_RESOLUTION_EXACT_TARGET_SET_MISMATCH/);
  assert.match(source, /DISCOVERY_DUPLICATE_RESOLUTION_PRIOR_ARTIFACT_OR_PROVIDER_STATE/);
  assert.match(source, /assertNoDiscoveryDeliveryTrackingOrClaim/);
  assert.match(source, /report_delivery_status = 'SUPERSEDED'/);
  assert.match(source, /replacementAuditId/);
  assert.match(source, /DISCOVERY_DUPLICATE_RESOLUTION_CAS_FAILED/);
  assert.match(source, /created_at_utc_exact/);
  assert.match(source, /SS\.US/);
  assert.match(source, /DISCOVERY_DUPLICATE_RESOLUTION_CANONICAL_STILL_DUPLICATE/);
  assert.match(source, /await client\.query\("ROLLBACK"\)/);
  assert.doesNotMatch(source, /analyzeDiscoveryScan|sendReportReadyEmail\s*\(|claimDiscoveryEmailDelivery\s*\(/);
});

test("Lenny quality repair is bound to the exact live artifact and replacement", () => {
  assert.deepEqual(DISCOVERY_LENNY_QUALITY_FIX_TARGET, {
    id: "b9abc7a5-8767-49a0-9e6c-c90798cc67f5",
    emailSha256: "b012445572ab0daac016bba32823e79213345600658d35871f58b7b3655041d0",
    expectedCurrentStatus: "BATCH_READY",
    expectedTxtSha256: "80d68e14a50c38559bbebfbc29899018773b0cbbeda12ec37803af3ccb6fcb8b",
    expectedHtmlSha256: "37d00ff2824bfc2471dffe532110162c1ec4a53a8be3754a88885c68061e9600",
    expectedArtifactCount: 1,
    expectedNarrativeTopLevelKeys: [
      "analysisMetadata", "auditType", "clientName", "generatedAt", "generationQuality",
      "globalScore", "metrics", "sections", "validationResult",
    ],
    sectionIndex: 5,
    sectionId: "sommeil",
    oldText: "La seule nuance se trouve au matin. une fatigue parfois présente au réveil, ton énergie matinale est moyenne et tu te réveilles parfois fatigué.",
    newText: "La seule nuance se trouve au réveil : une fatigue parfois présente et une énergie matinale moyenne.",
    nutritionSectionIndex: 1,
    nutritionSectionId: "global",
    nutritionOldText: "la régularité et la qualité de l’apport protéique deviennent plus importantes. je n'ai pas les éléments pour juger les quantités, la répartition ni l’apport énergétique total avec les réponses disponibles.",
    nutritionNewText: "la régularité et la qualité de l’apport protéique deviennent plus importantes. Je n'ai pas les éléments pour juger les quantités, la répartition ni l’apport énergétique total avec les réponses disponibles.",
    expectedNutritionOccurrencesPerArtifact: 1,
    promoSectionIndex: 11,
    promoSectionId: "coaching",
    expectedPromoCodeOccurrencesPerArtifact: 1,
    legacyPromoHtml: `<p class="text-xs mt-1" style="color: var(--color-text-muted);">Laisse un avis sur ton Discovery Scan ci-dessous. Après validation, tu recevras ton code promo <code class="px-1 py-0.5 rounded" style="background: var(--color-border); color: var(--color-primary);">DISCOVERY20</code> par email.</p>`,
    approvedNeutralPromoHtml: `<p class="text-xs mt-1" style="color: var(--color-text-muted);">Laisse un avis validé pour recevoir -20 % par email.</p>`,
  });
  const start = controlSource.indexOf("export async function repairExactDiscoveryTextUnderLock");
  const end = controlSource.indexOf("export async function createDiscoveryBatchRun", start);
  const source = controlSource.slice(start, end);
  const trackingGateStart = controlSource.indexOf("async function assertNoDiscoveryDeliveryTrackingOrClaim");
  const trackingGateEnd = controlSource.indexOf("/**\n * Quarantine", trackingGateStart);
  const trackingGateSource = controlSource.slice(trackingGateStart, trackingGateEnd);
  assert.match(source, /assertDiscoveryOneShotLock/);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /DISCOVERY_TEXT_REPAIR_AUDIT_HASH_MISMATCH/);
  assert.match(source, /assertNoDiscoveryDeliveryTrackingOrClaim/);
  assert.match(trackingGateSource, /sendReportReadyEmail/);
  assert.match(trackingGateSource, /sendReportRegeneratedEmail/);
  assert.doesNotMatch(trackingGateSource, /sendAdminEmailNewAudit/);
  assert.match(source, /DISCOVERY_TEXT_REPAIR_EXACT_PHRASE_MISMATCH/);
  assert.match(source, /DISCOVERY_TEXT_REPAIR_LEGACY_NUTRITION_DIVERGENCE/);
  assert.match(source, /DISCOVERY_TEXT_REPAIR_PERSISTED_NUTRITION_MISMATCH/);
  assert.match(source, /DISCOVERY_TEXT_REPAIR_LEGACY_PROMO_DIVERGENCE/);
  assert.match(source, /expectedPromoCodeOccurrencesPerArtifact/);
  assert.match(source, /approvedNeutralPromoHtml/);
  assert.match(source, /DISCOVERY_TEXT_REPAIR_STRUCTURED_REPORT_SHAPE_MISMATCH/);
  assert.match(source, /buildDiscoveryReportAssets/);
  assert.match(source, /validateDiscoveryFactualConsistency/);
  assert.match(source, /DISCOVERY_TEXT_REPAIR_FACTUAL_CONSISTENCY_FAILED/);
  assert.match(source, /evaluateDiscoveryDeliveryGate/);
  assert.match(source, /report_delivery_status = 'BATCH_READY'/);
  assert.match(source, /DISCOVERY_TEXT_REPAIR_ARTIFACT_CAS_FAILED/);
  assert.match(source, /DISCOVERY_TEXT_REPAIR_AUDIT_CAS_FAILED/);
  assert.doesNotMatch(source, /sendReportReadyEmail\s*\(/);
  assert.doesNotMatch(source, /claimDiscoveryEmailDelivery\s*\(/);
});

test("Lenny wake-summary repair is bound to the exact post-repair live revision", () => {
  assert.deepEqual(DISCOVERY_LENNY_WAKE_SUMMARY_FIX_TARGET, {
    id: "b9abc7a5-8767-49a0-9e6c-c90798cc67f5",
    emailSha256: "b012445572ab0daac016bba32823e79213345600658d35871f58b7b3655041d0",
    expectedCurrentStatus: "BATCH_READY",
    expectedResponsesJsonSha256: "0c5a9a85e1229063ba0c804ed3a67bda829244a47cef8edbd75ad4a71a585baf",
    expectedNarrativeJsonSha256: "7b8832dd52f574e66faaa792e68a4e08e4527160d3730cdfcb35162c4829344e",
    expectedTxtSha256: "61013575279537114f4def26e22deabf62299bc25c66fb6feac0c7ad293719a4",
    expectedHtmlSha256: "fa0dffd8246e3d46e6824f0bf7da70e30027f26fa8d6fe47682d7b8efce3e20a",
    expectedArtifactId: "6488d309-2ad3-45b2-8488-5a659f6d4d1e",
    expectedArtifactContentSha256: "3cd304c3af49870341f64a1f11321046e9b40727379026fdc1f09c1ed7a2c1d0",
    expectedArtifactCount: 1,
    expectedNarrativeTopLevelKeys: [
      "analysisMetadata", "auditType", "clientName", "generatedAt", "generationQuality",
      "globalScore", "metrics", "sections", "validationResult",
    ],
    sectionIndex: 1,
    sectionId: "global",
    oldText: "ton énergie matinale est moyenne, le lever est difficile et tu te réveilles parfois fatigué",
    newText: "ton énergie matinale est moyenne et tu te réveilles parfois fatigué",
    expectedOccurrencesPerRepresentation: 1,
    alreadyFixedSleepText: "La seule nuance se trouve au réveil : une fatigue parfois présente et une énergie matinale moyenne.",
    alreadyFixedNutritionText: "la régularité et la qualité de l’apport protéique deviennent plus importantes. Je n'ai pas les éléments pour juger les quantités, la répartition ni l’apport énergétique total avec les réponses disponibles.",
    promoSectionIndex: 11,
    promoSectionId: "coaching",
    approvedNeutralPromoHtml: `<p class="text-xs mt-1" style="color: var(--color-text-muted);">Laisse un avis validé pour recevoir -20 % par email.</p>`,
  });
  const start = controlSource.indexOf("export async function repairExactDiscoveryWakeSummaryUnderLock");
  const end = controlSource.indexOf("export async function createDiscoveryBatchRun", start);
  const source = controlSource.slice(start, end);
  assert.match(source, /expectedResponsesJsonSha256/);
  assert.match(source, /expectedNarrativeJsonSha256/);
  assert.match(source, /expectedArtifactId/);
  assert.match(source, /DISCOVERY_WAKE_SUMMARY_REPAIR_EXACT_PATH_OR_OCCURRENCE_MISMATCH/);
  assert.match(source, /DISCOVERY_WAKE_SUMMARY_REPAIR_PRIOR_FIX_INVARIANT_MISMATCH/);
  assert.match(source, /validateDiscoveryFactualConsistency/);
  assert.match(source, /DISCOVERY_WAKE_SUMMARY_REPAIR_PERSISTED_REPRESENTATION_MISMATCH/);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /assertNoDiscoveryDeliveryTrackingOrClaim/);
  assert.doesNotMatch(source, /sendReportReadyEmail\s*\(/);
  assert.doesNotMatch(source, /claimDiscoveryEmailDelivery\s*\(/);
});

test("one-shot CLI requires offline kill switches and the discovery-global lock", () => {
  assert.match(cliSource, /REMEDIATION_SIDE_EFFECTS_DISABLED/);
  assert.match(cliSource, /DISCOVERY_REPORT_DELIVERY_ENABLED/);
  assert.match(cliSource, /DISCOVERY_UNIFIED_GENERATION_ENABLED/);
  assert.match(cliSource, /acquireDiscoveryGlobalLock/);
  assert.match(cliSource, /releaseDiscoveryGlobalLock/);
  assert.match(cliSource, /--quarantine-test/);
  assert.match(cliSource, /--promote-valid-no-delivery/);
  assert.match(cliSource, /--repair-lenny-quality/);
  assert.match(cliSource, /--resolve-suzie-duplicate/);
  assert.match(cliSource, /--expected-current-status/);
  assert.match(cliSource, /--expected-txt-sha256/);
  assert.match(cliSource, /--expected-html-sha256/);
  assert.doesNotMatch(cliSource, /emailService|sendReportReadyEmail|sendCTAEmail/);
});
