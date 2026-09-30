import assert from "node:assert/strict";
import { test } from "node:test";

test("last questionnaire section stays recoverable until audit creation clears progress", async () => {
  process.env.DATABASE_URL ||= "postgres://localhost:5432/questionnaire_progress_test";
  const { MemStorage } = await import("./storage");
  const storage = new MemStorage();
  const email = "questionnaire-progress-test@example.com";

  const progress = await storage.saveProgress({
    email,
    currentSection: 4,
    totalSections: 5,
    responses: { email },
  });

  assert.equal(progress.percentComplete, 100);
  assert.equal(progress.status, "IN_PROGRESS");
  assert.equal((await storage.getAllIncompleteProgress()).length, 1);

  await storage.deleteProgress(email);
  assert.equal((await storage.getAllIncompleteProgress()).length, 0);
});
