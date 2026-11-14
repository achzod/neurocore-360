import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import {
  buildFormcheckLineItem,
  computeFrameTimestamps,
  FORMCHECK_PACKS,
  frameCountForDuration,
  getFormcheckAdminEmail,
  getFormcheckModel,
  resolveExercise,
  resolveFormcheckPack,
  retryDelayMs,
  validateUploadedFileMeta,
  validateVideoDuration,
} from "./formcheck/config";
import { decideFormcheckOutcome, FORMCHECK_ANALYSIS_SCHEMA, buildFormcheckPrompt, FORMCHECK_INSTRUCTIONS, normalizeFormcheckAnalysis } from "./formcheck/analysis";
import { angleDegrees, annotateFrame, buildAnnotationSvg } from "./formcheck/annotate";
import { buildFormcheckReportHtml, scoreVerdict } from "./formcheck/report";
import { buildAccessEmail, buildReportEmail, buildReshootEmail } from "./formcheck/emails";
import { parseFfmpegProbe } from "./formcheck/video";

const root = path.resolve(import.meta.dirname, "..");
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");

export const goodAnalysis = () => normalizeFormcheckAnalysis({
  exploitable: true,
  rejection_reason: "",
  exercise_recognized: "Squat barre haute",
  matches_declared_exercise: true,
  camera_view: "profil",
  confidence: 0.82,
  reps_count: 6,
  tempo: { eccentric_s: 2, pause_bottom_s: 0, concentric_s: 1, pause_top_s: 0.5, comment: "Descente contrôlée." },
  range_of_motion: { rating: "complète", comment: "Hanches sous les genoux." },
  symmetry: { assessable: false, comment: "Vue de profil stricte." },
  intensity: { reps_in_reserve: 2, proximity_to_failure: "proche", comment: "Vitesse qui chute sur la dernière rep." },
  errors: [{
    title: "Genoux qui avancent tôt",
    description: "Tu casses aux genoux avant les hanches.",
    severity: "modérée",
    frame_index: 3,
    annotations: [
      { type: "circle", points: [{ x: 0.5, y: 0.6 }], radius: 0.06, label: "Genou" },
      { type: "angle", points: [{ x: 0.4, y: 0.4 }, { x: 0.5, y: 0.6 }, { x: 0.45, y: 0.85 }], radius: 0, label: "Genou" },
    ],
  }],
  strengths: ["Dos gainé", "Pieds stables"],
  priority_corrections: [
    { title: "Hanches d'abord", cue: "Fesses en arrière", why: "Répartit la charge." },
    { title: "Respiration", cue: "Inspire, bloque", why: "Stabilise le tronc." },
    { title: "Tempo", cue: "Deux secondes en bas", why: "Plus de contrôle." },
  ],
  next_session_cues: ["Garde la même charge", "Filme de profil"],
  score: 74,
  summary: "Bonne base, corrige l'initiation du mouvement.",
  safety_note: "Pas de diagnostic médical.",
}, 10);

test("FormCheck packs are exactly 1/3/6 analyses at 9,90 / 24,90 / 44,90 EUR", () => {
  assert.deepEqual(
    Object.values(FORMCHECK_PACKS).map((p) => [p.id, p.credits, p.amountCents]),
    [["1", 1, 990], ["3", 3, 2490], ["6", 6, 4490]],
  );
  assert.equal(resolveFormcheckPack("3")?.credits, 3);
  assert.equal(resolveFormcheckPack("12"), null);
  assert.equal(resolveFormcheckPack(undefined), null);
});

test("checkout uses STRIPE_PRICE_FORMCHECK_* when valid and falls back to inline price_data", () => {
  const pack = FORMCHECK_PACKS["6"];
  const inline = buildFormcheckLineItem(pack, {});
  assert.equal(inline.price, undefined);
  assert.equal(inline.price_data?.unit_amount, 4490);
  assert.equal(inline.price_data?.currency, "eur");
  assert.match(String(inline.price_data?.product_data?.name), /FormCheck : 6 analyses/);

  const configured = buildFormcheckLineItem(pack, { STRIPE_PRICE_FORMCHECK_6: "price_1ABCdef" });
  assert.deepEqual(configured, { quantity: 1, price: "price_1ABCdef" });

  const malformed = buildFormcheckLineItem(pack, { STRIPE_PRICE_FORMCHECK_6: "  not-a-price " });
  assert.equal(malformed.price_data?.unit_amount, 4490);
});

