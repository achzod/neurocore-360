import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DISCOVERY_PRELAUNCH_TEST_TARGETS,
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

test("one-shot CLI requires offline kill switches and the discovery-global lock", () => {
  assert.match(cliSource, /REMEDIATION_SIDE_EFFECTS_DISABLED/);
  assert.match(cliSource, /DISCOVERY_REPORT_DELIVERY_ENABLED/);
  assert.match(cliSource, /DISCOVERY_UNIFIED_GENERATION_ENABLED/);
  assert.match(cliSource, /acquireDiscoveryGlobalLock/);
  assert.match(cliSource, /releaseDiscoveryGlobalLock/);
  assert.match(cliSource, /--quarantine-test/);
  assert.match(cliSource, /--promote-valid-no-delivery/);
  assert.match(cliSource, /--expected-current-status/);
  assert.match(cliSource, /--expected-txt-sha256/);
  assert.match(cliSource, /--expected-html-sha256/);
  assert.doesNotMatch(cliSource, /emailService|sendReportReadyEmail|sendCTAEmail/);
});
