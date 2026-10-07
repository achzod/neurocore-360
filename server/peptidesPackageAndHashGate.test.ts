import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  selectBestPurchasePlanWithMandatoryFallback,
  selectBestPurchasePlanWithPreferredStrength,
  type PurchasePlanListing,
} from "./peptidesPurchasePlan";
import {
  evaluatePeptidesReleaseHashGate,
  hashPeptidesReport,
} from "./peptidesReleaseHashGate";

type Listing = PurchasePlanListing & { supplier: string };
const listing = (
  supplier: string,
  dosage: string,
  boxSize: number,
  price: number,
): Listing => ({ supplier, dosage, boxSize, marginRate: 0, priceTiers: [{ minQty: 1, price }] });

test("Bastien: a proportionate unit basket beats a nearby-priced box of 10", () => {
  const plan = selectBestPurchasePlanWithMandatoryFallback(
    [listing("Lumira", "5mg", 1, 33.2), listing("Zenove", "5mg", 10, 109.2)],
    14,
  );
  assert.equal(plan?.listing.supplier, "Lumira");
  assert.equal(plan?.deliveredVials, 3);
  assert.equal(plan?.totalPriceUsd, 99.6);
  assert.equal(plan?.forcedPackaging, false);
});

test("Deniz: oversized preferred 10mg packaging cannot hide a safer 5mg basket", () => {
  const plan = selectBestPurchasePlanWithPreferredStrength(
    [
      listing("Lumira", "5mg", 1, 13.44),
      listing("Zenove", "5mg", 10, 42.9),
      listing("Zenove", "10mg", 10, 67.6),
    ],
    31.5,
    10,
  );
  assert.equal(plan?.listing.supplier, "Lumira");
  assert.equal(plan?.vialMg, 5);
  assert.equal(plan?.deliveredVials, 7);
  assert.equal(plan?.totalPriceUsd, 94.08);
});

test("Lazreg: proportionate unit blend wins over disproportionate box", () => {
  const plan = selectBestPurchasePlanWithPreferredStrength(
    [listing("Lumira", "10mg", 1, 32.45), listing("Zenove", "10mg", 10, 123.5)],
    33.6,
    10,
  );
  assert.equal(plan?.listing.supplier, "Lumira");
  assert.equal(plan?.deliveredVials, 4);
  assert.equal(plan?.totalPriceUsd, 129.8);
});

test("mandatory box remains available when no proportionate basket exists", () => {
  const plan = selectBestPurchasePlanWithMandatoryFallback(
    [listing("Zenove", "5mg", 10, 71.5)],
    40,
  );
  assert.equal(plan?.listing.supplier, "Zenove");
  assert.equal(plan?.deliveredVials, 10);
  assert.equal(plan?.forcedPackaging, true);
});

test("approved report substantive refresh is fail-closed and never persistable", () => {
  const current = { peptides: [{ name: "AOD-9604", priceEstimate: "$99.60" }] };
  const refreshed = { peptides: [{ name: "AOD-9604", priceEstimate: "$109.20" }] };
  const approvedHash = hashPeptidesReport(current);
  const result = evaluatePeptidesReleaseHashGate({ approvedHash, currentReport: current, refreshedReport: refreshed });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "REFRESH_MUTATES_APPROVED_REPORT");
  assert.equal(result.approvedHash, approvedHash);
  assert.equal(result.currentHash, approvedHash);
  assert.equal(result.refreshedHash, hashPeptidesReport(refreshed));
  assert.equal(result.persistRefreshed, false);
});