test("upload limits: mp4/mov only, 200 MB, 60 s", () => {
  assert.equal(validateUploadedFileMeta({ originalName: "serie.MOV", mimeType: "video/quicktime", sizeBytes: 10_000 }), null);
  assert.equal(validateUploadedFileMeta({ originalName: "serie.mp4", mimeType: "video/mp4", sizeBytes: 200 * 1024 * 1024 }), null);
  assert.equal(validateUploadedFileMeta({ originalName: "serie.mp4", mimeType: "video/mp4", sizeBytes: 200 * 1024 * 1024 + 1 })?.code, "TOO_LARGE");
  assert.equal(validateUploadedFileMeta({ originalName: "serie.avi", mimeType: "video/x-msvideo", sizeBytes: 1000 })?.code, "FORMAT");
  assert.equal(validateUploadedFileMeta({ originalName: "serie.webm", mimeType: "video/webm", sizeBytes: 1000 })?.code, "FORMAT");
  assert.equal(validateVideoDuration(60.8), null);
  assert.equal(validateVideoDuration(62)?.code, "TOO_LONG");
  assert.equal(validateVideoDuration(1)?.code, "TOO_SHORT");
  assert.equal(validateVideoDuration(null)?.code, "UNREADABLE");
  for (const message of [validateVideoDuration(62)!.message, validateUploadedFileMeta({ originalName: "a.avi", mimeType: "x", sizeBytes: 1 })!.message]) {
    assert.doesNotMatch(message, /[\u2013\u2014]/);
  }
});

test("8 to 12 frames are spread over the whole set, inside the video", () => {
  assert.equal(frameCountForDuration(7), 8);
  assert.equal(frameCountForDuration(20), 10);
  assert.equal(frameCountForDuration(60), 12);
  for (const duration of [3, 7.1, 20.5, 45, 60]) {
    const ts = computeFrameTimestamps(duration);
    assert.ok(ts.length >= 8 && ts.length <= 12);
    assert.ok(ts[0] > 0 && ts[ts.length - 1] < duration);
    for (let i = 1; i < ts.length; i++) assert.ok(ts[i] > ts[i - 1]);
    // couvre au moins 85 % de la série
    assert.ok(ts[ts.length - 1] - ts[0] >= duration * 0.85 * ((ts.length - 1) / ts.length));
  }
});

test("model, admin email and retry delays are configurable with safe defaults", () => {
  assert.equal(getFormcheckModel({ FORMCHECK_MODEL: "gpt-x-vision" }), "gpt-x-vision");
  assert.equal(getFormcheckModel({ OPENAI_REPORT_MODEL: "gpt-5.6-sol" }), "gpt-5.6-sol");
  assert.equal(getFormcheckModel({}), "gpt-5.6-sol");
  assert.equal(getFormcheckAdminEmail({ ADMIN_NOTIF_EMAIL: "ops@x.fr", ADMIN_NOTIFICATION_EMAIL: "old@x.fr" }), "ops@x.fr");
  assert.equal(getFormcheckAdminEmail({ ADMIN_NOTIFICATION_EMAIL: "old@x.fr" }), "old@x.fr");
  assert.ok(retryDelayMs(1) < retryDelayMs(2) && retryDelayMs(2) < retryDelayMs(3));
  assert.equal(resolveExercise("squat")?.label, "Squat");
  assert.equal(resolveExercise("haltero"), null);
});

test("strict JSON schema requires every field and forbids extra keys", () => {
  const walk = (node: any, where: string) => {
    if (node?.type === "object") {
      assert.equal(node.additionalProperties, false, where);
      assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort(), where);
      for (const [key, child] of Object.entries(node.properties)) walk(child, `${where}.${key}`);
    }
    if (node?.type === "array") walk(node.items, `${where}[]`);
  };
  walk(FORMCHECK_ANALYSIS_SCHEMA, "root");
  for (const key of ["exercise_recognized", "matches_declared_exercise", "reps_count", "tempo", "range_of_motion", "symmetry", "intensity", "errors", "strengths", "priority_corrections", "next_session_cues", "score", "safety_note"]) {
    assert.ok(key in (FORMCHECK_ANALYSIS_SCHEMA as any).properties, key);
  }
});

test("prompt is French, tutoiement, and forbids medical diagnosis", () => {
  const prompt = buildFormcheckPrompt({ declaredExercise: "Squat", frameTimestamps: [1, 2, 3, 4, 5, 6, 7, 8], durationS: 9 });
  assert.match(FORMCHECK_INSTRUCTIONS, /Tu tutoies/);
  assert.match(FORMCHECK_INSTRUCTIONS, /Interdit : tout diagnostic médical/);
  assert.match(prompt, /exactement 3 corrections prioritaires/);
  assert.match(prompt, /frame 7 = 8\.0 s/);
  assert.match(prompt, /coordonnées relatives/);
});

