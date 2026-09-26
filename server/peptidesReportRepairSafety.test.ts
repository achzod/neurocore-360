import assert from "node:assert/strict";
import test from "node:test";
import { hasPeptidesHardRedFlag, repairPeptidesReportContent } from "./peptidesReportRepair";

test("contradictory none plus another condition forces medical review", () => {
  assert.equal(hasPeptidesHardRedFlag({ pep_conditions: ["other", "none"] }), true);
});

test("undocumented other condition forces medical review", () => {
  assert.equal(hasPeptidesHardRedFlag({ pep_conditions: ["other"], pep_conditions_other: "" }), true);
});

test("documented other condition alone does not fabricate a hard red flag", () => {
  assert.equal(hasPeptidesHardRedFlag({ pep_conditions: ["other"], pep_conditions_other: "asthme stable" }), false);
});

test("plain none remains standard when no other hard red flag exists", () => {
  assert.equal(hasPeptidesHardRedFlag({ pep_conditions: ["none"] }), false);
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
  assert.match(text, /SENTINEL_BASTIEN_0/);
  assert.doesNotMatch(text, /penicilline|MK-677|SARMs/i);
});
