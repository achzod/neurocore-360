import assert from "node:assert/strict";
import test from "node:test";

import {
  discoverySha256,
  failDiscoveryBatchItem,
  persistValidatedDiscoveryBatchItem,
} from "./discoveryBatchControl";

interface FakeState {
  batch: Record<string, unknown>;
  item: Record<string, unknown>;
  audit: Record<string, unknown>;
  auditPersistCas?: number;
  itemPersistCas?: number;
  failureItemCas?: number;
  failureRunCas?: number;
  failureAuditCas?: number;
}

class FakeClient {
  calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  released = false;
  constructor(readonly state: FakeState) {}

  async query(text: string, values?: readonly unknown[]) {
    this.calls.push({ text, values });
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(text)) return { rows: [], rowCount: 0 };
    if (/SELECT b\.\*[\s\S]*FROM discovery_batch_runs b/.test(text)) {
      return { rows: [this.state.batch], rowCount: 1 };
    }
    if (/SELECT \* FROM discovery_batch_items/.test(text)) {
      return { rows: [this.state.item], rowCount: 1 };
    }
    if (/SELECT id, responses, report_sent_at, report_delivery_status, narrative_report/.test(text)
      || /SELECT id, responses, report_delivery_status, report_sent_at, report_txt/.test(text)) {
      return { rows: [this.state.audit], rowCount: 1 };
    }
    if (/INSERT INTO report_artifacts/.test(text)) {
      return { rows: [{ id: "artifact-batch-1" }], rowCount: 1 };
    }
    if (/UPDATE audits[\s\S]*SET narrative_report = \$2::jsonb/.test(text)) {
      const rowCount = this.state.auditPersistCas ?? 1;
      return { rows: rowCount ? [{ id: this.state.audit.id }] : [], rowCount };
    }
    if (/UPDATE discovery_batch_items[\s\S]*SET state = 'STORED'/.test(text)) {
      const rowCount = this.state.itemPersistCas ?? 1;
      return { rows: rowCount ? [{ audit_id: this.state.audit.id }] : [], rowCount };
    }
    if (/UPDATE discovery_batch_items[\s\S]*SET state = \$3/.test(text)) {
      const rowCount = this.state.failureItemCas ?? 1;
      return { rows: rowCount ? [{ audit_id: this.state.audit.id }] : [], rowCount };
    }
    if (/UPDATE discovery_batch_runs[\s\S]*SET status = 'PAUSED'/.test(text)) {
      const rowCount = this.state.failureRunCas ?? 1;
      return { rows: rowCount ? [{ id: this.state.batch.id }] : [], rowCount };
    }
    if (/UPDATE audits SET report_delivery_status = 'BATCH_REVIEW'/.test(text)) {
      const rowCount = this.state.failureAuditCas ?? 1;
      return { rows: [], rowCount };
    }
    throw new Error(`unexpected fake SQL: ${text}`);
  }

  release() { this.released = true; }
}

class FakePool {
  readonly client: FakeClient;
  constructor(state: FakeState) { this.client = new FakeClient(state); }
  async connect() { return this.client; }
}

function makeState(overrides: Partial<FakeState> = {}): FakeState {
  const responses = { age: 37, objectif: "energie" };
  return {
    batch: {
      id: "batch-1",
      stage: "GENERATION",
      status: "RUNNING",
      lock_token: "lock-token-1",
      hard_per_scan_usd: 0.75,
    },
    item: {
      batch_id: "batch-1",
      audit_id: "audit-1",
      state: "GENERATED",
      provider_calls: 1,
      actual_cost_usd: 0.2,
      reserved_cost_usd: 0,
      expected_responses_sha256: discoverySha256(responses),
      expected_source_status: "NEEDS_REVIEW",
      expected_txt_sha256: null,
      expected_html_sha256: null,
    },
    audit: {
      id: "audit-1",
      responses,
      report_sent_at: null,
      report_delivery_status: "NEEDS_REVIEW",
      narrative_report: {},
      report_txt: null,
      report_html: null,
    },
    ...overrides,
  };
}

