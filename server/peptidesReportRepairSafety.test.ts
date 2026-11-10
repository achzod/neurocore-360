import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { hasPeptidesHardRedFlag, repairPeptidesReportContent } from "./peptidesReportRepair";
import { selectHighestOperationalDoseMg } from "./peptidesDoseParsing";

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
      reconstitution: "Vial de 5 mg avec 2 ml de BAC water.",
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

test("dose parsing excludes derived daily and weekly totals", () => {
  assert.equal(selectHighestOperationalDoseMg("100 mcg par administration, soit 500 mcg par semaine"), 0.1);
  assert.equal(selectHighestOperationalDoseMg("200 mcg deux fois par jour, soit 400 mcg/jour"), 0.2);
  assert.equal(selectHighestOperationalDoseMg("100 mcg par injection, 500 mcg par semaine"), 0.1);
  assert.equal(selectHighestOperationalDoseMg("200 mcg par prise, 400 mcg par jour"), 0.2);
  assert.equal(selectHighestOperationalDoseMg("100 mcg le matin, total hebdomadaire 700 mcg"), 0.1);
  assert.equal(selectHighestOperationalDoseMg("2 mg par semaine"), 2);
  assert.equal(selectHighestOperationalDoseMg("2 mg par semaine"), 2);
  assert.equal(selectHighestOperationalDoseMg("0,25 mg par semaine pendant 4 semaines, puis 0,5 mg par semaine"), 0.5);
  assert.equal(selectHighestOperationalDoseMg("S1 0,25 mg par semaine, S2 0,5 mg par semaine"), 0.5);
});

test("repair never mistakes total cycle quantity for the per-injection dose", () => {
  const repaired = repairPeptidesReportContent({
    qualityVersion: "expert-standard-v1",
    clientName: "Alex",
    tier: "solo",
    peptides: [{
      name: "AOD-9604",
      purpose: "Composition corporelle",
      whyThisPeptide: "Axe retenu",
      dosage: "300 mcg par injection, 7/7 pendant 12 semaines, total du cycle 25,2 mg",
      timing: "le matin",
      route: "sous-cutanée",
      cycleDuration: "12 semaines",
      reconstitution: "Vial de 5 mg avec 2 ml de BAC water.",
      vialsNeeded: "7 vials de 5 mg",
      priceEstimate: "232.40 USD",
      purchaseUrl: "https://www.peptaura.com/product/example",
    }],
    sections: Array.from({ length: 15 }, (_, index) => ({
      id: `section-${index}`,
      title: `Section ${index}`,
      content: (`Contenu opérationnel personnalisé ${index}. `).repeat(60),
    })),
    weeklySchedule: "300 mcg le matin.",
    shoppingList: "7 vials de 5 mg.",
    bloodMarkers: [],
    promoCodesGenerated: [],
  } as any, { pep_name: "Alex" }, "solo");
  assert.match(repaired.peptides[0].reconstitution, /Pour 0\.3mg = 12\.0 unites U-100 \(soit 0\.12 ml\)/);
  assert.doesNotMatch(repaired.peptides[0].reconstitution, /25\.2mg|1008\.0 unites/);
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
