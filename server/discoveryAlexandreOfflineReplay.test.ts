import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET,
  discoveryAlexandreReplaySha256,
} from "./discoveryAlexandreOfflineReplay";

const source = readFileSync(new URL("./discoveryAlexandreOfflineReplay.ts", import.meta.url), "utf8");
const cli = readFileSync(new URL("../scripts/replay-alexandre-discovery-offline.ts", import.meta.url), "utf8");

test("Alexandre replay is pinned to the exact audit, terminal attempt and ledger cardinality", () => {
  assert.deepEqual(DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET, {
    auditId: "e860b380-3a6e-4c64-b823-3422476b7cd2",
    emailSha256: "0ae1447d6dd547ce59b3d116435794a73f7b36965b5fe03f5c3698127411ecce",
    sourceStatus: "BATCH_REVIEW",
    attemptCount: 2,
    completedLedgerCount: 2,
    replayAttemptNo: 2,
    replaySourceKind: "ASSEMBLED_REJECTED",
    replayCandidateState: "TERMINAL_REJECTED",
  });
  assert.match(source, /ORDER BY attempt_no/);
  assert.match(source, /!== DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET\.attemptCount/);
  assert.match(source, /!== DISCOVERY_ALEXANDRE_OFFLINE_REPLAY_TARGET\.completedLedgerCount/);
  assert.match(source, /r\.status='COMPLETED'/);
  assert.match(source, /e\.status='completed'/);
  assert.match(source, /delivery_tracking/);
  assert.match(source, /delivery_claims/);
  assert.match(source, /active_generation_claims/);
});

test("apply is manifest-CAS, transactional, append-only and leaves candidate/ledgers intact", () => {
  assert.match(source, /BEGIN/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /ALEXANDRE_REPLAY_MANIFEST_CAS_MISMATCH/);
  assert.match(source, /reconstructDiscoveryCatalogReport/);
  assert.match(source, /evaluateDiscoveryDeliveryGate/);
  assert.match(source, /validateDiscoveryPersistenceContract/);
  assert.match(source, /validateDiscoveryReportAgainstResponses/);
  assert.match(source, /SET artifact_state='SUPERSEDED'/);
  assert.match(source, /'ACTIVE',\s*\$9::varchar\(36\),NOW\(\)/);
  assert.match(source, /INSERT INTO discovery_offline_replay_proofs/);
  assert.doesNotMatch(source, /UPDATE discovery_rejected_candidates/);
  assert.doesNotMatch(source, /UPDATE ai_cost_budget_reservations/);
  assert.doesNotMatch(source, /UPDATE ai_usage_events/);
  assert.match(source, /ROLLBACK/);
});

test("dedicated CLI requires offline flags and imports no provider or mail implementation", () => {
  assert.match(cli, /REMEDIATION_SIDE_EFFECTS_DISABLED/);
  assert.match(cli, /DISCOVERY_REPORT_DELIVERY_ENABLED/);
  assert.match(cli, /DISCOVERY_UNIFIED_GENERATION_ENABLED/);
  assert.match(cli, /--expected-manifest-sha256/);
  assert.doesNotMatch(cli, /analyzeDiscoveryScan|generateDiscoveryNarrativeAI|sendReportReadyEmail|sendReportRegeneratedEmail/);
});

test("manifest hashing is stable across object key order", () => {
  assert.equal(discoveryAlexandreReplaySha256({ a: 1, b: [2, 3] }),
    discoveryAlexandreReplaySha256({ b: [2, 3], a: 1 }));
});
