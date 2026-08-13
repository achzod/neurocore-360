import assert from "node:assert/strict";
import test from "node:test";
import { estimateNeedMg } from "./peptidesReportValidator";

test("French une fois par semaine is multiplied across the full cycle", () => {
  assert.equal(estimateNeedMg({
    dosage: "5 mg une fois par semaine",
    cycleDuration: "8 semaines",
  }), 40);
});
