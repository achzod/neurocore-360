import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  GH_DUO_PACKAGING_OVERSTOCK_CONFIRMATION,
  packagingOverstockLimitForPeptide,
  parseGhDuoPackagingOverstockException,
} from "./peptidesPackagingOverstockException";
import { selectBestPurchasePlanWithPreferredStrength } from "./peptidesPurchasePlan";

const authorized = {
  confirmation: GH_DUO_PACKAGING_OVERSTOCK_CONFIRMATION,
  peptides: ["CJC-1295 sans DAC", "Ipamorelin"],
  maxOverstockRatio: 2.5,
  reason: "Conditionnement fournisseur live impose pour le duo GH uniquement.",
  authenticatedAdmin: true,
  holdRequired: true,
  skipEmailRequired: true,
} as const;

test("l'exception explicite autorise uniquement le duo GH jusqu'au plafond borne", () => {
  const parsed = parseGhDuoPackagingOverstockException(authorized);
  assert.ok(parsed);
  assert.equal(packagingOverstockLimitForPeptide("CJC-1295 (no DAC)", parsed), 2.5);
  assert.equal(packagingOverstockLimitForPeptide("Ipamorelin", parsed), 2.5);
  assert.equal(packagingOverstockLimitForPeptide("Retatrutide", parsed), 1.3);
  assert.equal(packagingOverstockLimitForPeptide("GHK-Cu", parsed), 1.3);
  assert.equal(packagingOverstockLimitForPeptide("Epitalon", parsed), 1.3);
});

test("le conditionnement GH x2.38 passe sans inflation de besoin, GHK-Cu x3.57 reste bloque", () => {
  const parsed = parseGhDuoPackagingOverstockException(authorized);
  assert.ok(parsed);
  const listing = { dosage: "5mg", boxSize: 10, marginRate: 0, priceTiers: [{ minQty: 1, price: 100 }] };
  const ghNeedMg = 21;
  const ghPlan = selectBestPurchasePlanWithPreferredStrength(
    [listing], ghNeedMg, 5,
    packagingOverstockLimitForPeptide("CJC-1295 sans DAC", parsed),
    packagingOverstockLimitForPeptide("CJC-1295 sans DAC", parsed),
  );
  assert.equal(ghPlan?.needMg, ghNeedMg);
  assert.equal(ghPlan?.deliveredMg, 50);
  assert.equal(Number(ghPlan?.overstockRatio.toFixed(2)), 2.38);
  const ghkPlan = selectBestPurchasePlanWithPreferredStrength(
    [{ ...listing, dosage: "50mg" }], 140, 50,
    packagingOverstockLimitForPeptide("GHK-Cu", parsed),
    packagingOverstockLimitForPeptide("GHK-Cu", parsed),
  );
  assert.equal(ghkPlan, null);
});

test("l'exception rejette l'élargissement, l'absence d'auth admin et un plafond excessif", () => {
  assert.equal(parseGhDuoPackagingOverstockException({ ...authorized, peptides: [...authorized.peptides, "GHK-Cu"] }), null);
  assert.equal(parseGhDuoPackagingOverstockException({ ...authorized, authenticatedAdmin: false }), null);
  assert.equal(parseGhDuoPackagingOverstockException({ ...authorized, maxOverstockRatio: 3.57 }), null);
});

test("le refresh de livraison reutilise uniquement l'exception GH valide persistee", () => {
  const engine = readFileSync(new URL("./peptidesEngine.ts", import.meta.url), "utf8");
  const start = engine.indexOf("export async function refreshPeptauraPricingForDelivery");
  const end = engine.indexOf("// ─── Helpers", start);
  const block = engine.slice(start, end);
  assert.match(block, /parseGhDuoPackagingOverstockException\(\(sourceReport as any\)\._packagingOverstockException\)/);
  assert.match(block, /effectivePackagingOverstockException/);
});

test("la route admin lie l'exception au HOLD, a skipEmail et au payload cible", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const start = routes.indexOf('app.post("/api/admin/peptides-generate"');
  const end = routes.indexOf("// Admin: link an orphan paid Peptides Engine order", start);
  const block = routes.slice(start, end);
  assert.match(block, /GH_PACKAGING_OVERSTOCK_EXCEPTION_REQUIRES_HOLD_AND_SKIP_EMAIL/);
  assert.match(block, /parseGhDuoPackagingOverstockException/);
  assert.match(block, /packagingOverstockException: ghPackagingOverstockException/);
  assert.match(block, /PEPTIDES_SINGLE_PROVIDER_PASS_REQUIRES_HELD_SILENT_RECOVERY/);
  assert.match(block, /maxCandidates: singleProviderPass/);
  const payloadStart = routes.indexOf("function getPeptidesManualMutationPayload");
  const payloadEnd = routes.indexOf("function validateManualPeptidesOrderTargetOrRespond", payloadStart);
  assert.match(routes.slice(payloadStart, payloadEnd), /ghPackagingOverstockException/);
  assert.match(routes.slice(payloadStart, payloadEnd), /singleProviderPass/);
});
