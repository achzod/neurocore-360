/**
 * FormCheck V2 : rapport PDF (fond clair, couleurs AchZod) généré avec puppeteer.
 * buildFormcheckReportHtml est pur et testable ; renderFormcheckPdf lance Chromium.
 */
import type { FormcheckAnalysis } from "./analysis";
import { FORMCHECK_BRAND as C } from "./config";

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);
const jpg = (buf: Buffer) => `data:image/jpeg;base64,${buf.toString("base64")}`;
const cap = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

export interface ReportFrame { index: number; timestampS: number; jpeg: Buffer; annotated?: Buffer | null }

export interface ReportInput {
  analysisId: string;
  email: string;
  exerciseLabel: string;
  createdAt: Date;
  analysis: FormcheckAnalysis;
  frames: ReportFrame[];
}

export function scoreVerdict(score: number): string {
  if (score >= 85) return "Technique solide";
  if (score >= 70) return "Bonne base, à affiner";
  if (score >= 50) return "Des corrections importantes";
  return "Technique à reconstruire";
}

const VIEW_LABEL: Record<FormcheckAnalysis["camera_view"], string> = {
  profil: "Profil", face: "Face", dos: "Dos", trois_quarts: "Trois quarts", autre: "Autre",
};

const INTENSITY_LABEL: Record<FormcheckAnalysis["intensity"]["proximity_to_failure"], string> = {
  loin: "Loin de l'échec",
  modérée: "Effort modéré",
  proche: "Proche de l'échec",
  échec: "Échec atteint",
  "non évaluable": "Non évaluable",
};

