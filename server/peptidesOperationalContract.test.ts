import assert from "node:assert/strict";
import test from "node:test";
import { validatePeptidesReport } from "./peptidesReportValidator";

test("paid Peptides Engine validation rejects analytical-only expert-review reports", () => {
  const result = validatePeptidesReport({
    qualityVersion: "expert-review-v2",
    tier: "solo",
    clientName: "Test",
    peptides: [],
    sections: [],
    weeklySchedule: "",
    shoppingList: "",
    bloodMarkers: [],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.includes(
    "mode expert-review-v2 interdit pour un rapport paye: livrer le protocole operationnel complet",
  ));
});
