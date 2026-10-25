import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";
const { classifySendPulseDeliveryRecord } = await import("./emailService");

test("SMTP 250 is the only successful Peptides delivery evidence", () => {
  assert.deepEqual(classifySendPulseDeliveryRecord({ id: "task-1", smtp_answer_code: 250 } as any), {
    state: "DELIVERED",
    taskId: "task-1",
    smtpCode: 250,
    detail: null,
  });
  assert.equal(classifySendPulseDeliveryRecord({ id: "task-2", smtp_answer_code: null } as any).state, "PENDING");
  assert.equal(classifySendPulseDeliveryRecord({ id: "task-3", smtp_answer_code: 421 } as any).state, "FAILED");
  assert.equal(classifySendPulseDeliveryRecord({ id: "task-4", smtp_answer_code: 550 } as any).state, "FAILED");
});

test("missing provider record remains pending and preserves the fallback task id", () => {
  assert.deepEqual(classifySendPulseDeliveryRecord(null, "task-pending"), {
    state: "PENDING",
    taskId: "task-pending",
    smtpCode: null,
    detail: "record_not_found",
  });
});
