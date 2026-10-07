import assert from "node:assert/strict";
import test from "node:test";

import { calculateReserveTargetMg } from "./peptidesReservePlanning";
import { checkPeptide } from "./peptidesReportValidator";
import { deriveReportCycleWeeks, extractLiveReportCosts } from "./peptidesReportRepair";

const base = {
  route: "Sous-cutanée",
  timing: "Selon calendrier",
  purpose: "Récupération",
  purchaseUrl: "https://www.peptaura.com/product/example",
  cycleDuration: "8 semaines actives",
  reconstitution: "Vial 5 mg + 2 ml de BAC water",
  whyThisPeptide: "Choix personnalisé suffisamment détaillé pour le profil et les objectifs déclarés du client.",
};

test("calcule la réserve Esteban depuis le besoin actif et la semaine maximale", () => {
  assert.equal(calculateReserveTargetMg({ dosage: "200 mcg deux fois par jour, soit 400 mcg/jour", cycleDuration: "8 semaines" }, 22.4), 28);
  assert.equal(calculateReserveTargetMg({ dosage: "Semaines 1 à 4: 2 mg deux fois par semaine. Semaines 5 à 8: 1 mg deux fois par semaine.", cycleDuration: "8 semaines" }, 24), 30);
  assert.equal(calculateReserveTargetMg({ dosage: "200 mcg par administration, cinq fois par semaine", cycleDuration: "8 semaines" }, 8), 10);
});

test("bloque cinq fioles quand six sont nécessaires pour couvrir la réserve", () => {
  const issues = checkPeptide({
    ...base,
    name: "BPC-157",
    dosage: "200 mcg deux fois par jour, soit 400 mcg/jour",
    vialsNeeded: "Achat reel 5 vials de 5 mg pour 8 semaines actives.",
    priceEstimate: "~$13.44/vial × 5 vials = $67.20 total",
  });
  assert.ok(issues.some((issue) => issue.includes("sous-commande reserve detectee")), issues.join("\n"));
});

test("accepte six fioles couvrant la réserve calculée", () => {
  const issues = checkPeptide({
    ...base,
    name: "BPC-157",
    dosage: "200 mcg deux fois par jour, soit 400 mcg/jour",
    vialsNeeded: "Achat reel 6 vials de 5 mg. Besoin actif 22.4 mg; cible avec reserve 28 mg.",
    priceEstimate: "~$13.44/vial × 6 vials = $80.64 total",
  });
  assert.equal(issues.filter((issue) => issue.includes("reserve")).length, 0, issues.join("\n"));
});

test("reconstruit seize semaines et le total produits plus livraison", () => {
  const report: any = {
    weeklySchedule: "Semaines 1 à 8 récupération. Semaines 9 à 16 phase GH.",
    peptides: [
      { cycleDuration: "8 semaines actives, semaines 1 à 8" },
      { cycleDuration: "8 semaines actives, semaines 9 à 16" },
    ],
    _peptauraLiveSync: {
      shippingBreakdown: [{ subtotalUsd: 298.72, shippingUsd: 60 }],
    },
  };
  assert.equal(deriveReportCycleWeeks(report), 16);
  assert.deepEqual(extractLiveReportCosts(report), { productsUsd: 298.72, shippingUsd: 60, totalUsd: 358.72 });
});
