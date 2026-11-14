/**
 * FormCheck V2 : rapport PDF long et détaillé (fond clair, couleurs AchZod) généré avec puppeteer.
 * buildFormcheckReportHtml est pur et testable ; renderFormcheckPdf lance Chromium.
 *
 * Structure : synthèse, tableau de bord, analyse phase par phase et tempo rep par rep,
 * une page par erreur (image annotée, pourquoi, comment corriger, exercices, progression),
 * points forts et consignes, plan de correction sur 4 semaines, série image par image,
 * puis une dernière page d'appel au coaching Achzod.
 */
import { PHASE_LABEL, type FormcheckAnalysis, type Rating, type Verdict } from "./analysis";
import { FORMCHECK_BRAND as C } from "./config";
import { achzodLogoHtml } from "./logo";

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);
const jpg = (buf: Buffer) => `data:image/jpeg;base64,${buf.toString("base64")}`;
const cap = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

export const COACHING_URL = "https://achzodcoaching.com";
export const COACHING_FORMULAS = [
  {
    name: "Essential",
    durations: "4, 8 ou 12 semaines",
    href: "https://www.achzodcoaching.com/coaching-essential",
    description: "Le cadre essentiel pour avancer avec une stratégie claire et un suivi régulier.",
  },
  {
    name: "Elite",
    durations: "4, 8 ou 12 semaines",
    href: "https://www.achzodcoaching.com/coaching-elite",
    description: "Un accompagnement plus poussé pour accélérer ta progression et ajuster chaque détail.",
  },
  {
    name: "Private Lab",
    durations: "8 ou 12 semaines",
    href: "https://www.achzodcoaching.com/coaching-achzod-private-lab",
    description: "Mon niveau d'accompagnement le plus complet pour une optimisation approfondie.",
  },
] as const;

export interface ReportFrame { index: number; timestampS: number; jpeg: Buffer; annotated?: Buffer | null }

export interface ReportInput {
  analysisId: string;
  email: string;
  exerciseLabel: string;
  createdAt: Date;
  analysis: FormcheckAnalysis;
  frames: ReportFrame[];
  /** Image annotée propre à chaque erreur (même ordre que analysis.errors). */
  errorImages?: Array<Buffer | null>;
}

export function scoreVerdict(score: number): string {
  if (score >= 85) return "Technique solide";
  if (score >= 70) return "Bonne base, à affiner";
  if (score >= 50) return "Des corrections importantes";
  return "Technique à reconstruire";
}

