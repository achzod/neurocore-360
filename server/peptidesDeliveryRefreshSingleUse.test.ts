import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ||= "postgres://unused:unused@127.0.0.1:1/unused";

const { validateVialsMath } = await import("./peptidesEngine");

function documentedPeptide() {
  return {
    name: "Tesamorelin",
    dosage: "Semaines 1 à 12: 2 mg SC chaque jour, soit 84 administrations et 168 mg actifs.",
    cycleDuration: "12 semaines",
    vialsNeeded: "Achat reel 110 vials de 5 mg. Besoin actif 168 mg; cible avec reserve 210 mg. Le cycle utilise 84 vials pour 84 administrations single-use. Conditionnement fournisseur impose: 11 boites de 10 vials.",
    priceEstimate: "$125.00/boite × 11 boites de 10 vials = $1375.00 total",
    reconstitution: "Vial de 5 mg. Utiliser immédiatement et jeter le reliquat.",
    activationStatus: "active",
    _vialPlanning: {
      status: "documented",
      cadence: { cycleDays: 84, administrationsPerWeek: 7 },
      vialSizeMg: 5,
      stabilityDays: 1,
      stabilitySource: "Usage immédiat documenté; jeter le reliquat.",
      operationalVials: 110,
      pharmacologicalNeedMg: 168,
      mathematicalMinimumVials: 34,
      optionalSealedReserveVials: 105,
    },
  };
}

test("delivery refresh preserves an already validated documented single-use plan", () => {
  const peptide = documentedPeptide();
  const report = { peptides: [structuredClone(peptide)], sections: [] } as any;
  const result = validateVialsMath(report, { preserveValidatedDocumentedSingleUsePlans: true });
  assert.deepEqual(result.peptides[0], peptide);
});

test("normal generation still recomputes documented plans unless preservation is explicit", () => {
  const peptide = documentedPeptide();
  const report = { peptides: [structuredClone(peptide)], sections: [] } as any;
  const result = validateVialsMath(report);
  assert.notEqual(result.peptides[0].vialsNeeded, peptide.vialsNeeded);
});

test("preservation never applies to an unverified stability plan", () => {
  const peptide = documentedPeptide();
  peptide._vialPlanning.status = "stability-unverified";
  peptide._vialPlanning.stabilityDays = null as any;
  const report = { peptides: [structuredClone(peptide)], sections: [] } as any;
  const result = validateVialsMath(report, { preserveValidatedDocumentedSingleUsePlans: true });
  assert.notEqual(result.peptides[0].vialsNeeded, peptide.vialsNeeded);
});
