import assert from "node:assert/strict";
import test from "node:test";

import {
  GenericAuditMutationBarrierError,
  runGenericAuditMutation,
} from "./discoveryGenericMutationBarrier";

class FakeClient {
  calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  released = false;

  constructor(
    private readonly audit: Record<string, unknown> | null,
    private readonly activeGlobalLock: boolean,
  ) {}

  async query(text: string, values?: readonly unknown[]) {
    this.calls.push({ text, values });
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(text)) return { rows: [], rowCount: 0 };
    if (/^SELECT pg_advisory_xact_lock/.test(text)) return { rows: [], rowCount: 1 };
    if (/FROM audits WHERE id = \$1 FOR UPDATE/.test(text)) {
      const rows = this.audit ? [this.audit] : [];
      return { rows, rowCount: rows.length };
    }
    if (/FROM discovery_operation_lock/.test(text)) {
      const rows = this.activeGlobalLock ? [{ exists: 1 }] : [];
      return { rows, rowCount: rows.length };
    }
    if (/UPDATE audits SET responses/.test(text)) return { rows: [{ id: values?.[1] }], rowCount: 1 };
    throw new Error(`unexpected fake SQL: ${text}`);
  }

  release() { this.released = true; }
}

class FakePool {
  readonly client: FakeClient;
  constructor(audit: Record<string, unknown> | null, activeGlobalLock = false) {
    this.client = new FakeClient(audit, activeGlobalLock);
  }
  async connect() { return this.client; }
}

function audit(type: string, status: string | null = "READY") {
  return {
    id: "audit-barrier-1",
    type,
    created_at: "2026-08-14T00:00:00.000Z",
    report_delivery_status: status,
    report_sent_at: status === "SENT" ? "2026-08-14T01:00:00.000Z" : null,
    narrative_report: {},
  };
}

test("central barrier blocks every generic Discovery mutation before its callback", async () => {
  for (const status of ["NEEDS_REVIEW", "BATCH_READY", "SENT", "SUPERSEDED"]) {
    const pool = new FakePool(audit("GRATUIT", status));
    let callbackCalls = 0;
    await assert.rejects(
      runGenericAuditMutation({
        auditId: "audit-barrier-1",
        operation: `test.${status}`,
        mutate: async () => { callbackCalls += 1; },
      }, pool as any),
      (error: unknown) => error instanceof GenericAuditMutationBarrierError
        && error.code === "DISCOVERY_GENERIC_MUTATION_BLOCKED",
    );
    assert.equal(callbackCalls, 0, status);
    assert.deepEqual(pool.client.calls.slice(-1).map((call) => call.text), ["ROLLBACK"]);
    assert.equal(pool.client.released, true);
  }
});

test("active discovery-global lock is reported before the permanent generic block", async () => {
  const pool = new FakePool(audit("GRATUIT", "NEEDS_REVIEW"), true);
  await assert.rejects(
    runGenericAuditMutation({
      auditId: "audit-barrier-1",
      operation: "test.active-lock",
      mutate: async () => assert.fail("Discovery callback must never run"),
    }, pool as any),
    (error: unknown) => error instanceof GenericAuditMutationBarrierError
      && error.code === "DISCOVERY_GLOBAL_LOCK_ACTIVE",
  );
  assert.equal(pool.client.calls.at(-1)?.text, "ROLLBACK");
});

test("non-Discovery mutation executes under the same transaction fence", async () => {
  const pool = new FakePool(audit("PREMIUM"));
  const result = await runGenericAuditMutation({
    auditId: "audit-barrier-1",
    operation: "test.paid",
    mutate: async (client) => client.query(
      "UPDATE audits SET responses = $1::jsonb WHERE id = $2 AND type <> 'GRATUIT' RETURNING id",
      ["{}", "audit-barrier-1"],
    ),
  }, pool as any);

  assert.equal(result.rowCount, 1);
  const texts = pool.client.calls.map((call) => call.text);
  assert.ok(texts.indexOf("BEGIN") < texts.findIndex((text) => /^SELECT pg_advisory/.test(text)));
  assert.ok(texts.findIndex((text) => /UPDATE audits SET responses/.test(text)) < texts.indexOf("COMMIT"));
  assert.equal(texts.includes("ROLLBACK"), false);
});
