import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateDocumentedSingleUsePackagingOverstock,
  validateLivePackagingOverstock,
  type PeptidesPeptide,
  type PeptauraLiveListingSnapshot,
} from "./peptidesReportValidator";

type Fixture = {
  peptide: PeptidesPeptide;
  snapshot: PeptauraLiveListingSnapshot;
};

const fixtures: Fixture[] = [
  {
    peptide: {
      name: "Tirzepatide",
      dosage: "Semaines 1 à 4: 2,5 mg SC une fois par semaine. Semaines 5 à 14: 5 mg SC une fois par semaine. Semaines 15 et 16: 2,5 mg SC une fois par semaine. Semaines 17 et 18: 1,25 mg SC une fois par semaine, puis arrêt.",
      cycleDuration: "18 semaines, puis quatre semaines complètes sans tirzepatide ni cagrilintide.",
      reconstitution: "Vial de 5 mg + 0,50 mL de BAC water = 10 mg/mL. Pour 2,5 mg = 25 unités U-100, soit 0,25 mL. Utiliser immédiatement et jeter le reliquat faute de stabilité documentée pour ce vial exact.",
      vialsNeeded: "Achat réel: 30 vials de 5 mg, soit 150 mg reçus. Le cycle utilise 18 vials pour 18 administrations single-use. Le conditionnement impose 3 boîtes de 10.",
      _vialPlanning: {
        status: "documented",
        pharmacologicalNeedMg: 67.5,
        mathematicalMinimumVials: 14,
        operationalVials: 30,
        optionalSealedReserveVials: 23,
        stabilityDays: 1,
        stabilitySource: "Utilisation immédiate le jour de reconstitution, aucun report du reliquat.",
      },
    },
    snapshot: {
      peptide: "Tirzepatide",
      dosage: "5mg",
      requestedVials: 30,
      deliveredVials: 30,
      packageCount: 3,
      boxSize: 10,
      needMg: 84.375,
      deliveredMg: 150,
    },
  },
  {
    peptide: {
      name: "Tesamorelin",
      dosage: "Semaines 5 à 16: 2 mg SC chaque soir, sept jours sur sept, soit 84 administrations et 168 mg actifs.",
      cycleDuration: "12 semaines actives, de la semaine 5 à la semaine 16 incluse.",
      reconstitution: "Vial de 5 mg + 0,50 mL de BAC water = 10 mg/mL. Pour 2 mg = 20 unités U-100, soit 0,20 mL. Utiliser immédiatement et jeter le reliquat de 3 mg.",
      vialsNeeded: "Achat réel: 110 vials de 5 mg, soit 550 mg reçus. Le cycle utilise 84 vials pour 84 administrations single-use. Le conditionnement impose 11 boîtes de 10.",
      _vialPlanning: {
        status: "documented",
        pharmacologicalNeedMg: 168,
        mathematicalMinimumVials: 34,
        operationalVials: 110,
        optionalSealedReserveVials: 105,
        stabilityDays: 1,
        stabilitySource: "Single-use immédiat le jour de reconstitution pour ne pas transférer la stabilité d'une autre formulation.",
      },
    },
    snapshot: {
      peptide: "Tesamorelin",
      dosage: "5mg",
      requestedVials: 110,
      deliveredVials: 110,
      packageCount: 11,
      boxSize: 10,
      needMg: 210,
      deliveredMg: 550,
    },
  },
  {
    peptide: {
      name: "MOTS-c",
      dosage: "Semaines 7 à 18: 10 mg SC une fois par semaine, soit 12 administrations et 120 mg actifs.",
      cycleDuration: "12 semaines actives, de la semaine 7 à la semaine 18 incluse.",
      reconstitution: "Vial de 10 mg + 0,50 mL de BAC water = 20 mg/mL. Pour 10 mg = 50 unités U-100, soit 0,50 mL. Utiliser immédiatement et jeter tout reliquat.",
      vialsNeeded: "Achat réel: 20 vials de 10 mg, soit 200 mg reçus. Le cycle utilise 12 vials pour 12 administrations single-use. Le conditionnement impose 2 boîtes de 10.",
      _vialPlanning: {
        status: "documented",
        pharmacologicalNeedMg: 120,
        mathematicalMinimumVials: 12,
        operationalVials: 20,
        optionalSealedReserveVials: 15,
        stabilityDays: 1,
        stabilitySource: "Vial entier utilisé immédiatement le jour de chaque administration.",
      },
    },
    snapshot: {
      peptide: "MOTS-c",
      dosage: "10mg",
      requestedVials: 20,
      deliveredVials: 20,
      packageCount: 2,
      boxSize: 10,
      needMg: 150,
      deliveredMg: 200,
    },
  },
  {
    peptide: {
      name: "Cagrilintide",
      dosage: "Semaines 23 à 48: 0,3 mg SC une fois par semaine, soit 26 administrations et 7,8 mg actifs.",
      cycleDuration: "26 semaines actives, après un washout de quatre semaines suivant Tirzepatide.",
      reconstitution: "Vial de 10 mg + 2,00 mL de BAC water = 5 mg/mL. Pour 0,3 mg = 6 unités U-100, soit 0,06 mL. Utiliser immédiatement et jeter le reliquat faute de stabilité documentée pour ce vial exact.",
      vialsNeeded: "Achat réel: 40 vials de 10 mg, soit 400 mg reçus. Le cycle utilise 26 vials pour 26 administrations single-use. Le conditionnement impose 4 boîtes de 10.",
      _vialPlanning: {
        status: "documented",
        pharmacologicalNeedMg: 7.8,
        mathematicalMinimumVials: 1,
        operationalVials: 40,
        optionalSealedReserveVials: 33,
        stabilityDays: 1,
        stabilitySource: "Single-use immédiat le jour de reconstitution, aucune stabilité post-reconstitution du produit exact publiée.",
      },
    },
    snapshot: {
      peptide: "Cagrilintide",
      dosage: "10mg",
      requestedVials: 40,
      deliveredVials: 40,
      packageCount: 4,
      boxSize: 10,
      needMg: 9.75,
      deliveredMg: 400,
    },
  },
];