test("normalization clamps model output so the PDF never breaks", () => {
  const raw = normalizeFormcheckAnalysis({
    exploitable: true,
    score: 140,
    confidence: 3,
    errors: [{ title: "Dos rond — fin de série", severity: "grave", frame_index: 99, annotations: [{ type: "angle", points: [{ x: 2, y: -1 }], radius: 1, label: "x" }, { type: "line", points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }], radius: 0, label: "Barre" }] }],
    priority_corrections: [{ title: "a" }, { title: "b" }, { title: "c" }, { title: "d" }],
  }, 8);
  assert.equal(raw.score, 100);
  assert.equal(raw.confidence, 1);
  assert.equal(raw.errors[0].frame_index, 7);
  assert.equal(raw.errors[0].severity, "modérée");
  assert.equal(raw.errors[0].title, "Dos rond , fin de série");
  assert.equal(raw.errors[0].annotations.length, 1, "un angle sans 3 points est retiré");
  assert.equal(raw.priority_corrections.length, 3);
  assert.match(raw.safety_note, /avis médical/);
});

test("decision: unusable video or wrong exercise is rejected (credit kept), low confidence is retried", () => {
  const good = goodAnalysis();
  assert.deepEqual(decideFormcheckOutcome(good, "Squat", 0.55), { kind: "deliver" });

  const unusable = { ...good, exploitable: false, rejection_reason: "Tes pieds sont hors cadre." };
  assert.deepEqual(decideFormcheckOutcome(unusable, "Squat", 0.55), { kind: "reject", reason: "Tes pieds sont hors cadre." });

  const wrong = { ...good, matches_declared_exercise: false, exercise_recognized: "Soulevé de terre" };
  const decision = decideFormcheckOutcome(wrong, "Squat", 0.55);
  assert.equal(decision.kind, "reject");
  assert.match((decision as any).reason, /Squat/);
  assert.match((decision as any).reason, /Soulevé de terre/);

  assert.equal(decideFormcheckOutcome({ ...good, confidence: 0.3 }, "Squat", 0.55).kind, "retry");
  assert.equal(decideFormcheckOutcome({ ...good, priority_corrections: good.priority_corrections.slice(0, 2) }, "Squat", 0.55).kind, "retry");
});

test("annotation SVG draws circle, line, arrow and angle with measured degrees", () => {
  assert.equal(angleDegrees({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }), 90);
  const svg = buildAnnotationSvg(1000, 500, [
    { type: "circle", points: [{ x: 0.5, y: 0.5 }], radius: 0.05, label: "Genou" },
    { type: "line", points: [{ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.9 }], radius: 0, label: "Barre" },
    { type: "arrow", points: [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.2 }], radius: 0, label: "Recule" },
    { type: "angle", points: [{ x: 0.4, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.6, y: 0.5 }], radius: 0, label: "Hanche" },
  ], 1);
  assert.match(svg, /<circle cx="500" cy="250" r="50"/);
  assert.match(svg, /stroke-dasharray/);
  assert.match(svg, /Hanche \d+°/);
  assert.match(svg, /#FCDD00/);
  assert.doesNotMatch(svg, /<script/);
  assert.match(buildAnnotationSvg(100, 100, [{ type: "circle", points: [{ x: 0.5, y: 0.5 }], radius: 0.1, label: "<b>" }]), /&lt;b&gt;/);
});

test("annotateFrame composes the overlay onto a real JPEG with sharp", async () => {
  const base = await sharp({ create: { width: 640, height: 360, channels: 3, background: "#808080" } }).jpeg().toBuffer();
  const out = await annotateFrame(base, [{ type: "circle", points: [{ x: 0.5, y: 0.5 }], radius: 0.1, label: "Genou" }], 1);
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, 640);
  // le pixel sur le cercle n'est plus gris
  const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  const px = (x: number, y: number) => data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3);
  const onRing = px(320 + 64, 180);
  assert.ok(onRing[0] > 180 && onRing[1] > 160 && onRing[2] < 120, `pixel ${[...onRing]}`);
});

