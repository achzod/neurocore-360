import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test, { after } from "node:test";
import { Pool } from "pg";
import { hashPeptidesManualMutationPayload } from "./peptidesManualMutationGuard";

const postgresUrl = process.env.PEPTIDES_STATE_TEST_DATABASE_URL;
if (postgresUrl) {
  const parsed = new URL(postgresUrl);
  assert.ok(["127.0.0.1", "localhost"].includes(parsed.hostname), "integration fixture must be local");
  assert.equal(parsed.pathname, "/peptides_state_test", "integration fixture must use the dedicated test database");
  process.env.DATABASE_URL = postgresUrl;
}
process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";
const storageModule = import("./storage");
const fixturePool = postgresUrl ? new Pool({ connectionString: postgresUrl }) : undefined;
after(async () => { await fixturePool?.end(); });

const responses = { fixture: "synthetic non-clinical input" };
const sourceHash = hashPeptidesManualMutationPayload(responses);
const marker = { fixture: "opaque storage marker, not a clinical report" };
const fixtureRun = randomUUID();
let fixtureIndex = 0;

async function setup(extra: Record<string, unknown> = {}) {
  const { MemStorage, PgStorage } = await storageModule;
  const storage = postgresUrl ? new PgStorage() : new MemStorage();
  const order = await storage.createOrder({
    email: `state-${fixtureRun}-${++fixtureIndex}@example.invalid`,
    productType: "PEPTIDES_ENGINE",
    amountCents: 100,
    metadata: {
      peptidesResponses: responses,
      peptidesResponsesSha256: sourceHash,
      peptidesGenerationLastError: "SYNTHETIC_PREVIOUS_FAILURE",
      peptidesGenerationResponseId: "resp_synthetic_current",
      peptidesGenerationCompletedResponseId: "resp_synthetic_older",
      peptidesGenerationNextRetryAt: "2099-01-01T00:00:00.000Z",
      peptidesGenerationLeaseUntil: "2099-01-01T00:00:00.000Z",
      peptidesEmailHold: true,
      peptidesManualFulfillment: true,
      ...extra,
    },
  });
  if (fixturePool) {
    await fixturePool.query("UPDATE orders SET status = 'paid', paid_at = NOW() WHERE id = $1", [order.id]);
  } else {
    await storage.updateOrder(order.id, { status: "paid", paidAt: new Date() });
  }
  return { storage, order };
}

for (const operation of ["atomic-create", "claim", "manual-link", "replace"] as const) {
  for (const emptyCurrentResponseId of [false, true]) {
    test(`${operation}: successful transition archives stale error and preserves provider provenance (empty current=${emptyCurrentResponseId})`, async () => {
      const { storage, order } = await setup({
        ...(emptyCurrentResponseId ? { peptidesGenerationResponseId: "" } : {}),
        ...(operation === "replace" ? { peptidesReportId: "report_old_synthetic" } : {}),
      });
      let linkedId = "report_new_synthetic";
      if (operation === "atomic-create") {
        const result = await storage.createAndClaimPeptidesReport({
          orderId: order.id, email: `peptides::${order.email}`,
          responses, report: marker, expectedResponsesSha256: sourceHash,
        });
        assert.ok(result);
        linkedId = result.id;
      } else if (operation === "claim") {
        assert.equal(await storage.claimPeptidesReportSlot(order.id, linkedId), true);
      } else if (operation === "manual-link") {
        assert.equal(await storage.claimPeptidesReportSlotForManualReview(order.id, linkedId), true);
      } else {
        assert.equal(await storage.replacePeptidesReportSlotIfMatches(order.id, "report_old_synthetic", linkedId), true);
      }
      const meta = (await storage.getOrder(order.id))!.metadata as Record<string, unknown>;
      assert.equal(meta.peptidesReportId, linkedId);
      assert.equal(meta.peptidesGenerationState, "SUCCEEDED");
      assert.equal(meta.peptidesGenerationLastError, "");
      assert.equal(meta.peptidesGenerationPreviousError, "SYNTHETIC_PREVIOUS_FAILURE");
      const expectedProviderId = emptyCurrentResponseId ? "resp_synthetic_older" : "resp_synthetic_current";
      if (operation === "manual-link" || operation === "replace") {
        assert.equal(meta.peptidesGenerationPreviousResponseId, expectedProviderId);
        assert.equal(meta.peptidesGenerationCompletedResponseId, "", "manual relinking must not attribute the old provider response to the new artifact");
      } else {
        assert.equal(meta.peptidesGenerationCompletedResponseId, expectedProviderId);
      }
      assert.equal(meta.peptidesGenerationResponseId, "");
      assert.equal(meta.peptidesGenerationLeaseUntil, "");
      assert.equal(meta.peptidesGenerationNextRetryAt, "");
      assert.equal(meta.peptidesEmailHold, true);
      assert.equal(meta.peptidesManualFulfillment, true);
      if (operation === "manual-link" || operation === "replace") {
        assert.ok(!meta.peptidesEmailScheduledAt, "manual transitions must not schedule delivery");
      }
    });
  }
}

