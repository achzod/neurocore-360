import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { hasPeptidesHardRedFlag, repairPeptidesReportContent } from "./peptidesReportRepair";

test("contradictory none plus undocumented other never fabricates a medical red flag", () => {
  assert.equal(hasPeptidesHardRedFlag({ pep_conditions: ["other", "none"] }), false);
});

test("undocumented other condition remains a clarification instead of a global block", () => {
  assert.equal(hasPeptidesHardRedFlag({ pep_conditions: ["other"], pep_conditions_other: "" }), false);
});

test("documented other condition alone does not fabricate a hard red flag", () => {
  assert.equal(hasPeptidesHardRedFlag({ pep_conditions: ["other"], pep_conditions_other: "asthme stable" }), false);
});

test("plain none remains standard when no other hard red flag exists", () => {
  assert.equal(hasPeptidesHardRedFlag({ pep_conditions: ["none"] }), false);
});

test("standard repair deduplicates order wording and restores missing rationale cards", () => {
  const source = readFileSync(new URL("./peptidesReportRepair.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Format commande: voir la liste de commande verifiee/);
  assert.match(source, /COUVERTURE DES AXES RETENUS/);
  assert.match(source, /Format retenu pour/);
  assert.match(source, /peptide\.whyThisPeptide \|\| peptide\.purpose/);
});

test("repair deterministically completes U-100 arithmetic for injectable microgram doses", () => {
  const repaired = repairPeptidesReportContent({
    qualityVersion: "expert-standard-v1",
    clientName: "Alex",
    tier: "solo",
    peptides: [{
      name: "AOD-9604",
      purpose: "Composition corporelle",
      whyThisPeptide: "Axe retenu",
      dosage: "300 mcg par injection",
      timing: "le matin",
      route: "sous-cutanée",
      cycleDuration: "12 semaines",
      reconstitution: "Vial de 5 mg + 2 ml de BAC water.",
      vialsNeeded: "1 vial de 5 mg",
      priceEstimate: "33.20 USD",
      purchaseUrl: "https://www.peptaura.com/product/example",
    }],
    sections: Array.from({ length: 15 }, (_, index) => ({
      id: `section-${index}`,
      title: `Section ${index}`,
      content: (`Contenu opérationnel personnalisé ${index}. `).repeat(60),
    })),
    weeklySchedule: "300 mcg le matin.",
    shoppingList: "1 vial de 5 mg.",
    bloodMarkers: [],
    promoCodesGenerated: [],
  } as any, { pep_name: "Alex" }, "solo");
  assert.match(repaired.peptides[0].reconstitution, /Pour 0\.3mg = 12\.0 unites U-100 \(soit 0\.12 ml\)/);
});

test("medical recovery preserves a complete source report instead of injecting another client profile", () => {
  const sections = Array.from({ length: 15 }, (_, index) => ({
    id: `section-${index}`,
    title: `Section ${index}`,
    content: `SENTINEL_BASTIEN_${index}. ${(`Le dossier source exact de Bastien reste la seule base factuelle pour cette section ${index}. `).repeat(28)}`,
  }));
  const repaired = repairPeptidesReportContent({
    qualityVersion: "medical-review-v1",
    clientName: "bastien",
    tier: "solo",
    peptides: [],
    sections,
    weeklySchedule: "Aucune injection active.",
    shoppingList: "Aucun achat actif.",
    bloodMarkers: [],
    promoCodesGenerated: [],
  } as any, {
    pep_name: "bastien",
    pep_conditions: ["other", "none"],
  }, "solo");
  const text = repaired.sections.map((section) => section.content).join("\n");
  assert.equal(repaired.qualityVersion, "expert-standard-v1");
  assert.match(text, /SENTINEL_BASTIEN_0/);
  assert.doesNotMatch(text, /penicilline|MK-677|SARMs/i);
});
