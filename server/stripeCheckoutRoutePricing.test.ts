import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("APEX inline products do not depend on stale cross-account Price IDs", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  assert.match(routes, /const usesInlinePrice = planType === "PEPTIDES_ENGINE" \|\| usesInlineCheckoutLineItem\(planType\)/);
  assert.match(routes, /if \(!usesInlinePrice && !priceId\)/);
  assert.match(routes, /: \[createProductCheckoutLineItem\(planType\)\]/);
});
