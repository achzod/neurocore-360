import assert from "node:assert/strict";
import test from "node:test";
import { pruneUnintegratedBonusPeptides } from "./peptidesReportRepair";

function reportWithBonus(overrides: Record<string, unknown>) {
  return {
    clientName: "Laurent",
    weeklySchedule: "",
    shoppingList: "",
    sections: [],
    peptides: [{
      name: "CJC-1295 sans DAC",
      activationStatus: "active",
      purpose: "Bonus récupération",
      whyThisPeptide: "Bonus documenté",
    }],
    ...overrides,
  } as any;
}

test("an unintegrated bonus peptide is still pruned", () => {
  assert.equal(pruneUnintegratedBonusPeptides(reportWithBonus({})).peptides.length, 0);
});

test("one incidental shopping mention does not defeat bonus pruning", () => {
  const report = reportWithBonus({ shoppingList: "Comparer CJC-1295 sans DAC." });
  assert.equal(pruneUnintegratedBonusPeptides(report).peptides.length, 0);
});

test("a bonus peptide integrated in two independent operational surfaces is preserved", () => {
  const report = reportWithBonus({
    shoppingList: "CJC-1295 sans DAC, 10 vials.",
    sections: [{
      id: "reconstitution-guide",
      title: "Guide de reconstitution",
      content: "CJC-1295 sans DAC, calcul U-100 complet.",
    }],
  });
  assert.deepEqual(
    pruneUnintegratedBonusPeptides(report).peptides.map((peptide: any) => peptide.name),
    ["CJC-1295 sans DAC"],
  );
});

test("existing weekly schedule integration remains sufficient", () => {
  const report = reportWithBonus({ weeklySchedule: "Chaque soir: CJC-1295 sans DAC." });
  assert.equal(pruneUnintegratedBonusPeptides(report).peptides.length, 1);
});
