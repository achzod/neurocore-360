import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storage = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");

test("legacy generic payment confirmation prevents a second Peptides confirmation", () => {
  assert.match(storage, /t\.emailType === "sendCTAEmail"[\s\S]{0,180}commande re\[cç\]ue/);
  assert.match(storage, /email_type = 'sendCTAEmail'[\s\S]{0,240}'peptides engine : commande recue'/);
  assert.match(storage, /'peptides engine : commande reçue'/);
});
