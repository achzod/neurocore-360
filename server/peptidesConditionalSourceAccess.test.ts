import assert from "node:assert/strict";
import test from "node:test";
import { checkPeptide } from "./peptidesReportValidator";

const conditionalRetatrutide = {
  name: "Retatrutide",
  activationStatus: "conditional-inactive" as const,
  activationRequirements: ["Validation du bilan", "Decision explicite apres revue"],
  purpose: "Documenter l axe perte de poids sans activer un protocole personnel.",
  whyThisPeptide: "Cette piste est analysee car le dossier mentionne une utilisation anterieure et un objectif de perte de poids.",
  dosage: "Aucune dose personnelle activee.",
  timing: "Aucun calendrier personnel active.",
  route: "Phase conditionnelle inactive.",
  cycleDuration: "Aucune cure personnelle activee.",
  reconstitution: "",
  vialsNeeded: "",
  priceEstimate: "",
  purchaseUrl: "https://www.peptaura.com/product/204-retatrutide-10mg",
};

test("a conditional review keeps source access without becoming operational", () => {
  assert.deepEqual(checkPeptide(conditionalRetatrutide), []);
});

test("a paid conditional review is invalid without its promised source", () => {
  const issues = checkPeptide({ ...conditionalRetatrutide, purchaseUrl: "" });
  assert.ok(issues.includes("phase conditionnelle sans acces source fournisseur"), issues.join(" | "));
});

test("a conditional source must be a direct Peptaura product or catalog link", () => {
  const issues = checkPeptide({
    ...conditionalRetatrutide,
    purchaseUrl: "https://example.com/retatrutide",
  });
  assert.ok(issues.some((issue) => issue.includes("source fournisseur invalide")), issues.join(" | "));
});
