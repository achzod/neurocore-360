import assert from "node:assert/strict";
import test from "node:test";

import { normalizeFormcheckAnalysis, type FormcheckAnalysis } from "./formcheck/analysis";
import { FORMCHECK_MAX_ATTEMPTS } from "./formcheck/config";
import type { ClaimedAnalysis } from "./formcheck/store";
import { processFormcheckJob, type FormcheckWorkerDeps } from "./formcheck/worker";

const analysis = (overrides: Partial<FormcheckAnalysis> = {}): FormcheckAnalysis => ({
  ...normalizeFormcheckAnalysis({
    exploitable: true,
    exercise_detected: { name_fr: "Soulevé de terre sur blocs", is_strength_exercise: true },
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
  exercise_label: null,
  attempts: 1,
  duration_s: 12,
  result: null,
  model: null,
  response_id: null,
  cost_usd: null,
  pdf: null,
  ...overrides,
});

function fakeDeps(options: { vision?: () => Promise<FormcheckAnalysis>; emailOk?: boolean; pdfFails?: boolean } = {}) {
  const calls: Record<string, any[]> = {};
  const record = (name: string, ...args: any[]) => {
    (calls[name] ||= []).push(args);
  };
  const deps: FormcheckWorkerDeps = {
    loadFrames: async () => Array.from({ length: 8 }, (_, index) => ({ index, timestampS: index + 0.5, jpeg: Buffer.from([index]), annotated: null })),
    vision: async (input) => {
      record("vision", input);
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
      if (options.pdfFails) throw new Error("Could not find Chrome (ver. 143.0.7499.169)");
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
  assert.equal(Object.keys(mail.attachments)[0], "FormCheck_souleve_de_terre_sur_blocs_11111111.pdf");
  // L'exercice n'est jamais fourni au modèle : il le détecte et c'est lui qu'on affiche.
  assert.ok(!("declaredExercise" in calls.vision[0][0]));
  assert.match(mail.subject, /Soulevé de terre sur blocs/);
  assert.match(mail.text, /Exercice détecté : Soulevé de terre sur blocs/);
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

test("a truly unusable video is rejected: credit released, client asked to reshoot, no PDF", async () => {
  const { deps, calls } = fakeDeps({ vision: async () => analysis({ exploitable: false, rejection_code: "video_illisible", rejection_reason: "Ta vidéo est noire du début à la fin." }) });
  assert.equal(await processFormcheckJob(job(), deps), "rejected");
  assert.equal(calls.reject[0][1], "Ta vidéo est noire du début à la fin.");
  assert.equal(calls.consume, undefined);
  assert.equal(calls.renderPdf, undefined);
  const mail = calls.sendEmail[0][0];
  assert.equal(mail.emailType, "sendFormcheckReshootEmail");
  assert.match(mail.text, /crédit n'a pas été utilisé/);
});

test("no strength exercise recognized: rejected, credit released, client asked to reshoot", async () => {
  const { deps, calls } = fakeDeps({ vision: async () => analysis({ exercise_detected: { name_fr: "", is_strength_exercise: false } }) });
  assert.equal(await processFormcheckJob(job(), deps), "rejected");
  assert.match(calls.reject[0][1], /aucun exercice de musculation/);
  assert.equal(calls.consume, undefined);
  assert.equal(calls.renderPdf, undefined);
  assert.equal(calls.sendEmail[0][0].emailType, "sendFormcheckReshootEmail");
});

test("any recognized strength exercise is analyzed and delivered (no more wrong-exercise rejection)", async () => {
  const { deps, calls } = fakeDeps({ vision: async () => analysis({ exercise_detected: { name_fr: "Hip thrust", is_strength_exercise: true } }) });
  assert.equal(await processFormcheckJob(job(), deps), "delivered");
  assert.equal(calls.reject, undefined);
  assert.equal(calls.consume.length, 1);
  assert.match(calls.sendEmail[0][0].subject, /Hip thrust/);
});

test("low confidence is retried once, then the report is delivered (no manual review)", async () => {
  const low = async () => analysis({ confidence: 0.2 });
  const first = fakeDeps({ vision: low });
  assert.equal(await processFormcheckJob(job({ attempts: 1 }), first.deps), "retry");
  assert.match(first.calls.retry[0][2], /LOW_CONFIDENCE/);
  assert.equal(first.calls.sendEmail, undefined);

  const second = fakeDeps({ vision: low });
  assert.equal(await processFormcheckJob(job({ attempts: 2 }), second.deps), "delivered");
  assert.equal(second.calls.needsReview, undefined);
  assert.equal(second.calls.consume.length, 1);
  assert.equal(second.calls.sendEmail.length, 1, "seulement le rapport, pas d'alerte admin");
  assert.equal(second.calls.sendEmail[0][0].emailType, "sendFormcheckReportEmail");
});

test("a framing complaint (feet cut, machine, someone passing) no longer rejects: the report ships with its limits", async () => {
  const framing = async () => analysis({
    exploitable: false,
    rejection_code: "",
    rejection_reason: "Tes pieds sont partiellement coupés et une autre personne passe à 26,1 s.",
    analysis_limits: ["Tes pieds sont coupés : je n'ai pas pu juger tes appuis."],
  });
  const { deps, calls } = fakeDeps({ vision: framing });
  assert.equal(await processFormcheckJob(job({ attempts: 1 }), deps), "delivered");
  assert.equal(calls.reject, undefined);
  assert.equal(calls.needsReview, undefined);
  const mail = calls.sendEmail[0][0];
  assert.equal(mail.emailType, "sendFormcheckReportEmail");
  assert.match(mail.text, /Limites de cette vidéo : Tes pieds sont coupés/);
});

test("a hard rejection code still asks to reshoot with the credit released", async () => {
  const noRep = async () => analysis({ exploitable: false, rejection_code: "aucune_repetition", rejection_reason: "Je ne vois aucune répétition : filme ta série complète." });
  const { deps, calls } = fakeDeps({ vision: noRep });
  assert.equal(await processFormcheckJob(job(), deps), "rejected");
  assert.equal(calls.reject[0][1], "Je ne vois aucune répétition : filme ta série complète.");
  assert.equal(calls.consume, undefined);
  assert.match(calls.sendEmail[0][0].html, /Je n'ai pas pu analyser ta vidéo/);
});

test("PDF rendering failure (Chrome missing) is retried, then the report is delivered as HTML instead of manual review", async () => {
  const first = fakeDeps({ pdfFails: true });
  assert.equal(await processFormcheckJob(job({ attempts: 1 }), first.deps), "retry");
  assert.match(first.calls.retry[0][2], /RENDER_ERROR:Could not find Chrome/);
  assert.equal(first.calls.consume, undefined);

  const last = fakeDeps({ pdfFails: true });
  assert.equal(await processFormcheckJob(job({ attempts: FORMCHECK_MAX_ATTEMPTS }), last.deps), "delivered");
  assert.equal(last.calls.needsReview, undefined);
  assert.equal(last.calls.consume.length, 1);
  const mail = last.calls.sendEmail[0][0];
  assert.deepEqual(Object.keys(mail.attachments), ["FormCheck_souleve_de_terre_sur_blocs_11111111.html"]);
  assert.match(mail.attachments[Object.keys(mail.attachments)[0]].toString("utf8"), /^<!doctype html>/);
  assert.doesNotMatch(mail.html, /Télécharge le PDF/);
});

test("only a persistent technical failure releases the credit, with a first-person email and no manual review wording", async () => {
  const { deps, calls } = fakeDeps({ vision: async () => { throw new Error("OpenAI 500"); } });
  assert.equal(await processFormcheckJob(job({ attempts: FORMCHECK_MAX_ATTEMPTS }), deps), "needs_review");
  assert.equal(calls.consume, undefined);
  const client = calls.sendEmail.map(([mail]: any[]) => mail).find((mail: any) => mail.to === "client@example.com");
  assert.match(client.html, /Un souci technique de mon côté/);
  assert.doesNotMatch(client.subject + client.text + client.html, /vérification|manuelle|Achzod a été prévenu|\bon\b|\bnous\b/i);
  assert.ok(calls.sendEmail.some(([mail]: any[]) => /\[FormCheck\] Échec technique/.test(mail.subject)));
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
