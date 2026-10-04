import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

test("recovery CTA drip is fail-closed unless explicitly enabled", () => {
  assert.match(
    source,
    /const RECOVERY_CTA_ENABLED = process\.env\.RECOVERY_CTA_DRIP_ENABLED === "1";/,
  );
  assert.doesNotMatch(
    source,
    /const RECOVERY_CTA_ENABLED = process\.env\.RECOVERY_CTA_DRIP_ENABLED !== "0";/,
  );
});
