import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isKnowledgeAdminKeyValid } from "../server/knowledge/adminAuth";
import { validateOfflineDatasets } from "./restore-discovery-knowledge";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validation = validateOfflineDatasets(repoRoot);

assert.equal(validation.rawCount, 890);
assert.equal(validation.uniqueCount, 878);
assert.equal(validation.rejectedDuplicateCount, 12);
assert.deepEqual(Object.keys(validation.domainCoverage).sort(), [
  "digestion", "energie", "lifestyle", "mindset", "nutrition", "sommeil", "stress", "training",
]);
assert.ok(Object.values(validation.domainCoverage).every((count) => count > 0));

assert.equal(isKnowledgeAdminKeyValid("secret", "secret"), true);
assert.equal(isKnowledgeAdminKeyValid("wrong", "secret"), false);
assert.equal(isKnowledgeAdminKeyValid("", "secret"), false);
assert.equal(isKnowledgeAdminKeyValid(undefined, "secret"), false);
assert.equal(isKnowledgeAdminKeyValid("secret", undefined), false);

console.log("knowledge_restore_tests: PASS");
