import assert from "node:assert/strict";
import test from "node:test";

import { normalizeFormcheckAnalysis, type FormcheckAnalysis } from "./formcheck/analysis";
import { FORMCHECK_MAX_ATTEMPTS } from "./formcheck/config";
import type { ClaimedAnalysis } from "./formcheck/store";
import { processFormcheckJob, type FormcheckWorkerDeps } from "./formcheck/worker";

const analysis = (overrides: Partial<FormcheckAnalysis> = {}): FormcheckAnalysis => ({
  ...normalizeFormcheckAnalysis({
    exploitable: true,
    exercise_recognized: "Squat",
    matches_declared_exercise: true,
    camera_view: "profil",
    confidence: 0.8,
    reps_count: 5,
    errors: [{ title: "Genoux", description: "d", severity: "majeure", frame_index: 2, annotations: [{ type: "circle", points: [{ x: 0.5, y: 0.5 }], radius: 0.05, label: "Genou" }] }],
    strengths: ["Gainage"],
    priority_corrections: [{ title: "a", cue: "a", why: "a" }, { title: "b", cue: "b", why: "b" }, { title: "c", cue: "c", why: "c" }],
    next_session_cues: ["x"],
    score: 70,
    summary: "Bonne base.",
  }, 8),
  ...overrides,
});

const job = (overrides: Partial<ClaimedAnalysis> = {}): ClaimedAnalysis => ({
  id: "11111111-2222-3333-4444-555555555555",
  email: "client@example.com",
  exercise_key: "squat",
  exercise_label: "Squat",
  attempts: 1,
  duration_s: 12,
  result: null,
  model: null,
  response_id: null,
  cost_usd: null,
  pdf: null,
  ...overrides,
});

function fakeDeps(options: { vision?: () => Promise<FormcheckAnalysis>; emailOk?: boolean } = {}) {
  const calls: Record<string, any[]> = {};
  const record = (name: string, ...args: any[]) => {
    (calls[name] ||= []).push(args);
  };
  const deps: FormcheckWorkerDeps = {
    loadFrames: async () => Array.from({ length: 8 }, (_, index) => ({ index, timestampS: index + 0.5, jpeg: Buffer.from([index]), annotated: null })),
    vision: async () => {
      record("vision");
      return { analysis: options.vision ? await options.vision() : analysis(), model: "test-model", responseId: "resp_test", costUsd: 0.12 };
    },
    saveResult: async (...args) => record("saveResult", ...args),
    annotate: async (jpeg, shapes, badge) => {
      record("annotate", shapes.length, badge);
      return Buffer.concat([jpeg, Buffer.from("A")]);
    },
    saveAnnotated: async (...args) => record("saveAnnotated", ...args),
    renderPdf: async (html) => {
      record("renderPdf", html.length);
      return Buffer.from("%PDF-test");
    },
    savePdf: async (...args) => record("savePdf", ...args),
    sendEmail: async (input) => {
      record("sendEmail", input);
      return options.emailOk ?? true;
    },
    consume: async (id) => {
      record("consume", id);
      return true;
    },
    reject: async (id, reason) => {
      record("reject", id, reason);
      return true;
    },
    needsReview: async (id, reason) => {
      record("needsReview", id, reason);
      return true;
    },
    retry: async (id, delay, reason) => record("retry", id, delay, reason),
    balance: async () => ({ available: 2 }),
    links: () => ({ uploadUrl: "https://apexlabs.test/formcheck/upload?token=t", pdfUrl: "https://apexlabs.test/pdf" }),
    now: () => new Date("2026-11-14T10:00:00Z"),
  };
  return { deps, calls };
}

test("a good analysis is annotated, rendered, emailed with the PDF, then the credit is consumed", async () => {
  const { deps, calls } = fakeDeps();
  assert.equal(await processFormcheckJob(job(), deps), "delivered");
  assert.equal(calls.vision.length, 1);
  assert.deepEqual(calls.annotate[0], [1, 1]);
  assert.equal(calls.saveAnnotated[0][1], 2);
  const mail = calls.sendEmail[0][0];
  assert.equal(mail.to, "client@example.com");
  assert.equal(mail.emailType, "sendFormcheckReportEmail");
  assert.ok(Object.keys(mail.attachments)[0].endsWith(".pdf"));
  assert.equal(calls.consume.length, 1);
  assert.equal(calls.reject, undefined);
});

