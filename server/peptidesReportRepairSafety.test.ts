import assert from "node:assert/strict";
import test from "node:test";
import { hasPeptidesHardRedFlag } from "./peptidesReportRepair";

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