export function buildFormcheckReportHtml(input: ReportInput): string {
  const a = input.analysis;
  const framesByIndex = new Map(input.frames.map((f) => [f.index, f]));
  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(input.createdAt);
  const tempo = `${fmt(a.tempo.eccentric_s)} / ${fmt(a.tempo.pause_bottom_s)} / ${fmt(a.tempo.concentric_s)} / ${fmt(a.tempo.pause_top_s)}`;
  const rir = a.intensity.reps_in_reserve >= 0 ? `${a.intensity.reps_in_reserve} rep${a.intensity.reps_in_reserve > 1 ? "s" : ""} en réserve` : "Non évaluable";

  const metric = (label: string, value: string, note: string) => `
    <div class="metric"><div class="m-label">${esc(label)}</div><div class="m-value">${esc(value)}</div><div class="m-note">${esc(note)}</div></div>`;

  const errorBlocks = a.errors.map((error, i) => {
    const frame = framesByIndex.get(error.frame_index);
    const image = frame ? (frame.annotated || frame.jpeg) : null;
    return `
      <div class="error avoid-break">
        ${image ? `<img class="error-img" src="${jpg(image)}" alt="Capture ${i + 1}"/>` : ""}
        <div class="error-body">
          <div class="error-head"><span class="badge">${i + 1}</span><span class="sev sev-${esc(error.severity === "modérée" ? "moderee" : error.severity)}">${esc(error.severity)}</span></div>
          <h3>${esc(error.title)}</h3>
          <p>${esc(error.description)}</p>
          ${frame ? `<div class="m-note">Image ${frame.index + 1} sur ${input.frames.length}, à ${fmt(Number(frame.timestampS.toFixed(1)))} s</div>` : ""}
        </div>
      </div>`;
  });
  const errorsHtml = errorBlocks.length
    ? `<div class="avoid-break"><h2>Ce qu'on voit sur la vidéo</h2>${errorBlocks[0]}</div>${errorBlocks.slice(1).join("")}`
    : "";

  const correctionsHtml = a.priority_corrections.map((c, i) => `
    <div class="correction avoid-break">
      <div class="c-num">${i + 1}</div>
      <div><h3>${esc(c.title)}</h3><div class="cue">« ${esc(c.cue)} »</div><p>${esc(c.why)}</p></div>
    </div>`).join("");

  const list = (items: string[]) => `<ul>${items.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`;
  const strip = input.frames.map((f) => `<figure><img src="${jpg(f.jpeg)}" alt="Image ${f.index + 1}"/><figcaption>${fmt(Number(f.timestampS.toFixed(1)))} s</figcaption></figure>`).join("");

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/><title>FormCheck : ${esc(input.exerciseLabel)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Helvetica Neue", Helvetica, Arial, "DejaVu Sans", sans-serif; color: ${C.ink}; background: ${C.paper}; font-size: 11pt; line-height: 1.45; }
  h1, h2, h3 { margin: 0; color: ${C.black}; }
  h2 { font-size: 15pt; margin: 22px 0 10px; padding-bottom: 6px; border-bottom: 3px solid ${C.yellow}; display: inline-block; break-after: avoid; page-break-after: avoid; }
  .section-head { break-after: avoid; page-break-after: avoid; }
  h3 { font-size: 11.5pt; margin-bottom: 4px; }
  p { margin: 0 0 6px; }
  .top { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid ${C.line}; }
  .brand { font-weight: 900; letter-spacing: 0.08em; font-size: 12pt; }
  .brand span { background: ${C.yellow}; padding: 2px 6px; margin-left: 6px; }
  .meta { color: ${C.muted}; font-size: 9pt; text-align: right; }
  .hero { display: flex; gap: 18px; align-items: stretch; margin-top: 16px; }
  .score { min-width: 150px; background: ${C.yellow}; color: ${C.black}; padding: 16px; text-align: center; border-radius: 6px; }
  .score .num { font-size: 44pt; font-weight: 900; line-height: 1; }
  .score .num small { font-size: 14pt; }
  .score .verdict { font-weight: 700; font-size: 10pt; margin-top: 6px; }
  .summary { flex: 1; background: ${C.soft}; border-radius: 6px; padding: 14px 16px; }
  .summary h1 { font-size: 18pt; margin-bottom: 6px; }
  .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
  .metric { border: 1px solid ${C.line}; border-radius: 6px; padding: 9px 10px; }
  .m-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; color: ${C.muted}; }
  .m-value { font-size: 12.5pt; font-weight: 800; color: ${C.black}; }
  .m-note { font-size: 8.5pt; color: ${C.muted}; }
  .correction { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid ${C.line}; }
  .c-num { flex: 0 0 30px; height: 30px; border-radius: 50%; background: ${C.black}; color: ${C.yellow}; font-weight: 900; display: flex; align-items: center; justify-content: center; }
  .cue { font-weight: 700; background: #FFF8C2; display: inline-block; padding: 2px 6px; margin: 2px 0 4px; }
  .error { display: flex; gap: 12px; margin: 10px 0; padding: 10px; border: 1px solid ${C.line}; border-radius: 6px; }
  .error-img { width: 52%; border-radius: 4px; object-fit: contain; max-height: 330px; background: ${C.soft}; }
  .error-body { flex: 1; }
  .error-head { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
  .badge { width: 24px; height: 24px; border-radius: 50%; background: ${C.yellow}; border: 2px solid ${C.black}; font-weight: 900; display: inline-flex; align-items: center; justify-content: center; font-size: 10pt; }
  .sev { font-size: 8pt; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; padding: 2px 6px; border-radius: 3px; background: ${C.soft}; }
  .sev-majeure { background: #FDE2E2; color: #9B1C1C; }
  .sev-moderee { background: #FFF3C4; color: #6B5300; }
  ul { margin: 4px 0 0 18px; padding: 0; } li { margin-bottom: 4px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .strip { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
  .strip figure { margin: 0; } .strip img { width: 100%; border-radius: 3px; }
  .strip figcaption { font-size: 7.5pt; color: ${C.muted}; text-align: center; }
  .safety { margin-top: 18px; font-size: 8.5pt; color: ${C.muted}; border-top: 1px solid ${C.line}; padding-top: 8px; }
  .avoid-break { break-inside: avoid; page-break-inside: avoid; }
</style></head>
<body>
  <div class="top">
    <div class="brand">APEXLABS<span>FORMCHECK</span></div>
    <div class="meta">${esc(input.exerciseLabel)} · ${esc(date)}<br/>Réf. ${esc(input.analysisId.slice(0, 8).toUpperCase())}</div>
  </div>

  <div class="hero avoid-break">
    <div class="score"><div class="num">${a.score}<small>/100</small></div><div class="verdict">${esc(scoreVerdict(a.score))}</div></div>
    <div class="summary"><h1>${esc(a.exercise_recognized || input.exerciseLabel)}</h1><p>${esc(a.summary)}</p></div>
  </div>

  <div class="metrics avoid-break">
    ${metric("Répétitions", String(a.reps_count), "Estimées sur la série")}
    ${metric("Tempo (s)", tempo, a.tempo.comment || "Descente · pause · montée · pause")}
    ${metric("Amplitude", cap(a.range_of_motion.rating), a.range_of_motion.comment)}
    ${metric("Symétrie", a.symmetry.assessable ? "Évaluée" : "Non évaluable", a.symmetry.comment)}
    ${metric("Intensité", INTENSITY_LABEL[a.intensity.proximity_to_failure], `${rir}${a.intensity.comment ? `. ${a.intensity.comment}` : ""}`)}
    ${metric("Angle de vue", VIEW_LABEL[a.camera_view], "Vue de la caméra")}
  </div>

  <div class="avoid-break"><h2>Tes 3 corrections prioritaires</h2>${correctionsHtml}</div>

  ${errorsHtml}

  <div class="cols avoid-break">
    <div><h2>Tes points forts</h2>${list(a.strengths)}</div>
    <div><h2>Prochaine séance</h2>${list(a.next_session_cues)}</div>
  </div>

  <div class="avoid-break"><h2>La série image par image</h2><div class="strip">${strip}</div></div>

  <div class="safety">${esc(a.safety_note)} Analyse générée automatiquement à partir d'images extraites de ta vidéo, sous la méthode Achzod. Elle porte uniquement sur la technique et ne constitue ni un diagnostic, ni un avis médical.</div>
</body></html>`;
}

export async function renderFormcheckPdf(html: string): Promise<Buffer> {
  const { default: puppeteer } = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="width:100%;font-size:7pt;color:#8a8a8a;padding:0 12mm;display:flex;justify-content:space-between;font-family:Helvetica,Arial,sans-serif"><span>APEXLABS by Achzod · FormCheck</span><span class="pageNumber"></span></div>`,
      margin: { top: "14mm", right: "12mm", bottom: "16mm", left: "12mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => {});
  }
}