function cloneFixture(source: Fixture = fixtures[0]): Fixture {
  return structuredClone(source);
}

test("le gate live accepte les plans single-use documentés des quatre molécules actives", async (t) => {
  for (const fixture of fixtures) {
    await t.test(String(fixture.peptide.name), () => {
      const decision = evaluateDocumentedSingleUsePackagingOverstock(
        fixture.peptide,
        fixture.snapshot,
      );
      assert.deepEqual(decision, {
        allowed: true,
        reason: "DOCUMENTED_SINGLE_USE_PLAN",
        reserveTargetMg: fixture.snapshot.needMg,
      });
      assert.equal(
        validateLivePackagingOverstock(fixture.peptide, fixture.snapshot),
        null,
      );
    });
  }
});

test("un gros conditionnement sans plan documenté reste bloqué", () => {
  const fixture = cloneFixture(fixtures[3]);
  delete fixture.peptide._vialPlanning;

  assert.deepEqual(
    evaluateDocumentedSingleUsePackagingOverstock(fixture.peptide, fixture.snapshot),
    { allowed: false, reason: "PLAN_NOT_DOCUMENTED" },
  );
  assert.match(
    validateLivePackagingOverstock(fixture.peptide, fixture.snapshot) || "",
    /boite live impose trop de surstock: ratio x41\.03 > x1\.30/,
  );
});

test("le ratio live est recalculé et ne peut pas être masqué par needMg", async (t) => {
  const cases: Array<{
    name: string;
    value: number | undefined;
    expected: RegExp;
  }> = [
    {
      name: "needMg absent",
      value: undefined,
      expected: /boite live impose trop de surstock: ratio x41\.03 > x1\.30/,
    },
    {
      name: "needMg NaN",
      value: Number.NaN,
      expected: /cible reserve live incoherente/,
    },
    {
      name: "needMg nul",
      value: 0,
      expected: /cible reserve live incoherente/,
    },
    {
      name: "needMg gonflé jusqu'à la capacité livrée",
      value: 400,
      expected: /cible reserve live incoherente/,
    },
  ];

  for (const entry of cases) {
    await t.test(entry.name, () => {
      const fixture = cloneFixture(fixtures[3]);
      delete fixture.peptide._vialPlanning;
      fixture.snapshot.needMg = entry.value;
      assert.match(
        validateLivePackagingOverstock(fixture.peptide, fixture.snapshot) || "",
        entry.expected,
      );
    });
  }
});

test("une formulation négative ne constitue jamais une preuve single-use", () => {
  const fixture = cloneFixture();
  fixture.peptide._vialPlanning!.stabilitySource =
    "Pas d'utilisation immédiate; conservation multi-dose documentée.";
  fixture.peptide.reconstitution =
    "Vial de 5 mg + 0,50 mL de BAC water. Ne pas utiliser immédiatement et ne pas jeter le reliquat.";

  assert.deepEqual(
    evaluateDocumentedSingleUsePackagingOverstock(fixture.peptide, fixture.snapshot),
    { allowed: false, reason: "SINGLE_USE_EVIDENCE_MISSING" },
  );
  assert.match(
    validateLivePackagingOverstock(fixture.peptide, fixture.snapshot) || "",
    /boite live impose trop de surstock/,
  );
});

