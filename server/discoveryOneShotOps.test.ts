import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DISCOVERY_PRELAUNCH_TEST_TARGETS,
  DISCOVERY_LENNY_QUALITY_FIX_TARGET,
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

test("one-shot CLI requires offline kill switches and the discovery-global lock", () => {
  assert.match(cliSource, /REMEDIATION_SIDE_EFFECTS_DISABLED/);
  assert.match(cliSource, /DISCOVERY_REPORT_DELIVERY_ENABLED/);
  assert.match(cliSource, /DISCOVERY_UNIFIED_GENERATION_ENABLED/);
  assert.match(cliSource, /acquireDiscoveryGlobalLock/);
  assert.match(cliSource, /releaseDiscoveryGlobalLock/);
  assert.match(cliSource, /--quarantine-test/);
  assert.match(cliSource, /--promote-valid-no-delivery/);
  assert.match(cliSource, /--repair-lenny-quality/);
  assert.match(cliSource, /--expected-current-status/);
  assert.match(cliSource, /--expected-txt-sha256/);
  assert.match(cliSource, /--expected-html-sha256/);
  assert.doesNotMatch(cliSource, /emailService|sendReportReadyEmail|sendCTAEmail/);
});