test("approved report ignores live-source timestamp churn without mutating storage", () => {
  const current = {
    peptides: [{ name: "AOD-9604", priceEstimate: "$99.60" }],
    sections: [
      {
        id: "guide-fournisseur",
        content: "Le catalogue a ete recrawle le 07/10/2026 11:23:36. Les pages produit et les prix selectionnes ont ete relus le 07/10/2026 11:23:38. Le pays reste France.",
      },
      {
        id: "shopping-list",
        content: "Les offres ont ete relues le 07/10/2026 11:23:38 et le crawl catalogue date du 07/10/2026 11:23:36. Les prix sont des instantanes.",
      },
    ],
    _peptauraLiveSync: {
      syncedAt: "2026-10-07T07:23:36.637Z",
      catalogRefreshedAt: "2026-10-07T07:23:36.637Z",
      listingSnapshots: [{ fetchedAt: "2026-10-07T07:23:35.820Z", totalPriceUsd: 99.6 }],
    },
  };
  const refreshed = {
    peptides: [{ name: "AOD-9604", priceEstimate: "$99.60" }],
    sections: [
      {
        id: "guide-fournisseur",
        content: "Le catalogue a ete recrawle le 07/10/2026 12:23:36. Les pages produit et les prix selectionnes ont ete relus le 07/10/2026 12:23:38. Le pays reste France.",
      },
      {
        id: "shopping-list",
        content: "Les offres ont ete relues le 07/10/2026 12:23:38 et le crawl catalogue date du 07/10/2026 12:23:36. Les prix sont des instantanes.",
      },
    ],
    _peptauraLiveSync: {
      syncedAt: "2026-10-07T08:23:36.637Z",
      catalogRefreshedAt: "2026-10-07T08:23:36.637Z",
      listingSnapshots: [{ fetchedAt: "2026-10-07T08:23:35.820Z", totalPriceUsd: 99.6 }],
    },
  };
  const result = evaluatePeptidesReleaseHashGate({
    approvedHash: hashPeptidesReport(current),
    currentReport: current,
    refreshedReport: refreshed,
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, null);
  assert.equal(result.currentContentHash, result.refreshedContentHash);
  assert.notEqual(result.currentHash, result.refreshedHash);
  assert.equal(result.persistRefreshed, false);
});

test("approval metadata without its hash fails closed", () => {
  const result = evaluatePeptidesReleaseHashGate({
    approvalExpected: true,
    approvedHash: null,
    currentReport: { version: 1 },
    refreshedReport: { version: 1 },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "APPROVED_REPORT_HASH_MISSING");
  assert.equal(result.persistRefreshed, false);
});

test("already-mutated approved report is blocked before release", () => {
  const approved = { version: 1 };
  const current = { version: 2 };
  const refreshed = { version: 3 };
  const result = evaluatePeptidesReleaseHashGate({
    approvedHash: hashPeptidesReport(approved),
    currentReport: current,
    refreshedReport: refreshed,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "CURRENT_REPORT_HASH_MISMATCH");
  assert.equal(result.persistRefreshed, false);
});

test("unapproved report may persist a validated live refresh", () => {
  const result = evaluatePeptidesReleaseHashGate({
    currentReport: { version: 1 },
    refreshedReport: { version: 2 },
  });
  assert.equal(result.ok, true);
  assert.equal(result.persistRefreshed, true);
});

test("recovery validates and hash-gates a refresh before persistence", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const recoveryStart = routes.indexOf("const repaired = await refreshPeptauraPricingForDelivery(", routes.indexOf("Recovery path"));
  const recoveryEnd = routes.indexOf("if (!validation.ok)", recoveryStart);
  const block = routes.slice(recoveryStart, recoveryEnd);
  assert.ok(recoveryStart > 0 && recoveryEnd > recoveryStart);
  assert.match(block, /const validation = validatePeptidesReport\(repaired\)/);
  assert.match(block, /evaluatePeptidesReleaseHashGate/);
  assert.match(block, /peptidesHashGateApprovalRequired/);
  assert.match(block, /setOrderMetadataKey\(order\.id, "peptidesHashGateApprovalRequired", true\)/);
  assert.match(block, /if \(hashGate\.persistRefreshed && validation\.ok\)/);
  assert.ok(block.indexOf("const validation") < block.indexOf("storage.updateBurnoutReport"));
  assert.ok(block.indexOf("evaluatePeptidesReleaseHashGate") < block.indexOf("storage.updateBurnoutReport"));
});
