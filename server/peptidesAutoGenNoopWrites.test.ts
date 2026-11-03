import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:***@127.0.0.1:5432/test";
const { MemStorage } = await import("./storage");
const { reconcilePeptidesAutogenLegacyDelivery } = await import("./peptidesAutogenLegacyDelivery");

const ESTEBAN_EMAIL = "esteban.vichera@hotmail.fr";
const LAURENT_EMAIL = "laurent.autogen@example.com";

function sha(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function snapshot(storage: InstanceType<typeof MemStorage>, orderIds: string[], reportIds: string[]) {
  const orders = await Promise.all(orderIds.map(async (id) => {
    const order = await storage.getOrder(id);
    return order && {
      id: order.id,
      email: order.email,
      status: order.status,
      paidAt: order.paidAt,
      metadata: order.metadata,
      updatedAt: order.updatedAt,
    };
  }));
  const reports = await Promise.all(reportIds.map(async (id) => {
    const report = await storage.getBurnoutReport(id);
    return report && { id: report.id, email: report.email, report: report.report };
  }));
  return {
    ordersSha256: sha(orders),
    reportsSha256: sha(reports),
    holdsSha256: sha(orders.map((order) => order && ({
      id: order.id,
      hold: (order.metadata as any)?.peptidesEmailHold,
      reason: (order.metadata as any)?.peptidesEmailHoldReason,
      manual: (order.metadata as any)?.peptidesManualFulfillment,
    }))),
    reservations: orders.reduce((count, order) => count + Number(Boolean(
      (order?.metadata as any)?.peptidesGenerationReservationLedger?.length
      || (order?.metadata as any)?.peptidesGenerationReservedCostMicroUsd,
    )), 0),
    leases: orders.reduce((count, order) => count + Number(Boolean(
      (order?.metadata as any)?.peptidesGenerationLeaseUntil
      || (order?.metadata as any)?.peptidesManualProviderLeaseUntil,
    )), 0),
    trackingCount: (storage as any).emailTrackings.size,
  };
}

test("two consecutive 133-order AutoGen legacy sweeps are strict no-ops", async () => {
  const storage = new MemStorage();
  const orderIds: string[] = [];
  const reportIds: string[] = [];
  const pairs: Array<{ orderId: string; reportId: string; accepted: boolean }> = [];

  for (let index = 0; index < 133; index += 1) {
    const email = index === 0
      ? ESTEBAN_EMAIL
      : index === 1
        ? LAURENT_EMAIL
        : `legacy-peptides-${index}@example.com`;
    const report = await storage.createBurnoutReport({
      email: `peptides::${email}`,
      responses: { index },
      report: { immutableMarker: index },
    });
    const accepted = index === 0;
    const order = await storage.createOrder({
      email,
      productType: "PEPTIDES_ENGINE",
      amountCents: 19900,
      metadata: {
        peptidesReportId: report.id,
        peptidesEmailHold: true,
        peptidesEmailHoldReason: accepted ? "OWNER_HOLD" : "LEGACY_DELIVERY_EVIDENCE_UNSCOPED",
        peptidesManualFulfillment: true,
        peptidesManualFulfillmentState: accepted ? "MANUAL_REVIEW" : "LEGACY_DELIVERY_REQUIRES_REVIEW",
        ...(accepted ? {
          peptidesDeliveryReportId: report.id,
          peptidesDeliveryState: "ACCEPTED",
        } : {}),
      },
    });
    await storage.updateOrder(order.id, { status: "paid", paidAt: new Date("2026-10-01T00:00:00.000Z") });
    const tracking = await storage.createEmailTracking("", "sendCTAEmail", email);
    Object.assign(tracking as any, {
      subject: "Ton protocole peptides personnalisé est prêt",
      sendpulseStatus: "success",
      metadata: {},
    });
    orderIds.push(order.id);
    reportIds.push(report.id);
    pairs.push({ orderId: order.id, reportId: report.id, accepted });
  }

  const before = await snapshot(storage, orderIds, reportIds);
  for (let cycle = 0; cycle < 2; cycle += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2));
    const outcomes = await Promise.all(pairs.map(async ({ orderId }) => {
      const order = await storage.getOrder(orderId);
      return reconcilePeptidesAutogenLegacyDelivery(storage, order);
    }));
    assert.equal(outcomes.filter((value) => value.status === "NOT_APPLICABLE").length, 1, `cycle ${cycle + 1}`);
    assert.equal(outcomes.filter((value) => value.status === "AMBIGUOUS").length, 132, `cycle ${cycle + 1}`);
    assert.deepEqual(await snapshot(storage, orderIds, reportIds), before, `cycle ${cycle + 1} mutated state`);
  }

  const esteban = await storage.getOrder(orderIds[0]);
  const laurent = await storage.getOrder(orderIds[1]);
  assert.equal(esteban?.email, ESTEBAN_EMAIL);
  assert.equal((esteban?.metadata as any)?.peptidesDeliveryState, "ACCEPTED");
  assert.equal((esteban?.metadata as any)?.peptidesEmailHold, true);
  assert.equal(laurent?.email, LAURENT_EMAIL);
  assert.equal((laurent?.metadata as any)?.peptidesEmailHoldReason, "LEGACY_DELIVERY_EVIDENCE_UNSCOPED");
  assert.equal(before.reservations, 0);
  assert.equal(before.leases, 0);
  assert.equal(before.trackingCount, 133);
});

test("Postgres metadata writers lock, compare and skip before touching updated_at", () => {
  const storage = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const autoGenStart = routes.indexOf("// Auto-recovery: generate missing peptides reports every 5 minutes");
  const reconciliation = routes.indexOf("reconcilePeptidesAutogenLegacyDelivery(storage, order)", autoGenStart);
  const invariant = routes.indexOf("evaluatePeptidesFulfillmentInvariant({", autoGenStart);
  assert.ok(autoGenStart >= 0 && reconciliation > autoGenStart && reconciliation < invariant);
  const helperStart = storage.indexOf("async function setOrderMetadataPatchCompareAndSkip");
  const helperEnd = storage.indexOf("export interface MagicToken", helperStart);
  const helper = storage.slice(helperStart, helperEnd);
  assert.match(helper, /SELECT metadata[\s\S]*FOR UPDATE/);
  assert.match(helper, /if \(!orderMetadataPatchChanges[\s\S]*COMMIT[\s\S]*return true/);
  assert.match(helper, /UPDATE orders[\s\S]*updated_at = NOW\(\)/);
  assert.match(storage, /backfillAcceptedPeptidesDeliveryFromTracking[\s\S]*LEGACY_DELIVERY_EVIDENCE_UNSCOPED[\s\S]*AND NOT \(COALESCE\(metadata, '\{\}'::jsonb\) @> \$1::jsonb\)/);
});