test("successful transition without a current error keeps the previous diagnostic", async () => {
  const { storage, order } = await setup({
    peptidesGenerationLastError: "", peptidesGenerationPreviousError: "OLDER_SYNTHETIC_DIAGNOSTIC",
  });
  assert.equal(await storage.claimPeptidesReportSlot(order.id, "report_synthetic"), true);
  const meta = (await storage.getOrder(order.id))!.metadata as Record<string, unknown>;
  assert.equal(meta.peptidesGenerationPreviousError, "OLDER_SYNTHETIC_DIAGNOSTIC");
});

for (const lease of ["", "not-a-date", "2000-01-01T00:00:00.000Z"]) {
  test(`atomic creation rejects an absent, invalid or expired worker lease: ${JSON.stringify(lease)}`, async () => {
    const { storage, order } = await setup({
      peptidesGenerationClaimId: "claim_synthetic", peptidesGenerationLeaseUntil: lease,
    });
    const before = JSON.stringify((await storage.getOrder(order.id))!.metadata);
    const result = await storage.createAndClaimPeptidesReport({
      orderId: order.id, email: `peptides::${order.email}`,
      responses, report: marker, expectedResponsesSha256: sourceHash,
      expectedGenerationClaimId: "claim_synthetic",
    });
    assert.equal(result, undefined);
    assert.equal(JSON.stringify((await storage.getOrder(order.id))!.metadata), before);
    assert.equal((await storage.getAllBurnoutReports()).filter(record => record.email === `peptides::${order.email}`).length, 0);
  });
}

test("atomic creation with a valid claim remains single-writer and creates no orphan", async () => {
  const { storage, order } = await setup({ peptidesGenerationClaimId: "claim_synthetic" });
  const results = await Promise.all(Array.from({ length: 5 }, () => storage.createAndClaimPeptidesReport({
    orderId: order.id, email: `peptides::${order.email}`,
    responses, report: marker, expectedResponsesSha256: sourceHash,
    expectedGenerationClaimId: "claim_synthetic",
  })));
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal((await storage.getAllBurnoutReports()).filter(record => record.email === `peptides::${order.email}`).length, 1);
});

test("PostgreSQL success paths archive diagnostics, clear retry state and retain non-empty provider evidence", () => {
  const source = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
  const pg = source.slice(source.indexOf("export class PgStorage"));
  for (const name of ["createAndClaimPeptidesReport", "claimPeptidesReportSlot", "claimPeptidesReportSlotForManualReview", "replacePeptidesReportSlotIfMatches"]) {
    const start = pg.indexOf(`async ${name}(`);
    assert.ok(start >= 0, name);
    const end = pg.indexOf("\n  async ", start + 1);
    const body = pg.slice(start, end < 0 ? undefined : end);
    assert.match(body, /'peptidesGenerationLastError', ''/, name);
    assert.match(body, /'peptidesGenerationPreviousError', COALESCE\(NULLIF\(metadata->>'peptidesGenerationLastError', ''\)/, name);
    if (name === "claimPeptidesReportSlotForManualReview" || name === "replacePeptidesReportSlotIfMatches") {
      assert.match(body, /'peptidesGenerationPreviousResponseId', COALESCE\(NULLIF\(metadata->>'peptidesGenerationResponseId', ''\)/, name);
      assert.ok(body.includes("'peptidesGenerationCompletedResponseId', ''"), name);
    } else {
      assert.match(body, /'peptidesGenerationCompletedResponseId', COALESCE\(NULLIF\(metadata->>'peptidesGenerationResponseId', ''\)/, name);
    }
    for (const key of ["peptidesGenerationResponseId", "peptidesGenerationLeaseUntil", "peptidesGenerationNextRetryAt"]) {
      assert.ok(body.includes(`'${key}', ''`), `${name}: ${key}`);
    }
  }
});