test("les négations et la réutilisation restent bloquées même si des mots-clés positifs sont aussi présents", async (t) => {
  const cases = [
    "Utiliser immédiatement. Ne pas jeter la solution reconstituée. Jeter le reliquat.",
    "Utiliser immédiatement puis réutiliser le vial restant le lendemain. Jeter le reliquat final.",
    "Produit non unidose. Utiliser immédiatement la première dose et jeter le reliquat final.",
    "Conservation multi-dose autorisée. Utiliser immédiatement la première dose et jeter le reliquat final.",
    "Utilisation immédiate interdite; jeter le reliquat.",
    "Utilisation immédiate non recommandée; jeter le reliquat.",
    "Utilisation immédiate déconseillée; jeter le reliquat.",
    "Il est faux de dire utilisation immédiate; jeter le reliquat.",
    "Utilisation immédiate impossible; jeter le reliquat.",
    "Utilisation immédiate à proscrire; jeter le reliquat.",
    "Utilisation immédiate à éviter; jeter le reliquat.",
    "Utiliser immédiatement et jeter le reliquat. Le vial reconstitué est réutilisable le lendemain.",
    "Utiliser immédiatement et jeter le reliquat, sauf si le produit est conservé pour une dose ultérieure.",
  ];

  for (const reconstitution of cases) {
    await t.test(reconstitution, () => {
      const fixture = cloneFixture();
      fixture.peptide.reconstitution = reconstitution;
      assert.equal(
        evaluateDocumentedSingleUsePackagingOverstock(fixture.peptide, fixture.snapshot).reason,
        "SINGLE_USE_EVIDENCE_MISSING",
      );
      assert.match(
        validateLivePackagingOverstock(fixture.peptide, fixture.snapshot) || "",
        /boite live impose trop de surstock/,
      );
    });
  }
});

test("seules les tailles de boîtes 1, 5 et 10 du feed scellé sont acceptées", async (t) => {
  for (const boxSize of [2, 3, 4, 6, 7, 8, 9]) {
    await t.test(`boîte de ${boxSize}`, () => {
      const fixture = cloneFixture();
      const packageCount = Math.ceil(23 / boxSize);
      const deliveredVials = packageCount * boxSize;
      fixture.peptide.vialsNeeded = `Achat réel: ${deliveredVials} vials de 5 mg. Le cycle utilise 18 vials pour 18 administrations single-use. Le conditionnement impose ${packageCount} boîtes de ${boxSize}.`;
      fixture.peptide._vialPlanning!.operationalVials = deliveredVials;
      fixture.snapshot.requestedVials = deliveredVials;
      fixture.snapshot.deliveredVials = deliveredVials;
      fixture.snapshot.packageCount = packageCount;
      fixture.snapshot.boxSize = boxSize;
      fixture.snapshot.deliveredMg = deliveredVials * 5;

      assert.deepEqual(
        evaluateDocumentedSingleUsePackagingOverstock(fixture.peptide, fixture.snapshot),
        { allowed: false, reason: "UNSUPPORTED_BOX_SIZE" },
      );
      assert.match(
        validateLivePackagingOverstock(fixture.peptide, fixture.snapshot) || "",
        /boite live impose trop de surstock/,
      );
    });
  }
});