test("each error gets its own annotated image, even when two errors share a frame", async () => {
  const base = analysis();
  const twoOnSameFrame = { ...base, errors: [base.errors[0], { ...base.errors[0], title: "Dos", annotations: [base.errors[0].annotations[0], base.errors[0].annotations[0]] }] };
  const { deps, calls } = fakeDeps({ vision: async () => twoOnSameFrame });
  assert.equal(await processFormcheckJob(job(), deps), "delivered");
  assert.deepEqual(calls.annotate, [[1, 1], [2, 2]]);
  assert.equal(calls.saveAnnotated.length, 1, "une seule image stockée par frame");
});

test("an unusable video is rejected: credit released, client asked to reshoot, no PDF", async () => {
  const { deps, calls } = fakeDeps({ vision: async () => analysis({ exploitable: false, rejection_reason: "Tes pieds sont hors cadre." }) });
  assert.equal(await processFormcheckJob(job(), deps), "rejected");
  assert.equal(calls.reject[0][1], "Tes pieds sont hors cadre.");
  assert.equal(calls.consume, undefined);
  assert.equal(calls.renderPdf, undefined);
  const mail = calls.sendEmail[0][0];
  assert.equal(mail.emailType, "sendFormcheckReshootEmail");
  assert.match(mail.text, /crédit n'a pas été utilisé/);
});

test("a wrong exercise is rejected without consuming the credit", async () => {
  const { deps, calls } = fakeDeps({ vision: async () => analysis({ matches_declared_exercise: false, exercise_recognized: "Hip thrust" }) });
  assert.equal(await processFormcheckJob(job(), deps), "rejected");
  assert.match(calls.reject[0][1], /Hip thrust/);
  assert.equal(calls.consume, undefined);
});

test("low confidence is retried, then escalated to the admin on the last attempt without consuming", async () => {
  const low = async () => analysis({ confidence: 0.2 });
  const first = fakeDeps({ vision: low });
  assert.equal(await processFormcheckJob(job({ attempts: 1 }), first.deps), "retry");
  assert.match(first.calls.retry[0][2], /LOW_CONFIDENCE/);
  assert.equal(first.calls.sendEmail, undefined);

  const last = fakeDeps({ vision: low });
  assert.equal(await processFormcheckJob(job({ attempts: FORMCHECK_MAX_ATTEMPTS }), last.deps), "needs_review");
  assert.equal(last.calls.needsReview.length, 1);
  assert.equal(last.calls.consume, undefined);
  const recipients = last.calls.sendEmail.map(([mail]: any[]) => mail.to);
  assert.ok(recipients.includes("client@example.com"));
  assert.equal(recipients.length, 2, "1 alerte admin + 1 message client");
  assert.ok(last.calls.sendEmail.some(([mail]: any[]) => /\[FormCheck\] Analyse à vérifier/.test(mail.subject)));
});

test("an OpenAI failure schedules a retry and never consumes the credit", async () => {
  const { deps, calls } = fakeDeps({ vision: async () => { throw new Error("429 rate limit"); } });
  assert.equal(await processFormcheckJob(job(), deps), "retry");
  assert.match(calls.retry[0][2], /VISION_ERROR:429/);
  assert.equal(calls.consume, undefined);
});

test("if the report email fails, the credit stays reserved and the job is retried", async () => {
  const { deps, calls } = fakeDeps({ emailOk: false });
  assert.equal(await processFormcheckJob(job(), deps), "retry");
  assert.equal(calls.retry[0][2], "EMAIL_SEND_FAILED");
  assert.equal(calls.consume, undefined);
});

test("a retry after a stored valid result reuses it: no second OpenAI call, no second PDF render", async () => {
  const { deps, calls } = fakeDeps();
  const stored = analysis();
  assert.equal(await processFormcheckJob(job({ attempts: 2, result: stored, pdf: Buffer.from("%PDF-old") }), deps), "delivered");
  assert.equal(calls.vision, undefined);
  assert.equal(calls.renderPdf, undefined);
  assert.equal(calls.consume.length, 1);
});
