import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";
process.env.SENDPULSE_API_KEY ||= "test-sendpulse-token";
const {
  classifySendPulseDeliveryRecord,
  reconcileSendPulseDeliveryEvidence,
} = await import("./emailService");

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

const recipientEmail = "client@example.com";
const subject = "Votre protocole peptides est prêt";
const startedAt = new Date("2026-10-25T20:00:00.000Z");

function responseJson(data: unknown, ok = true): Response {
  return { ok, json: async () => data } as Response;
}

async function reconcileWithFetch(fetchImpl: typeof fetch) {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    return await reconcileSendPulseDeliveryEvidence({
      recipientEmail,
      subject,
      startedAt,
      attemptDelaysMs: [0],
      requestTimeoutMs: 50,
    });
  } finally {
    globalThis.fetch = previousFetch;
  }
}

test("a list match without SMTP code is enriched before a 250 delivery verdict", async () => {
  const calls: Array<{ url: string; body?: string }> = [];
  const evidence = await reconcileWithFetch(async (input, init) => {
    const url = String(input);
    calls.push({ url, body: init?.body as string | undefined });
    if (url.endsWith("/smtp/emails/info")) {
      return responseJson([{
        providerMessageId: "provider-250",
        recipient: recipientEmail,
        subject,
        send_date: "2026-10-25 20:00:00",
        smtp_answer_code: 250,
      }]);
    }
    return responseJson([{
      providerMessageId: "provider-250",
      recipient: recipientEmail,
      subject,
      send_date: "2026-10-25 20:00:00",
    }]);
  });

  assert.deepEqual(evidence, {
    state: "DELIVERED",
    taskId: "provider-250",
    smtpCode: 250,
    detail: null,
  });
  assert.equal(calls.filter(({ url }) => url.endsWith("/smtp/emails/info")).length, 1);
  assert.deepEqual(JSON.parse(calls.find(({ url }) => url.endsWith("/smtp/emails/info"))!.body!), {
    emails: ["provider-250"],
  });
});

test("enriched SMTP 421 and 550 records fail without becoming accepted", async () => {
  for (const code of [421, 550]) {
    const evidence = await reconcileWithFetch(async (input) => {
      const url = String(input);
      if (url.endsWith("/smtp/emails/info")) {
        return responseJson([{
          id: `provider-${code}`,
          recipient: recipientEmail,
          subject,
          send_date: "2026-10-25 20:00:00",
          smtp_answer_code: code,
          smtp_answer_data: code === 421 ? "Temporary failure" : "Mailbox unavailable",
        }]);
      }
      return responseJson([{
        id: `provider-${code}`,
        recipient: recipientEmail,
        subject,
        send_date: "2026-10-25 20:00:00",
      }]);
    });

    assert.equal(evidence.state, "FAILED");
    assert.equal(evidence.taskId, `provider-${code}`);
    assert.equal(evidence.smtpCode, code);
  }
});

test("an incomplete list row can be completed by details and keeps providerMessageId", async () => {
  const evidence = await reconcileWithFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/smtp/emails/info")) {
      return responseJson([{
        providerMessageId: "provider-incomplete",
        recipient: recipientEmail,
        subject,
        send_date: "2026-10-25 20:00:00",
        smtpAnswerCode: 250,
      }]);
    }
    return responseJson([{
      providerMessageId: "provider-incomplete",
      recipient: recipientEmail,
      send_date: "2026-10-25 20:00:00",
    }]);
  });

  assert.deepEqual(evidence, {
    state: "DELIVERED",
    taskId: "provider-incomplete",
    smtpCode: 250,
    detail: null,
  });
});

test("missing or timed-out details stay pending and preserve the usable provider id", async () => {
  for (const detailOutcome of ["missing", "timeout"] as const) {
    const evidence = await reconcileWithFetch(async (input) => {
      const url = String(input);
      if (url.endsWith("/smtp/emails/info")) {
        if (detailOutcome === "timeout") throw new DOMException("timed out", "TimeoutError");
        return responseJson([]);
      }
      return responseJson([{
        providerMessageId: `provider-${detailOutcome}`,
        recipient: recipientEmail,
        subject,
        send_date: "2026-10-25 20:00:00",
      }]);
    });

    assert.deepEqual(evidence, {
      state: "PENDING",
      taskId: `provider-${detailOutcome}`,
      smtpCode: null,
      detail: "smtp_not_terminal",
    });
  }
});
