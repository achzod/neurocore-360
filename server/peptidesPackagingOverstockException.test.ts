import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  GH_DUO_PACKAGING_OVERSTOCK_CONFIRMATION,
  packagingOverstockLimitForPeptide,
  parseGhDuoPackagingOverstockException,
} from "./peptidesPackagingOverstockException";
import { selectBestPurchasePlanWithPreferredStrength } from "./peptidesPurchasePlan";
import { isAuthorizedPackagingOverstockWithinReserve } from "./peptidesReportRepair";
import { checkPeptide } from "./peptidesReportValidator";

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

test("le repair conserve la boite GH autorisee en comparant la reserve, sans elargir aux autres molecules", () => {
  const parsed = parseGhDuoPackagingOverstockException(authorized);
  assert.ok(parsed);
  assert.equal(isAuthorizedPackagingOverstockWithinReserve({
    peptide: {
      name: "CJC-1295 sans DAC",
      dosage: "100 mcg une fois par jour",
      cycleDuration: "24 semaines actives au total. Réserve cible: 21 mg.",
    } as any,
    orderedMg: 50,
    activeNeedMg: 16.8,
    rawException: parsed,
  }), true);
  assert.equal(isAuthorizedPackagingOverstockWithinReserve({
    peptide: {
      name: "GHK-Cu",
      dosage: "2 mg par jour",
      cycleDuration: "8 semaines",
    } as any,
    orderedMg: 500,
    activeNeedMg: 112,
    rawException: parsed,
  }), false);
});

test("le validateur carte accepte le meme surstock GH autorise sur la cible avec reserve", () => {
  const parsed = parseGhDuoPackagingOverstockException(authorized);
  assert.ok(parsed);
  const issues = checkPeptide({
    name: "CJC-1295 sans DAC",
    activationStatus: "active",
    activationRequirements: [],
    evidenceSummary: "Données et limites documentées.",
    purpose: "Axe GH",
    whyThisPeptide: "Choix attribuable.",
    dosage: "100 mcg une fois par jour",
    timing: "Chaque soir",
    route: "Sous-cutanée",
    cycleDuration: "24 semaines actives au total. Réserve cible: 21 mg.",
    reconstitution: "Vial 5 mg plus 2 mL de BAC water égale 2,5 mg/mL. Pour 100 mcg, prélève 4 unités U-100, soit 0,04 mL.",
    vialsNeeded: "Achat reel 10 vials de 5 mg. Besoin actif 16.8 mg; cible avec reserve 21 mg.",
    priceEstimate: "$10/vial × 10 vials = $100 total",
    purchaseUrl: "https://www.peptaura.com/product/cjc",
    expectedEffects: "Effets documentés sans garantie.",
    contraindications: "Contre-indications documentées.",
    monitoring: "Suivi documenté.",
  } as any, parsed);
  assert.equal(issues.some((issue) => issue.includes("surcommande detectee")), false);
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
  assert.match(block, /maxCandidates: 1/);
  assert.match(block, /providerRetries: 1/);
  const payloadStart = routes.indexOf("function getPeptidesManualMutationPayload");
  const payloadEnd = routes.indexOf("function validateManualPeptidesOrderTargetOrRespond", payloadStart);
  assert.match(routes.slice(payloadStart, payloadEnd), /ghPackagingOverstockException/);
  assert.match(routes.slice(payloadStart, payloadEnd), /singleProviderPass/);
});
