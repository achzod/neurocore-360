import assert from "node:assert/strict";
import test from "node:test";
import {
  isAIUsagePersistenceDisabled,
  recordAIUsageEvent,
} from "./openaiResponses";

test("AI usage stdout-only mode defaults off and requires explicit true", () => {
  assert.equal(isAIUsagePersistenceDisabled({}), false);
  assert.equal(isAIUsagePersistenceDisabled({ AI_USAGE_PERSISTENCE_DISABLED: "false" }), false);
  assert.equal(isAIUsagePersistenceDisabled({ AI_USAGE_PERSISTENCE_DISABLED: "TRUE" }), true);
});

test("stdout-only telemetry returns usage without importing or writing the DB", async () => {
  const previous = process.env.AI_USAGE_PERSISTENCE_DISABLED;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const lines: string[] = [];
  const errors: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  process.env.AI_USAGE_PERSISTENCE_DISABLED = "true";
  delete process.env.DATABASE_URL;
  console.log = (...args: unknown[]) => { lines.push(args.map(String).join(" ")); };
  console.error = (...args: unknown[]) => { errors.push(args.map(String).join(" ")); };
  try {
    const telemetry = await recordAIUsageEvent({
      response: {
        id: "resp_isolated_test",
        model: "gpt-5.6-sol",
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
          input_tokens_details: { cached_tokens: 25 },
          output_tokens_details: { reasoning_tokens: 10 },
        },
      },
      profile: "discovery",
      label: "discovery-unified-report",
      status: "completed",
    });
    assert.equal(telemetry?.tokens.totalTokens, 150);
    assert.equal(errors.length, 0);
    assert.equal(lines.filter((line) => line.startsWith("AI_USAGE_STDOUT_ONLY:")).length, 1);
    assert.equal(lines.some((line) => line.includes("Persistence failed")), false);
  } finally {
    console.log = originalLog;
    console.error = originalError;
    if (previous === undefined) delete process.env.AI_USAGE_PERSISTENCE_DISABLED;
    else process.env.AI_USAGE_PERSISTENCE_DISABLED = previous;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
});