test("le gate fail-closed refuse les plans single-use incomplets ou incohérents", async (t) => {
  const cases: Array<{
    name: string;
    mutate: (fixture: Fixture) => void;
    reason: string;
  }> = [
    {
      name: "statut non documenté",
      mutate: ({ peptide }) => { peptide._vialPlanning!.status = "stability-unverified"; },
      reason: "PLAN_NOT_DOCUMENTED",
    },
    {
      name: "operationalVials différent du commandé et livré",
      mutate: ({ peptide }) => { peptide._vialPlanning!.operationalVials = 29; },
      reason: "OPERATIONAL_VIALS_MISMATCH",
    },
    {
      name: "conditionnement live incohérent",
      mutate: ({ snapshot }) => { snapshot.packageCount = 2; },
      reason: "PACKAGE_COUNT_MISMATCH",
    },
    {
      name: "taille de boîte absente du feed scellé",
      mutate: ({ peptide, snapshot }) => {
        peptide.vialsNeeded = "Achat réel: 10000 vials de 5 mg. Le cycle utilise 18 vials pour 18 administrations single-use. Le conditionnement impose 1 boîte de 10000.";
        peptide._vialPlanning!.operationalVials = 10000;
        snapshot.requestedVials = 10000;
        snapshot.deliveredVials = 10000;
        snapshot.packageCount = 1;
        snapshot.boxSize = 10000;
        snapshot.deliveredMg = 50000;
      },
      reason: "UNSUPPORTED_BOX_SIZE",
    },
    {
      name: "conditionnement déclaré différent du snapshot",
      mutate: ({ peptide }) => {
        peptide.vialsNeeded = "Achat réel: 30 vials de 5 mg. Le cycle utilise 18 vials pour 18 administrations single-use. Le conditionnement impose 3 boîtes de 9.";
      },
      reason: "DECLARED_PACKAGE_MISMATCH",
    },
    {
      name: "stabilityDays différent du single-use immédiat",
      mutate: ({ peptide }) => { peptide._vialPlanning!.stabilityDays = 7; },
      reason: "INVALID_STABILITY_WINDOW",
    },
    {
      name: "source sans preuve single-use immédiate",
      mutate: ({ peptide }) => { peptide._vialPlanning!.stabilitySource = "Grand conditionnement fournisseur disponible."; },
      reason: "SINGLE_USE_EVIDENCE_MISSING",
    },
    {
      name: "reconstitution sans usage immédiat ni rejet du reliquat",
      mutate: ({ peptide }) => { peptide.reconstitution = "Vial de 5 mg + 0,50 mL de BAC water = 10 mg/mL."; },
      reason: "SINGLE_USE_EVIDENCE_MISSING",
    },
    {
      name: "minimum mathématique incohérent",
      mutate: ({ peptide }) => { peptide._vialPlanning!.mathematicalMinimumVials = 13; },
      reason: "MATHEMATICAL_MINIMUM_MISMATCH",
    },
    {
      name: "nombre d'administrations déclaré incohérent",
      mutate: ({ peptide }) => {
        peptide.dosage = "Semaines 1 à 18: 3,75 mg SC une fois par semaine, soit 999 administrations et 67,5 mg actifs.";
      },
      reason: "DECLARED_ADMINISTRATION_MISMATCH",
    },
    {
      name: "réserve single-use insuffisante",
      mutate: ({ peptide }) => { peptide._vialPlanning!.optionalSealedReserveVials = 22; },
      reason: "SINGLE_USE_RESERVE_MISMATCH",
    },
    {
      name: "réserve single-use gonflée",
      mutate: ({ peptide }) => { peptide._vialPlanning!.optionalSealedReserveVials = 24; },
      reason: "SINGLE_USE_RESERVE_MISMATCH",
    },
    {
      name: "boîtes supplémentaires au-delà du minimum couvrant la réserve",
      mutate: ({ peptide, snapshot }) => {
        peptide.vialsNeeded = "Achat réel: 50 vials de 5 mg. Le cycle utilise 18 vials pour 18 administrations single-use. Le conditionnement impose 5 boîtes de 10.";
        peptide._vialPlanning!.operationalVials = 50;
        snapshot.requestedVials = 50;
        snapshot.deliveredVials = 50;
        snapshot.packageCount = 5;
        snapshot.deliveredMg = 250;
      },
      reason: "NON_MINIMAL_PACKAGE_COUNT",
    },
    {
      name: "besoin pharmacologique inventé",
      mutate: ({ peptide }) => { peptide._vialPlanning!.pharmacologicalNeedMg = 10; },
      reason: "PHARMACOLOGICAL_NEED_MISMATCH",
    },
    {
      name: "capacité achetée sous la réserve calculée",
      mutate: ({ snapshot }) => {
        snapshot.needMg = 50;
        snapshot.deliveredMg = 80;
      },
      reason: "RESERVE_TARGET_NOT_COVERED",
    },
    {
      name: "capacité live incompatible avec le format des vials",
      mutate: ({ snapshot }) => { snapshot.deliveredMg = 151; },
      reason: "DELIVERED_CAPACITY_MISMATCH",
    },
  ];

  for (const entry of cases) {
    await t.test(entry.name, () => {
      const fixture = cloneFixture();
      entry.mutate(fixture);
      const decision = evaluateDocumentedSingleUsePackagingOverstock(
        fixture.peptide,
        fixture.snapshot,
      );
      assert.equal(decision.allowed, false);
      assert.equal(decision.reason, entry.reason);
      assert.ok(
        validateLivePackagingOverstock(fixture.peptide, fixture.snapshot),
        "toute incohérence doit produire une erreur de contrôle live",
      );
    });
  }
});