test("PDF HTML is light, branded, and shows annotated captures and corrections", () => {
  const analysis = goodAnalysis();
  const frame = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const html = buildFormcheckReportHtml({
    analysisId: "abcdef12-0000-0000-0000-000000000000",
    email: "client@example.com",
    exerciseLabel: "Squat",
    createdAt: new Date("2026-11-14T10:00:00Z"),
    analysis,
    frames: Array.from({ length: 10 }, (_, index) => ({ index, timestampS: index * 2 + 1, jpeg: frame, annotated: index === 3 ? Buffer.from([1, 2, 3]) : null })),
  });
  assert.match(html, /body \{[^}]*background: #FFFFFF/);
  assert.match(html, /#FCDD00/);
  // Le noir sert uniquement d'accent (pastilles numérotées), jamais de fond de page ou de bloc.
  const darkBackgrounds = html.match(/\.[a-z-]+ \{[^}]*background: #0A0A0A/gi) || [];
  assert.deepEqual(darkBackgrounds.map((rule) => rule.split(" ")[0]), [".c-num"]);
  assert.match(html, /74<small>\/100<\/small>/);
  assert.match(html, /Tes 3 corrections prioritaires/);
  assert.match(html, /Image 4 sur 10/);
  assert.match(html, /data:image\/jpeg;base64,AQID/, "la capture annotée remplace la frame brute");
  assert.match(html, /ne constitue ni un diagnostic, ni un avis médical/);
  assert.equal(scoreVerdict(90), "Technique solide");
  assert.equal(scoreVerdict(40), "Technique à reconstruire");
});

test("client emails are French, accented, without em dash, and never promise anything free", () => {
  const mails = [
    buildAccessEmail({ uploadUrl: "https://x/u?token=t", credits: 3, available: 3 }),
    buildReportEmail({ exerciseLabel: "Squat", score: 74, summary: "Bonne base.", pdfUrl: "https://x/p", uploadUrl: "https://x/u", available: 2 }),
    buildReshootEmail({ exerciseLabel: "Squat", reason: "Pieds hors cadre.", uploadUrl: "https://x/u" }),
  ];
  for (const mail of mails) {
    assert.doesNotMatch(mail.html + mail.text + mail.subject, /[\u2013\u2014]/);
    assert.doesNotMatch(mail.html + mail.text, /gratuit|WhatsApp/i);
    assert.match(mail.html, /#FCDD00/);
  }
  assert.match(mails[0].text, /60 s maximum/);
  assert.match(mails[2].subject, /crédit non utilisé/);
});

test("ffmpeg probe parsing reads duration, size and video stream", () => {
  const stderr = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'a.mov':
  Duration: 00:00:21.53, start: 0.000000, bitrate: 3345 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709, progressive), 1920x1080 [SAR 1:1 DAR 16:9], 3200 kb/s, 25 fps`;
  assert.deepEqual(parseFfmpegProbe(stderr), { durationS: 21.53, hasVideo: true, width: 1920, height: 1080 });
  assert.deepEqual(parseFfmpegProbe("Invalid data found when processing input"), { durationS: null, hasVideo: false, width: null, height: null });
});

test("frame extraction works end to end on a generated video", { skip: spawnSync("ffmpeg", ["-version"]).status !== 0 && "ffmpeg absent" }, async () => {
  const { probeVideo, extractFrames } = await import("./formcheck/video");
  const dir = mkdtempSync(path.join(tmpdir(), "formcheck-test-"));
  try {
    const file = path.join(dir, "serie.mp4");
    const gen = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=duration=12:size=1280x720:rate=25", "-pix_fmt", "yuv420p", file]);
    assert.equal(gen.status, 0, String(gen.stderr));
    const probe = await probeVideo(file);
    assert.ok(Math.abs((probe.durationS || 0) - 12) < 0.2);
    const frames = await extractFrames(file, probe.durationS!);
    assert.equal(frames.length, 8);
    const meta = await sharp(frames[0].jpeg).metadata();
    assert.equal(meta.width, 1024);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Stripe webhook routes FormCheck sessions to credit fulfillment before the orders table", () => {
  const routes = read("server/routes.ts");
  const webhook = routes.slice(routes.indexOf('app.post("/api/stripe/webhook"'));
  const branch = webhook.indexOf("isFormcheckCheckoutSession(session)");
  assert.ok(branch > 0);
  assert.ok(branch > webhook.indexOf("if (!isStripeCheckoutPaid(session)) break;"));
  assert.ok(branch < webhook.indexOf("storage.getOrderByStripeSession(session.id)"));
  assert.match(routes, /registerFormcheckRoutes\(app\)/);
});

test("FormCheck never creates Stripe prices or touches deployment config", () => {
  const sources = ["server/formcheck/routes.ts", "server/formcheck/config.ts", "server/formcheck/worker.ts"].map(read).join("\n");
  assert.doesNotMatch(sources, /prices\.create|products\.create/);
  assert.doesNotMatch(sources, /render\.com\/v1|api\.render\.com/);
  assert.match(read("server/formcheck/routes.ts"), /rm\(file\.path/, "la vidéo est supprimée après extraction");
});

test("the upload page is a real noindex SPA route (no 404) and is routed client side", () => {
  const staticServer = read("server/static.ts");
  const block = staticServer.slice(staticServer.indexOf('ssrSimplePage(["/formcheck/upload"]'));
  assert.ok(block.length > 0 && staticServer.includes('ssrSimplePage(["/formcheck/upload"]'));
  assert.match(block.slice(0, 400), /robots: "noindex, follow"/);
  assert.match(read("client/src/App.tsx"), /<Route path="\/formcheck\/upload" component=\{FormCheckUpload\} \/>/);
});