/** Dimensions d'un JPEG lues dans le segment SOF (pur, sans dépendance). */
export function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (!buf || buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
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

const ratingClass = (r: Rating | Verdict | string) =>
  r === "bon" ? "ok" : r === "correct" ? "mid" : r === "à corriger" ? "bad" : "na";
const pill = (r: string) => `<span class="pill pill-${ratingClass(r)}">${esc(cap(r))}</span>`;
const romRating = (r: FormcheckAnalysis["range_of_motion"]["rating"]): Rating =>
  r === "complète" ? "bon" : r === "partielle" ? "correct" : r === "insuffisante" ? "à corriger" : "non évaluable";
const intensityRating = (p: FormcheckAnalysis["intensity"]["proximity_to_failure"]): Rating =>
  p === "non évaluable" ? "non évaluable" : p === "échec" ? "à corriger" : p === "loin" ? "correct" : "bon";

const majorNote = (n: number) => (n === 0 ? "Aucune erreur majeure" : n === 1 ? "Dont 1 majeure" : `Dont ${n} majeures`);

export function buildFormcheckReportHtml(input: ReportInput): string {
  const a = input.analysis;
  const framesByIndex = new Map(input.frames.map((f) => [f.index, f]));
  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(input.createdAt);
  const tempo = `${fmt(a.tempo.eccentric_s)} / ${fmt(a.tempo.pause_bottom_s)} / ${fmt(a.tempo.concentric_s)} / ${fmt(a.tempo.pause_top_s)}`;
  const rir = a.intensity.reps_in_reserve >= 0 ? `${a.intensity.reps_in_reserve} rep${a.intensity.reps_in_reserve > 1 ? "s" : ""} en réserve` : "Non évaluable";
  const at = (f: ReportFrame) => `${fmt(Number(f.timestampS.toFixed(1)))} s`;
  const list = (items: string[]) => (items.length ? `<ul>${items.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : `<p class="muted">Rien à signaler.</p>`);
  const header = `
  <div class="top">
    <div class="brand-wrap">
      <span class="logo-pill">${achzodLogoHtml({ markColor: C.yellow, textColor: "#FFFFFF", heightPx: 24 })}</span>
      <div class="brand">APEXLABS<span>FORMCHECK</span></div>
    </div>
    <div class="meta">${esc(input.exerciseLabel)} · ${esc(date)}<br/>Réf. ${esc(input.analysisId.slice(0, 8).toUpperCase())}</div>
  </div>`;
  const section = (kicker: string, title: string) => `<div class="section-head"><div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2></div>`;

  // ---------- 1. Synthèse ----------
  const metric = (label: string, value: string, note: string) => `
    <div class="metric"><div class="m-label">${esc(label)}</div><div class="m-value">${esc(value)}</div><div class="m-note">${esc(note)}</div></div>`;
  const bar = (label: string, value: number) => `
    <div class="bar-row"><div class="bar-label">${esc(label)}</div><div class="bar"><div class="bar-fill" style="width:${Math.max(2, Math.min(100, value))}%"></div></div><div class="bar-val">${value}</div></div>`;
  const correctionsHtml = a.priority_corrections.map((c, i) => `
    <div class="correction avoid-break">
      <div class="c-num">${i + 1}</div>
      <div><h3>${esc(c.title)}</h3><div class="cue">« ${esc(c.cue)} »</div><p>${esc(c.why)}</p></div>
    </div>`).join("");

  const synthese = `
  ${header}
  <div class="hero avoid-break">
    <div class="score"><div class="num">${a.score}<small>/100</small></div><div class="verdict">${esc(scoreVerdict(a.score))}</div></div>
    <div class="summary"><div class="kicker">Synthèse</div><h1>${esc(a.exercise_recognized || input.exerciseLabel)}</h1><p>${esc(a.summary)}</p></div>
  </div>
  <div class="bars avoid-break">
    ${bar("Mise en place", a.subscores.mise_en_place)}
    ${bar("Exécution", a.subscores.execution)}
    ${bar("Stabilité", a.subscores.stabilite)}
    ${bar("Contrôle", a.subscores.controle)}
  </div>
  <div class="metrics avoid-break">
    ${metric("Répétitions", String(a.reps_count), "Estimées sur la série")}
    ${metric("Tempo moyen (s)", tempo, "Descente · pause · montée · pause")}
    ${metric("Intensité", INTENSITY_LABEL[a.intensity.proximity_to_failure], rir)}
    ${metric("Amplitude", cap(a.range_of_motion.rating), "Sur l'ensemble des reps")}
    ${metric("Angle de vue", VIEW_LABEL[a.camera_view], `${input.frames.length} images analysées`)}
    ${metric("Erreurs repérées", String(a.errors.length), a.errors.length ? majorNote(a.errors.filter((e) => e.severity === "majeure").length) : "Aucune erreur notable")}
  </div>
  <div class="avoid-break">${section("Priorités", "Tes 3 corrections prioritaires")}${correctionsHtml}</div>`;

  // ---------- 2. Tableau de bord ----------
  const card = (label: string, rating: string, comment: string, extra = "", pillHtml = pill(rating)) => `
    <div class="crit avoid-break"><div class="crit-head"><span class="crit-label">${esc(label)}</span>${pillHtml}</div><p>${esc(comment || "Non visible sur cette vidéo.")}</p>${extra}</div>`;
  const dashboard = `
  <div class="page-break"></div>
  ${section("Tableau de bord", "Tous les critères, un par un")}
  <div class="crit-grid">
    ${card("Tempo", "", `En moyenne : ${fmt(a.tempo.eccentric_s)} s de descente, ${fmt(a.tempo.pause_bottom_s)} s de pause en bas, ${fmt(a.tempo.concentric_s)} s de montée et ${fmt(a.tempo.pause_top_s)} s de pause en haut.${a.tempo.reps.length ? " Le détail rep par rep est dans la partie Tempo et rythme." : ""}`, `<div class="crit-extra">Descente · pause · montée · pause : ${esc(tempo)} s</div>`, `<span class="pill pill-na">Estimé</span>`)}
    ${card("Rythme entre les reps", a.rhythm.rating, a.rhythm.comment)}
    ${card("Amplitude", romRating(a.range_of_motion.rating), a.range_of_motion.comment)}
    ${card("Symétrie", a.symmetry.rating, a.symmetry.comment)}
    ${card("Compensations", a.compensations.rating, a.compensations.comment, a.compensations.items.length ? `<ul class="tight">${a.compensations.items.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : "")}
    ${card("Intensité et proximité de l'échec", intensityRating(a.intensity.proximity_to_failure), a.intensity.comment, `<div class="crit-extra">${esc(INTENSITY_LABEL[a.intensity.proximity_to_failure])} · ${esc(rir)}${a.intensity.velocity_trend ? `<br/>Évolution : ${esc(a.intensity.velocity_trend)}` : ""}</div>`)}
    ${card("Trajectoire de la charge", a.bar_path.rating, a.bar_path.comment)}
    ${card("Gainage et position du dos", a.bracing.rating, a.bracing.comment)}
    ${card("Respiration", "", a.breathing.comment, "", `<span class="pill pill-${a.breathing.visible ? "mid" : "na"}">${a.breathing.visible ? "Visible" : "Non visible"}</span>`)}
    ${card("Tête et regard", a.head_position.rating, a.head_position.comment)}
    ${card("Pieds et appuis", a.feet.rating, a.feet.comment)}
  </div>`;

  // ---------- 3. Phases + tempo ----------
  const phaseRows = a.phases.map((p, i) => {
    const frame = framesByIndex.get(p.frame_index);
    return `
    <div class="phase avoid-break">
      ${frame ? `<figure class="phase-fig"><img src="${jpg(frame.jpeg)}" alt="${esc(PHASE_LABEL[p.phase])}"/><figcaption>${frame.index + 1} · ${at(frame)}</figcaption></figure>` : ""}
      <div class="phase-body">
        <div class="crit-head"><span class="phase-name"><span class="phase-num">${i + 1}</span>${esc(PHASE_LABEL[p.phase])}</span>${pill(p.verdict)}</div>
        <p>${esc(p.comment || "Cette phase n'est pas visible sur les images extraites.")}</p>
      </div>
    </div>`;
  }).join("");
  const repRows = a.tempo.reps.map((r) => `<tr><td class="nowrap">Rep ${r.rep}</td><td>${fmt(r.eccentric_s)} s</td><td>${fmt(r.concentric_s)} s</td><td>${fmt(r.pause_s)} s</td><td class="left">${esc(r.comment)}</td></tr>`).join("");
  const phasesHtml = `
  <div class="page-break"></div>
  ${section("Phase par phase", "Ton mouvement décortiqué")}
  <div class="phase-grid">${phaseRows}</div>
  <div class="avoid-break">
    ${section("Tempo", "Tempo et rythme, rep par rep")}
    <p>${esc(a.tempo.comment)}</p>
    ${repRows ? `<table class="tbl"><thead><tr><th>Rep</th><th>Descente</th><th>Montée</th><th>Pause</th><th class="left">Ce qu'on voit</th></tr></thead><tbody>${repRows}</tbody></table>
    <p class="muted small">Estimations à partir des images extraites à intervalle régulier : l'ordre de grandeur et les écarts entre les reps comptent plus que le dixième de seconde.</p>` : `<p class="muted">Les images ne permettent pas de suivre chaque rep séparément sur cette vidéo.</p>`}
  </div>`;

  // ---------- 4. Une page par erreur ----------
  const errorPages = a.errors.map((error, i) => {
    const frame = framesByIndex.get(error.frame_index);
    const image = input.errorImages?.[i] || (frame ? (frame.annotated || frame.jpeg) : null);
    const size = image ? jpegSize(image) : null;
    const vertical = size ? size.height > size.width * 1.05 : false;
    const sevClass = error.severity === "modérée" ? "moderee" : error.severity;
    const exercises = error.corrective_exercises.map((x) => `<tr><td class="left strong">${esc(x.name)}</td><td class="left">${esc(x.prescription)}</td><td class="left">${esc(x.why)}</td></tr>`).join("");
    const block = (title: string, body: string) => (body ? `<div class="eblock"><h4>${esc(title)}</h4><p>${esc(body)}</p></div>` : "");
    const textCol = `
        ${block("Ce qu'on voit", error.description)}
        ${block("Pourquoi c'est un problème", error.why)}
        ${block("Comment corriger", error.how_to_fix)}
        ${error.cues.length ? `<div class="eblock"><h4>Tes consignes pendant la série</h4><div class="cues">${error.cues.map((c) => `<span class="cue">« ${esc(c)} »</span>`).join("")}</div></div>` : ""}`;
    const img = image ? `<figure class="err-fig ${vertical ? "err-fig-v" : "err-fig-h"}"><img src="${jpg(image)}" alt="Erreur ${i + 1}"/>${frame ? `<figcaption>Image ${frame.index + 1} sur ${input.frames.length}, à ${at(frame)}</figcaption>` : ""}</figure>` : "";
    return `
  <div class="page-break"></div>
  <div class="err-head">
    <div class="err-badge">${i + 1}</div>
    <div>
      <div class="kicker">Erreur ${i + 1} sur ${a.errors.length} · ${esc(PHASE_LABEL[error.phase])}</div>
      <h2 class="err-title">${esc(error.title)}</h2>
    </div>
    <span class="sev sev-${esc(sevClass)}">${esc(error.severity)}</span>
  </div>
  ${vertical ? `<div class="err-cols">${img}<div class="err-text">${textCol}</div></div>` : `${img}<div class="err-text">${textCol}</div>`}
  ${exercises ? `<div class="avoid-break"><h4 class="h4-line">Exercices correctifs</h4><table class="tbl"><thead><tr><th class="left">Exercice</th><th class="left">Prescription</th><th class="left">Pourquoi</th></tr></thead><tbody>${exercises}</tbody></table></div>` : ""}
  ${error.progression ? `<div class="progression avoid-break"><h4>Progression</h4><p>${esc(error.progression)}</p></div>` : ""}`;
  }).join("");

  // ---------- 5. Points forts et consignes ----------
  const consignes = `
  <div class="page-break"></div>
  ${section("Ce qui marche", "Tes points forts")}
  <div class="strengths">${a.strengths.map((s) => `<div class="strength avoid-break"><span class="check">✓</span><span>${esc(s)}</span></div>`).join("") || `<p class="muted">À construire.</p>`}</div>
  <div class="cols">
    <div class="avoid-break">${section("Prochaine séance", "Tes consignes")}${list(a.next_session_cues)}</div>
    <div class="avoid-break">${section("Prochaine vidéo", "Pour une analyse encore plus précise")}${list(a.next_video_instructions)}</div>
  </div>`;

  // ---------- 6. Plan sur 4 semaines ----------
  const plan = a.plan_4_weeks.length ? `
  <div class="avoid-break">
  ${section("Plan de correction", "Tes 4 prochaines semaines")}
  <div class="weeks">
    ${a.plan_4_weeks.map((w) => `
    <div class="week avoid-break">
      <div class="week-head"><span class="week-num">S${w.week}</span><span class="week-focus">${esc(w.focus)}</span></div>
      ${list(w.actions)}
      ${w.load_advice ? `<div class="load"><strong>Charge :</strong> ${esc(w.load_advice)}</div>` : ""}
    </div>`).join("")}
  </div>
  </div>` : "";

  // ---------- 7. Série image par image ----------
  const strip = input.frames.map((f) => `<figure><img src="${jpg(f.jpeg)}" alt="Image ${f.index + 1}"/><figcaption>${f.index + 1} · ${at(f)}</figcaption></figure>`).join("");
  const stripHtml = `
  <div class="avoid-break">${section("Vue d'ensemble", "La série image par image")}<div class="strip${input.frames.length > 14 ? " strip-dense" : ""}">${strip}</div></div>
  <div class="safety">${esc(a.safety_note)} Analyse générée automatiquement à partir d'images extraites de ta vidéo, sous la méthode Achzod. Elle porte uniquement sur la technique et ne constitue ni un diagnostic, ni un avis médical.</div>`;

  // ---------- 8. CTA coaching ----------
  const cta = `
  <div class="page-break"></div>
  <div class="cta">
    <div class="cta-brand">${achzodLogoHtml({ markColor: C.yellow, textColor: "#FFFFFF", heightPx: 40 })}<span>COACHING</span></div>
    <div class="cta-kicker">Et maintenant ?</div>
    <h2 class="cta-title">Tu sais quoi corriger.<br/>Avec moi, tu le corriges pour de bon.</h2>
    <p class="cta-lead">Ce rapport te montre tes erreurs sur une série. Le coaching Achzod, c'est un programme construit pour toi, ta technique suivie dans le temps et des ajustements réguliers, jusqu'à ce que chaque correction devienne automatique sous la charge.</p>
    <div class="cta-points">
      <div><span>01</span>Un programme sur mesure, construit autour de tes points faibles techniques.</div>
      <div><span>02</span>Un suivi régulier pour vérifier que les corrections tiennent quand la charge monte.</div>
      <div><span>03</span>Entraînement, nutrition et récupération ajustés à ta progression.</div>
    </div>
    <div class="cta-start">
      <div class="cta-score"><div class="cs-num">${a.score}<small>/100</small></div><div class="cs-label">Ton point de départ</div></div>
      <div class="cta-prio">
        <div class="cp-title">Ce qu'on attaque en premier ensemble</div>
        ${a.priority_corrections.map((c, i) => `<div class="cp-row"><span>${i + 1}</span>${esc(c.title)}</div>`).join("")}
      </div>
    </div>
    <div class="formulas">
      ${COACHING_FORMULAS.map((f) => `
      <a class="formula" href="${esc(f.href)}">
        <div class="f-name">${esc(f.name)}</div>
        <div class="f-dur">${esc(f.durations)}</div>
        <p>${esc(f.description)}</p>
        <div class="f-link">Voir la formule</div>
      </a>`).join("")}
    </div>
    <a class="cta-button" href="${COACHING_URL}">Passe au coaching Achzod : achzodcoaching.com</a>
    <p class="cta-foot">Garde ce rapport : il servira de point de départ à ton suivi. Analyse technique uniquement, sans diagnostic médical.</p>
  </div>`;

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/><title>FormCheck : ${esc(input.exerciseLabel)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Helvetica Neue", Helvetica, Arial, "DejaVu Sans", sans-serif; color: ${C.ink}; background: ${C.paper}; font-size: 10.5pt; line-height: 1.45; }
  h1, h2, h3, h4 { margin: 0; color: ${C.black}; }
  h2 { font-size: 16pt; margin: 2px 0 10px; padding-bottom: 5px; border-bottom: 3px solid ${C.yellow}; display: inline-block; }
  h3 { font-size: 11pt; margin-bottom: 3px; }
  h4 { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
  p { margin: 0 0 6px; }
  .section-head { margin-top: 18px; break-after: avoid; page-break-after: avoid; }
  .kicker { font-size: 8pt; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${C.muted}; }
  .muted { color: ${C.muted}; } .small { font-size: 8.5pt; }
  .page-break { break-before: page; page-break-before: always; height: 0; }
  .top { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid ${C.line}; }
  .brand-wrap { display: flex; align-items: center; gap: 12px; }
  .logo-pill { display: inline-flex; align-items: center; background: ${C.black}; border-radius: 6px; padding: 6px 10px; }
  .brand { font-weight: 900; letter-spacing: 0.08em; font-size: 12pt; }
  .brand span { background: ${C.yellow}; padding: 2px 6px; margin-left: 6px; }
  .meta { color: ${C.muted}; font-size: 9pt; text-align: right; }
  .hero { display: flex; gap: 16px; align-items: stretch; margin-top: 16px; }
  .score { min-width: 150px; background: ${C.yellow}; color: ${C.black}; padding: 16px; text-align: center; border-radius: 6px; display: flex; flex-direction: column; justify-content: center; }
  .score .num { font-size: 46pt; font-weight: 900; line-height: 1; }
  .score .num small { font-size: 14pt; }
  .score .verdict { font-weight: 800; font-size: 10pt; margin-top: 6px; }
  .summary { flex: 1; background: ${C.soft}; border-radius: 6px; padding: 14px 16px; }
  .summary h1 { font-size: 18pt; margin: 2px 0 6px; }
  .bars { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 22px; }
  .bar-row { display: flex; align-items: center; gap: 8px; }
  .bar-label { width: 104px; white-space: nowrap; font-size: 9pt; font-weight: 700; }
  .bar { flex: 1; height: 10px; background: ${C.soft}; border: 1px solid ${C.line}; border-radius: 5px; overflow: hidden; }
  .bar-fill { height: 100%; background: ${C.yellow}; border-right: 2px solid ${C.black}; }
  .bar-val { width: 26px; text-align: right; font-weight: 800; font-size: 9.5pt; }
  .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 14px; }
  .metric { border: 1px solid ${C.line}; border-radius: 6px; padding: 9px 10px; }
  .m-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.06em; color: ${C.muted}; }
  .m-value { font-size: 12.5pt; font-weight: 800; color: ${C.black}; }
  .m-note { font-size: 8.5pt; color: ${C.muted}; }
  .correction { display: flex; gap: 12px; padding: 9px 0; border-bottom: 1px solid ${C.line}; }
  .c-num { flex: 0 0 30px; height: 30px; border-radius: 50%; background: ${C.black}; color: ${C.yellow}; font-weight: 900; display: flex; align-items: center; justify-content: center; }
  .cue { font-weight: 700; background: #FFF8C2; display: inline-block; padding: 2px 7px; margin: 2px 6px 4px 0; border-left: 3px solid ${C.yellow}; }
  .pill { font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 8px; border-radius: 10px; white-space: nowrap; }
  .pill-ok { background: #DDF3E4; color: #17603A; }
  .pill-mid { background: #FFF3C4; color: #6B5300; }
  .pill-bad { background: #FDE2E2; color: #9B1C1C; }
  .pill-na { background: ${C.soft}; color: ${C.muted}; border: 1px solid ${C.line}; }
  .crit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .crit { border: 1px solid ${C.line}; border-left: 4px solid ${C.yellow}; border-radius: 6px; padding: 7px 10px; }
  .crit p { font-size: 9pt; line-height: 1.38; margin: 3px 0 0; }
  .crit-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .crit-label { font-weight: 800; font-size: 10pt; color: ${C.black}; }
  .crit-extra { font-size: 8.5pt; color: ${C.muted}; margin-top: 4px; }
  ul { margin: 4px 0 0 18px; padding: 0; } li { margin-bottom: 4px; }
  ul.tight { font-size: 9pt; margin-top: 4px; } ul.tight li { margin-bottom: 1px; }
  .phase-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .phase { display: flex; gap: 10px; padding: 8px 10px; border: 1px solid ${C.line}; border-radius: 6px; }
  .phase-fig { margin: 0; flex: 0 0 66px; }
  .phase-fig figcaption { white-space: nowrap; }
  .phase-fig img { width: 66px; height: 88px; object-fit: cover; border-radius: 4px; display: block; background: ${C.soft}; }
  .phase-fig figcaption, .err-fig figcaption { font-size: 7.5pt; color: ${C.muted}; text-align: center; margin-top: 2px; }
  .phase-body { flex: 1; } .phase-body p { margin-top: 4px; font-size: 9pt; line-height: 1.38; }
  .phase-name { font-weight: 800; font-size: 10.5pt; color: ${C.black}; display: inline-flex; align-items: center; gap: 8px; }
  .phase-num { width: 22px; height: 22px; border-radius: 50%; background: ${C.yellow}; border: 2px solid ${C.black}; display: inline-flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: 900; }
  .tbl { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 4px; }
  .tbl th { background: ${C.yellow}; color: ${C.black}; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.05em; padding: 5px 6px; text-align: center; }
  .tbl td { border-bottom: 1px solid ${C.line}; padding: 5px 6px; text-align: center; vertical-align: top; }
  .tbl .left { text-align: left; } .tbl .nowrap { white-space: nowrap; } .tbl .strong { font-weight: 800; color: ${C.black}; }
  .err-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .err-head > div:nth-child(2) { flex: 1; }
  .err-badge { flex: 0 0 40px; height: 40px; border-radius: 50%; background: ${C.yellow}; border: 3px solid ${C.black}; font-weight: 900; font-size: 16pt; display: flex; align-items: center; justify-content: center; }
  .err-title { border: none; padding: 0; margin: 2px 0 0; font-size: 17pt; }
  .sev { font-size: 8pt; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; padding: 4px 8px; border-radius: 3px; background: ${C.soft}; }
  .sev-majeure { background: #FDE2E2; color: #9B1C1C; }
  .sev-moderee { background: #FFF3C4; color: #6B5300; }
  .err-cols { display: flex; gap: 14px; align-items: flex-start; }
  .err-fig { margin: 0 0 10px; }
  .err-fig img { display: block; border-radius: 5px; border: 1px solid ${C.line}; background: ${C.soft}; }
  .err-fig-v { flex: 0 0 43%; } .err-fig-v img { width: 100%; max-height: 150mm; object-fit: contain; }
  .err-fig-h img { width: 100%; max-height: 100mm; object-fit: contain; }
  .err-text { flex: 1; }
  .eblock { margin-bottom: 9px; } .eblock p { font-size: 10pt; }
  .eblock h4 { color: ${C.black}; border-bottom: 2px solid ${C.yellow}; display: inline-block; padding-bottom: 1px; }
  .h4-line { margin-top: 6px; }
  .progression { margin-top: 10px; background: ${C.soft}; border-left: 4px solid ${C.yellow}; border-radius: 4px; padding: 9px 12px; }
  .progression p { margin: 3px 0 0; font-size: 10pt; }
  .strengths { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .strength { display: flex; gap: 8px; align-items: flex-start; border: 1px solid ${C.line}; border-radius: 6px; padding: 8px 10px; font-size: 10pt; }
  .check { flex: 0 0 20px; height: 20px; border-radius: 50%; background: ${C.yellow}; font-weight: 900; display: inline-flex; align-items: center; justify-content: center; font-size: 10pt; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .weeks { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .week { border: 1px solid ${C.line}; border-radius: 6px; padding: 10px 12px; }
  .week-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .week-num { background: ${C.yellow}; border: 2px solid ${C.black}; font-weight: 900; font-size: 10pt; padding: 2px 7px; border-radius: 4px; }
  .week-focus { font-weight: 800; color: ${C.black}; font-size: 10.5pt; }
  .week ul { font-size: 9.5pt; }
  .load { font-size: 9pt; margin-top: 6px; padding-top: 6px; border-top: 1px dashed ${C.line}; }
  .strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
  .strip figure { margin: 0; } .strip img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; border-radius: 3px; display: block; }
  .strip-dense { grid-template-columns: repeat(10, 1fr); gap: 4px; }
  .strip-dense figcaption { font-size: 6.5pt; }
  .strip figcaption { font-size: 7pt; color: ${C.muted}; text-align: center; }
  .safety { margin-top: 16px; font-size: 8.5pt; color: ${C.muted}; border-top: 1px solid ${C.line}; padding-top: 8px; }
  .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  .cta { background: ${C.black}; color: #FFFFFF; border-radius: 10px; padding: 26px 28px; min-height: 262mm; display: flex; flex-direction: column; }
  .cta-brand { display: flex; align-items: center; gap: 12px; }
  .cta-brand > span:last-child { background: ${C.yellow}; color: ${C.black}; font-weight: 900; letter-spacing: 0.12em; font-size: 11pt; padding: 3px 8px; }
  .cta-kicker { margin-top: 26px; color: ${C.yellow}; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; font-size: 9pt; }
  .cta-title { color: #FFFFFF; border: none; font-size: 23pt; line-height: 1.15; margin: 8px 0 14px; padding: 0; }
  .cta-lead { font-size: 11.5pt; color: #E8E8E8; line-height: 1.55; }
  .cta-points { margin: 14px 0 18px; display: grid; gap: 8px; }
  .cta-points div { display: flex; gap: 12px; align-items: baseline; font-size: 10.5pt; color: #F2F2F2; }
  .cta-points span { color: ${C.yellow}; font-weight: 900; font-size: 12pt; }
  .cta-start { display: flex; gap: 16px; align-items: stretch; margin: 4px 0 20px; border: 1px solid #333333; border-radius: 8px; padding: 14px; }
  .cta-score { flex: 0 0 120px; background: ${C.yellow}; color: ${C.black}; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; }
  .cs-num { font-size: 30pt; font-weight: 900; line-height: 1; } .cs-num small { font-size: 11pt; }
  .cs-label { font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 6px; text-align: center; }
  .cta-prio { flex: 1; }
  .cp-title { color: ${C.yellow}; font-weight: 800; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
  .cp-row { display: flex; gap: 10px; align-items: center; color: #FFFFFF; font-size: 11pt; font-weight: 700; padding: 5px 0; border-bottom: 1px solid #2A2A2A; }
  .cp-row span { width: 22px; height: 22px; border-radius: 50%; border: 2px solid ${C.yellow}; color: ${C.yellow}; display: inline-flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: 900; flex: 0 0 22px; }
  .formulas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .formula { display: block; text-decoration: none; border: 2px solid ${C.yellow}; border-radius: 8px; padding: 12px; color: #FFFFFF; }
  .f-name { font-size: 14pt; font-weight: 900; color: ${C.yellow}; }
  .f-dur { font-size: 8.5pt; color: #BDBDBD; margin-bottom: 6px; }
  .formula p { font-size: 9.5pt; color: #EDEDED; margin: 0 0 8px; }
  .f-link { font-size: 8.5pt; font-weight: 800; color: ${C.yellow}; text-transform: uppercase; letter-spacing: 0.06em; }
  .cta-button { display: block; margin-top: 22px; background: ${C.yellow}; color: ${C.black}; text-align: center; font-weight: 900; font-size: 14pt; padding: 15px 10px; border-radius: 8px; text-decoration: none; }
  .cta-foot { margin-top: auto; padding-top: 16px; font-size: 9pt; color: #A8A8A8; }
</style></head>
<body>
  ${synthese}
  ${dashboard}
  ${phasesHtml}
  ${errorPages}
  ${consignes}
  ${plan}
  ${stripHtml}
  ${cta}
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