function persistenceInput(state: FakeState) {
  return {
    batchId: "batch-1",
    auditId: "audit-1",
    lockToken: "lock-token-1",
    expectedResponsesSha256: String(state.item.expected_responses_sha256),
    expectedSourceStatus: "NEEDS_REVIEW",
    expectedTxtSha256: null,
    expectedHtmlSha256: null,
    narrativeReport: { discoveryDeliveryGate: { ok: true } },
    scores: { global: 8 },
    txt: "generated txt",
    html: "<main>generated html</main>",
    model: "test-model",
  };
}

test("batch persistence commits only under exact manifest source and ownership CAS", async () => {
  const state = makeState();
  const pool = new FakePool(state);
  const result = await persistValidatedDiscoveryBatchItem(persistenceInput(state), pool as any);

  assert.equal(result.artifactId, "artifact-batch-1");
  const sql = pool.client.calls.map((call) => call.text).join("\n");
  assert.match(sql, /report_delivery_status IS NOT DISTINCT FROM \$6/);
  assert.match(sql, /report_txt IS NOT DISTINCT FROM \$8/);
  assert.match(sql, /i\.expected_source_status IS NOT DISTINCT FROM \$6/);
  assert.match(sql, /b\.lock_token = \$16 AND l\.expires_at > NOW\(\)/);
  assert.match(sql, /state = 'GENERATED' AND provider_calls = 1/);
  assert.equal(pool.client.calls.at(-1)?.text, "COMMIT");
});

test("manifest-declared absence rejects source artifacts that appeared concurrently", async () => {
  const state = makeState();
  state.audit.report_txt = "concurrent legacy report";
  const pool = new FakePool(state);

  await assert.rejects(
    persistValidatedDiscoveryBatchItem(persistenceInput(state), pool as any),
    /DISCOVERY_AUDIT_SOURCE_ARTIFACT_CHANGED/,
  );
  assert.equal(pool.client.calls.some((call) => /INSERT INTO report_artifacts/.test(call.text)), false);
  assert.equal(pool.client.calls.at(-1)?.text, "ROLLBACK");
});

test("lost item CAS rolls back artifact and audit persistence transaction", async () => {
  const state = makeState({ itemPersistCas: 0 });
  const pool = new FakePool(state);

  await assert.rejects(
    persistValidatedDiscoveryBatchItem(persistenceInput(state), pool as any),
    /DISCOVERY_BATCH_ITEM_PERSISTENCE_CAS_FAILED/,
  );
  assert.equal(pool.client.calls.at(-1)?.text, "ROLLBACK");
  assert.equal(pool.client.calls.some((call) => call.text === "COMMIT"), false);
});

test("failure transition refuses protected or changed Discovery source state", async () => {
  const state = makeState();
  state.item.state = "PROVIDER_STARTED";
  state.audit.report_delivery_status = "BATCH_READY";
  const pool = new FakePool(state);

  await assert.rejects(
    failDiscoveryBatchItem({
      batchId: "batch-1",
      auditId: "audit-1",
      lockToken: "lock-token-1",
      errorCode: "provider_error",
      errorDetail: "provider failed",
    }, pool as any),
    /DISCOVERY_BATCH_FAILURE_SOURCE_CAS_FAILED/,
  );
  assert.equal(pool.client.calls.some((call) => /SET state = \$3/.test(call.text)), false);
  assert.equal(pool.client.calls.at(-1)?.text, "ROLLBACK");
});

test("failure item CAS is exact and rolls back the whole failure transaction", async () => {
  const state = makeState({ failureItemCas: 0 });
  state.item.state = "PROVIDER_STARTED";
  const pool = new FakePool(state);

  await assert.rejects(
    failDiscoveryBatchItem({
      batchId: "batch-1",
      auditId: "audit-1",
      lockToken: "lock-token-1",
      errorCode: "provider_error",
      errorDetail: "provider failed",
    }, pool as any),
    /DISCOVERY_BATCH_ITEM_FAILURE_CAS_FAILED/,
  );
  const failureSql = pool.client.calls.find((call) => /SET state = \$3/.test(call.text))?.text || "";
  assert.match(failureSql, /state = \$6 AND provider_calls = \$7/);
  assert.match(failureSql, /b\.lock_token = \$13/);
  assert.equal(pool.client.calls.at(-1)?.text, "ROLLBACK");
});
