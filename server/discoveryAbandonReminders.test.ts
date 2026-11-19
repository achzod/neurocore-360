import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isDiscoveryAbandonRemindersEnabled } from "./discoveryAbandonRemindersPolicy";

test("relances Discovery coupées si le flag est absent ou différent de 1/true", () => {
  assert.equal(isDiscoveryAbandonRemindersEnabled({} as NodeJS.ProcessEnv), false);
  assert.equal(isDiscoveryAbandonRemindersEnabled({ DISCOVERY_ABANDON_REMINDERS_ENABLED: "" } as NodeJS.ProcessEnv), false);
  assert.equal(isDiscoveryAbandonRemindersEnabled({ DISCOVERY_ABANDON_REMINDERS_ENABLED: "0" } as NodeJS.ProcessEnv), false);
  assert.equal(isDiscoveryAbandonRemindersEnabled({ DISCOVERY_ABANDON_REMINDERS_ENABLED: "1" } as NodeJS.ProcessEnv), true);
  assert.equal(isDiscoveryAbandonRemindersEnabled({ DISCOVERY_ABANDON_REMINDERS_ENABLED: "true" } as NodeJS.ProcessEnv), true);
});

test("l'envoi réel et le cron 6 h passent par le flag", () => {
  const reminders = readFileSync(new URL("./abandonmentReminders.ts", import.meta.url), "utf8");
  assert.match(reminders, /if \(!dryRun && !isDiscoveryAbandonRemindersEnabled\(\)\)/);
  const index = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  assert.match(index, /if \(isDiscoveryAbandonRemindersEnabled\(\)\) \{\s*setInterval\(runAbandonRecovery/);
});

test("plus de BCC admin systématique : opt-in explicite uniquement", () => {
  const emailService = readFileSync(new URL("./emailService.ts", import.meta.url), "utf8");
  assert.match(emailService, /const shouldBccAdmin = trackingData\.bccAdmin === true && /);
  assert.doesNotMatch(emailService, /trackingData\.bccAdmin !== false/);
});
