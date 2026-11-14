/**
 * FormCheck V2 : prompt, schéma JSON strict, normalisation et décision.
 * L'appel réseau est isolé dans runFormcheckVisionAnalysis (injectable pour les tests).
 */
import { estimateFormcheckCostUsd, getFormcheckMinConfidence, getFormcheckModel, getFormcheckReasoningEffort } from "./config";

export type AnnotationType = "circle" | "line" | "angle" | "arrow";

export interface FormcheckPoint { x: number; y: number }

export interface FormcheckAnnotation {
  type: AnnotationType;
  points: FormcheckPoint[];
  radius: number;
  label: string;
}

export const PHASE_KEYS = ["mise_en_place", "depart", "milieu", "verrouillage", "descente"] as const;
export type PhaseKey = typeof PHASE_KEYS[number];
export const PHASE_LABEL: Record<PhaseKey | "toute_la_serie", string> = {
  mise_en_place: "Mise en place",
  depart: "Départ",
  milieu: "Milieu du mouvement",
  verrouillage: "Verrouillage",
  descente: "Descente",
  toute_la_serie: "Toute la série",
};

export const VERDICTS = ["bon", "correct", "à corriger", "non visible"] as const;
export type Verdict = typeof VERDICTS[number];

export const RATINGS = ["bon", "correct", "à corriger", "non évaluable"] as const;
export type Rating = typeof RATINGS[number];

export interface FormcheckCriterion { rating: Rating; comment: string }

export interface FormcheckPhase {
  phase: PhaseKey;
  verdict: Verdict;
  frame_index: number;
  comment: string;
}

export interface FormcheckRepTempo {
  rep: number;
  eccentric_s: number;
  concentric_s: number;
  pause_s: number;
  comment: string;
}

export interface FormcheckExercise { name: string; prescription: string; why: string }

export interface FormcheckError {
  title: string;
  severity: "mineure" | "modérée" | "majeure";
  phase: PhaseKey | "toute_la_serie";
  frame_index: number;
  description: string;
  why: string;
  how_to_fix: string;
  cues: string[];
  corrective_exercises: FormcheckExercise[];
  progression: string;
  annotations: FormcheckAnnotation[];
}

export interface FormcheckWeek { week: number; focus: string; actions: string[]; load_advice: string }

/** Exercice identifié par le modèle à partir des images (le client ne le choisit pas). */
export interface FormcheckDetectedExercise {
  /** Nom usuel en français, variante comprise (ex. « Soulevé de terre sur blocs »). */
  name_fr: string;
  /** false si aucun exercice de musculation n'est reconnu sur les images. */
  is_strength_exercise: boolean;
}

export interface FormcheckAnalysis {
  exploitable: boolean;
  rejection_reason: string;
  exercise_detected: FormcheckDetectedExercise;
  camera_view: "profil" | "face" | "dos" | "trois_quarts" | "autre";
  confidence: number;
  reps_count: number;
  score: number;
  subscores: { mise_en_place: number; execution: number; stabilite: number; controle: number };
  summary: string;
  phases: FormcheckPhase[];
  tempo: {
    eccentric_s: number; pause_bottom_s: number; concentric_s: number; pause_top_s: number; comment: string;
    reps: FormcheckRepTempo[];
  };
  rhythm: FormcheckCriterion;
  range_of_motion: { rating: "complète" | "partielle" | "insuffisante" | "non évaluable"; comment: string };
  symmetry: { assessable: boolean; rating: Rating; comment: string };
  compensations: { rating: Rating; items: string[]; comment: string };
  intensity: { reps_in_reserve: number; proximity_to_failure: "loin" | "modérée" | "proche" | "échec" | "non évaluable"; velocity_trend: string; comment: string };
  bar_path: FormcheckCriterion;
  bracing: FormcheckCriterion;
  breathing: { visible: boolean; comment: string };
  head_position: FormcheckCriterion;
  feet: FormcheckCriterion;
  errors: FormcheckError[];
  strengths: string[];
  priority_corrections: Array<{ title: string; cue: string; why: string }>;
  plan_4_weeks: FormcheckWeek[];
  next_session_cues: string[];
  next_video_instructions: string[];
  safety_note: string;
}

const str = { type: "string" } as const;
const num = { type: "number" } as const;
const int = { type: "integer" } as const;
const strArr = { type: "array", items: str } as const;
const en = (values: readonly string[]) => ({ type: "string", enum: [...values] });
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
});
const criterion = () => obj({ rating: en(RATINGS), comment: str });

export const FORMCHECK_ANALYSIS_SCHEMA = obj({
  exploitable: { type: "boolean" },
  rejection_reason: str,
  exercise_detected: obj({ name_fr: str, is_strength_exercise: { type: "boolean" } }),
  camera_view: en(["profil", "face", "dos", "trois_quarts", "autre"]),
  confidence: num,
  reps_count: int,
  score: int,
  subscores: obj({ mise_en_place: int, execution: int, stabilite: int, controle: int }),
  summary: str,
  phases: {
    type: "array",
    items: obj({ phase: en(PHASE_KEYS), verdict: en(VERDICTS), frame_index: int, comment: str }),
  },
  tempo: obj({
    eccentric_s: num, pause_bottom_s: num, concentric_s: num, pause_top_s: num, comment: str,
    reps: { type: "array", items: obj({ rep: int, eccentric_s: num, concentric_s: num, pause_s: num, comment: str }) },
  }),
  rhythm: criterion(),
  range_of_motion: obj({ rating: en(["complète", "partielle", "insuffisante", "non évaluable"]), comment: str }),
  symmetry: obj({ assessable: { type: "boolean" }, rating: en(RATINGS), comment: str }),
  compensations: obj({ rating: en(RATINGS), items: strArr, comment: str }),
  intensity: obj({
    reps_in_reserve: int,
    proximity_to_failure: en(["loin", "modérée", "proche", "échec", "non évaluable"]),
    velocity_trend: str,
    comment: str,
  }),
  bar_path: criterion(),
  bracing: criterion(),
  breathing: obj({ visible: { type: "boolean" }, comment: str }),
  head_position: criterion(),
  feet: criterion(),
  errors: {
    type: "array",
    items: obj({
      title: str,
      severity: en(["mineure", "modérée", "majeure"]),
      phase: en([...PHASE_KEYS, "toute_la_serie"]),
      frame_index: int,
      description: str,
      why: str,
      how_to_fix: str,
      cues: strArr,
      corrective_exercises: { type: "array", items: obj({ name: str, prescription: str, why: str }) },
      progression: str,
      annotations: {
        type: "array",
        items: obj({
          type: en(["circle", "line", "angle", "arrow"]),
          points: { type: "array", items: obj({ x: num, y: num }) },
          radius: num,
          label: str,
        }),
      },
    }),
  },
  strengths: strArr,
  priority_corrections: { type: "array", items: obj({ title: str, cue: str, why: str }) },
  plan_4_weeks: { type: "array", items: obj({ week: int, focus: str, actions: strArr, load_advice: str }) },
  next_session_cues: strArr,
  next_video_instructions: strArr,
  safety_note: str,
});

export const FORMCHECK_INSTRUCTIONS = [
  "Tu es Achzod, coach en musculation certifié, et tu fais une analyse technique complète (form check) à partir d'images extraites d'une vidéo.",
  "Tu tutoies le client, ton direct et concret de coach, phrases courtes, précises, zéro blabla. Français correct et accentué. Pas de tiret long.",
  "Ton rapport doit être exhaustif : tempo, rythme entre les reps, symétrie, compensations, intensité et proximité de l'échec, chaque phase du mouvement, trajectoire de la charge, gainage, respiration, tête, pieds. Chaque erreur est expliquée (pourquoi c'est un problème) et corrigée (consignes, exercices correctifs, progression).",
  "Tu analyses uniquement ce qui est visible sur les images. Tu n'inventes rien. Si un critère n'est pas visible (angle de caméra, cadrage, images trop espacées), tu le dis clairement et tu mets la note non évaluable ou non visible.",
  "Interdit : tout diagnostic médical, toute hypothèse de blessure ou de pathologie, toute prescription médicale. Tu parles de technique, de placement, de trajectoire, de tempo et de programmation. Tu peux dire qu'une erreur augmente les contraintes sur une zone, sans jamais parler de lésion.",
  "Tu réponds uniquement avec le JSON du schéma fourni.",
].join("\n");

export function buildFormcheckPrompt(input: {
  frameTimestamps: number[];
  durationS: number;
}): string {
  const last = input.frameTimestamps.length - 1;
  const frames = input.frameTimestamps
    .map((t, i) => `frame ${i} = ${t.toFixed(1)} s`)
    .join(", ");
  return `Le client n'indique pas l'exercice : c'est à toi de l'identifier à partir des images.
Vidéo d'une série, durée ${input.durationS.toFixed(1)} s. ${input.frameTimestamps.length} images extraites dans l'ordre chronologique, à intervalle régulier (${frames}).

Règles :
1. exploitable = false si on ne peut pas juger la technique : personne absente ou coupée (pieds, barre ou articulations clés hors cadre), image trop sombre ou floue, caméra qui bouge trop, plusieurs séries ou plusieurs personnes, pas d'exercice de musculation. Dans ce cas, rejection_reason explique en une ou deux phrases quoi refilmer et comment (cadrage, distance, angle, lumière), et le reste peut rester minimal. Sinon rejection_reason = "".
2. exercise_detected : identifie toi-même l'exercice filmé. name_fr = son nom usuel en français, avec la variante visible (par exemple : Squat barre haute, Développé couché, Soulevé de terre sumo, Hip thrust, Rowing barre, Squat bulgare), sans anglicisme quand un nom français existe. is_strength_exercise = false si aucun exercice de musculation n'est reconnu (pas de mouvement, autre sport, étirement, vidéo sans rapport) : dans ce cas name_fr = "", exploitable = false et rejection_reason dit ce qu'il faut filmer. Base toute la suite de l'analyse sur l'exercice que tu as identifié.
3. confidence entre 0 et 1 : ta confiance globale dans l'analyse (cadrage, netteté, nombre d'images utiles).
4. reps_count : nombre de répétitions estimé (repère les positions hautes et basses dans les images et leurs horodatages).
5. score sur 100 de la qualité technique de la série. subscores sur 100 : mise_en_place (placement avant de bouger), execution (trajectoire et positions pendant les reps), stabilite (gainage, pieds, symétrie), controle (tempo, régularité, descente). summary : 3 à 4 phrases de verdict, en tutoyant : ce qui va, le problème principal, la priorité.
6. phases : exactement 5 entrées, une par phase dans cet ordre : mise_en_place (pieds, prise, position de départ, tension avant de bouger), depart (premier centimètre, décollage ou initiation), milieu (passage du point difficile, genoux, hanches), verrouillage (position finale), descente (retour de la charge, contrôle). verdict : bon, correct, à corriger ou non visible. frame_index = l'image qui illustre le mieux cette phase. comment : 2 à 4 phrases précises sur ce que tu vois et ce qu'il faut garder ou changer.
7. tempo : moyennes en secondes (excentrique, pause basse, concentrique, pause haute), estimées à partir des horodatages. tempo.reps : une entrée par répétition que tu peux suivre (rep 1, 2, 3...), avec excentrique, concentrique et pause entre les reps (pause_s) estimés, et un court commentaire (vitesse qui chute, rebond, pause trop longue...). Si les images sont trop espacées pour une rep, estime au mieux et dis-le dans le commentaire. comment : 2 à 3 phrases.
8. rhythm : régularité entre les reps (pauses, reset, enchaînement). range_of_motion : amplitude. symmetry : assessable = false si la vue ne permet pas de juger (vue de profil stricte), rating et comment. compensations : items = liste courte des compensations vues (0 à 5, par exemple hanches qui montent avant les épaules, bascule du bassin, épaules qui partent devant), rating et comment.
9. intensity : reps_in_reserve estimé (-1 si non évaluable), proximity_to_failure, velocity_trend (comment la vitesse évolue de la première à la dernière rep), comment.
10. bar_path : trajectoire de la barre ou de la charge (verticalité, distance au corps, dérive). bracing : gainage et position du tronc et du dos. breathing : visible = false si on ne peut pas juger la respiration sur des images fixes, et dans ce cas comment donne quand même la consigne de respiration à appliquer sur cet exercice. head_position : tête et regard. feet : placement, écartement, appuis, talons. Pour chacun, rating (bon, correct, à corriger, non évaluable) et comment de 2 à 3 phrases.
11. errors : 0 à 6 erreurs techniques réelles, de la plus importante à la moins importante. Pour chaque erreur :
   - title court, severity, phase où elle apparaît (ou toute_la_serie) ;
   - frame_index = l'image où l'erreur se voit le mieux (0 à ${last}) ;
   - description : ce qu'on voit, précisément (2 à 3 phrases) ;
   - why : pourquoi c'est un problème (performance, transfert de charge, contraintes sur une zone, efficacité), 2 à 3 phrases, sans diagnostic ;
   - how_to_fix : comment corriger, concrètement (placement, intention, réglage de charge), 2 à 4 phrases ;
   - cues : 2 ou 3 consignes très courtes à se répéter pendant la série ;
   - corrective_exercises : 2 ou 3 exercices correctifs, chacun avec name, prescription (séries, reps, tempo ou durée, quand le placer dans la séance) et why ;
   - progression : comment progresser sur 2 à 4 semaines jusqu'à corriger l'erreur avec la charge de travail ;
   - annotations : 1 à 3 formes sobres sur cette image en coordonnées relatives (x et y entre 0 et 1, origine en haut à gauche), placées exactement sur la zone concernée :
     * circle : points = [centre], radius = rayon relatif à la largeur (0.04 à 0.15), pour entourer une zone (genou, bas du dos, coude...)
     * line : points = [début, fin], pour une trajectoire ou un alignement (barre, tibia, dos)
     * angle : points = [point A, sommet, point B], pour un angle articulaire (hanche, genou, coude)
     * arrow : points = [départ, arrivée], pour la correction à faire
     label : 1 à 3 mots. Mets radius = 0 si ce n'est pas un cercle.
12. strengths : 3 à 5 points forts réels et précis.
13. priority_corrections : exactement 3 corrections prioritaires, chacune avec un titre, une consigne courte à se répéter pendant la série (cue) et le pourquoi.
14. plan_4_weeks : exactement 4 semaines (week 1 à 4). focus : l'objectif de la semaine. actions : 3 ou 4 actions concrètes (exercices correctifs, travail technique à charge réduite, tempo imposé, filmer une série). load_advice : la consigne de charge (pourcentage de ta charge actuelle ou effort en reps en réserve).
15. next_session_cues : 3 à 5 consignes concrètes pour la prochaine séance (échauffement, charge, tempo, placement).
16. next_video_instructions : 3 à 5 consignes pour filmer la prochaine vidéo afin d'avoir une analyse encore plus précise (angle, hauteur, distance, cadrage, lumière, nombre de reps).
17. safety_note : une phrase de prudence (pas de diagnostic, consulter un professionnel de santé en cas de douleur).`;
}

// ---------------------------------------------------------------------------
// Normalisation défensive : le modèle peut se tromper, le PDF ne doit jamais casser.
// ---------------------------------------------------------------------------

const clamp = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const text = (v: unknown, max = 600): string => String(v ?? "").replace(/\s*[\u2013\u2014]\s*/g, ", ").replace(/ ,/g, ",").trim().slice(0, max);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(String(v)) ? (v as T) : fallback;
const list = (v: unknown, maxItems: number, maxLen: number): string[] =>
  (Array.isArray(v) ? v : []).map((s) => text(s, maxLen)).filter(Boolean).slice(0, maxItems);
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const crit = (v: any): FormcheckCriterion => ({
  rating: oneOf(v?.rating, RATINGS, "non évaluable"),
  comment: text(v?.comment, 600),
});

function normalizeAnnotations(raw: unknown): FormcheckAnnotation[] {
  return arr(raw).slice(0, 3).map((a: any) => ({
    type: oneOf(a?.type, ["circle", "line", "angle", "arrow"] as const, "circle"),
    points: arr(a?.points).slice(0, 3).map((p: any) => ({
      x: clamp(p?.x, 0, 1, 0.5),
      y: clamp(p?.y, 0, 1, 0.5),
    })),
    radius: clamp(a?.radius, 0, 0.3, 0.06),
    label: text(a?.label, 32),
  })).filter((a: FormcheckAnnotation) => {
    const needed = a.type === "circle" ? 1 : a.type === "angle" ? 3 : 2;
    return a.points.length >= needed;
  });
}

export function normalizeFormcheckAnalysis(raw: any, frameCount: number): FormcheckAnalysis {
  const lastFrame = Math.max(0, frameCount - 1);
  const frameIndex = (v: unknown) => Math.round(clamp(v, 0, lastFrame, 0));
  const score = Math.round(clamp(raw?.score, 0, 100, 0));
  const sub = (v: unknown) => Math.round(clamp(v, 0, 100, score));

  const errors: FormcheckError[] = arr(raw?.errors).slice(0, 6).map((e: any) => ({
    title: text(e?.title, 120),
    severity: oneOf(e?.severity, ["mineure", "modérée", "majeure"] as const, "modérée"),
    phase: oneOf(e?.phase, [...PHASE_KEYS, "toute_la_serie"] as const, "toute_la_serie"),
    frame_index: frameIndex(e?.frame_index),
    description: text(e?.description, 900),
    why: text(e?.why, 900),
    how_to_fix: text(e?.how_to_fix, 1000),
    cues: list(e?.cues, 3, 140),
    corrective_exercises: arr(e?.corrective_exercises).map((x: any) => ({
      name: text(x?.name, 100),
      prescription: text(x?.prescription, 240),
      why: text(x?.why, 300),
    })).filter((x: FormcheckExercise) => x.name).slice(0, 3),
    progression: text(e?.progression, 700),
    annotations: normalizeAnnotations(e?.annotations),
  })).filter((e: FormcheckError) => e.title);

  // Une entrée par phase, dans l'ordre, même si le modèle en oublie ou en duplique.
  const rawPhases = arr(raw?.phases);
  const phases: FormcheckPhase[] = PHASE_KEYS.map((key) => {
    const p = rawPhases.find((x: any) => x?.phase === key);
    return {
      phase: key,
      verdict: oneOf(p?.verdict, VERDICTS, "non visible"),
      frame_index: frameIndex(p?.frame_index),
      comment: text(p?.comment, 700),
    };
  });

  const corrections = arr(raw?.priority_corrections)
    .map((c: any) => ({ title: text(c?.title, 120), cue: text(c?.cue, 200), why: text(c?.why, 400) }))
    .filter((c: { title: string }) => c.title)
    .slice(0, 3);

  const weeks: FormcheckWeek[] = arr(raw?.plan_4_weeks).slice(0, 4).map((w: any, i: number) => ({
    week: i + 1,
    focus: text(w?.focus, 160),
    actions: list(w?.actions, 4, 260),
    load_advice: text(w?.load_advice, 260),
  })).filter((w: FormcheckWeek) => w.focus || w.actions.length);

  const tempoReps: FormcheckRepTempo[] = arr(raw?.tempo?.reps).slice(0, 30).map((r: any, i: number) => ({
    rep: Math.round(clamp(r?.rep, 1, 100, i + 1)),
    eccentric_s: clamp(r?.eccentric_s, 0, 20, 0),
    concentric_s: clamp(r?.concentric_s, 0, 20, 0),
    pause_s: clamp(r?.pause_s, 0, 30, 0),
    comment: text(r?.comment, 200),
  }));

  const symmetryAssessable = raw?.symmetry?.assessable === true;

  return {
    exploitable: raw?.exploitable === true,
    rejection_reason: text(raw?.rejection_reason, 500),
    exercise_detected: {
      name_fr: text(raw?.exercise_detected?.name_fr, 80),
      is_strength_exercise: raw?.exercise_detected?.is_strength_exercise === true,
    },
    camera_view: oneOf(raw?.camera_view, ["profil", "face", "dos", "trois_quarts", "autre"] as const, "autre"),
    confidence: clamp(raw?.confidence, 0, 1, 0),
    reps_count: Math.round(clamp(raw?.reps_count, 0, 100, 0)),
    score,
    subscores: {
      mise_en_place: sub(raw?.subscores?.mise_en_place),
      execution: sub(raw?.subscores?.execution),
      stabilite: sub(raw?.subscores?.stabilite),
      controle: sub(raw?.subscores?.controle),
    },
    summary: text(raw?.summary, 900),
    phases,
    tempo: {
      eccentric_s: clamp(raw?.tempo?.eccentric_s, 0, 20, 0),
      pause_bottom_s: clamp(raw?.tempo?.pause_bottom_s, 0, 20, 0),
      concentric_s: clamp(raw?.tempo?.concentric_s, 0, 20, 0),
      pause_top_s: clamp(raw?.tempo?.pause_top_s, 0, 20, 0),
      comment: text(raw?.tempo?.comment, 600),
      reps: tempoReps,
    },
    rhythm: crit(raw?.rhythm),
    range_of_motion: {
      rating: oneOf(raw?.range_of_motion?.rating, ["complète", "partielle", "insuffisante", "non évaluable"] as const, "non évaluable"),
      comment: text(raw?.range_of_motion?.comment, 600),
    },
    symmetry: {
      assessable: symmetryAssessable,
      rating: symmetryAssessable ? oneOf(raw?.symmetry?.rating, RATINGS, "correct") : "non évaluable",
      comment: text(raw?.symmetry?.comment, 600),
    },
    compensations: {
      rating: oneOf(raw?.compensations?.rating, RATINGS, "non évaluable"),
      items: list(raw?.compensations?.items, 5, 160),
      comment: text(raw?.compensations?.comment, 600),
    },
    intensity: {
      reps_in_reserve: Math.round(clamp(raw?.intensity?.reps_in_reserve, -1, 10, -1)),
      proximity_to_failure: oneOf(raw?.intensity?.proximity_to_failure, ["loin", "modérée", "proche", "échec", "non évaluable"] as const, "non évaluable"),
      velocity_trend: text(raw?.intensity?.velocity_trend, 400),
      comment: text(raw?.intensity?.comment, 600),
    },
    bar_path: crit(raw?.bar_path),
    bracing: crit(raw?.bracing),
    breathing: { visible: raw?.breathing?.visible === true, comment: text(raw?.breathing?.comment, 600) },
    head_position: crit(raw?.head_position),
    feet: crit(raw?.feet),
    errors,
    strengths: list(raw?.strengths, 5, 260),
    priority_corrections: corrections,
    plan_4_weeks: weeks,
    next_session_cues: list(raw?.next_session_cues, 5, 260),
    next_video_instructions: list(raw?.next_video_instructions, 5, 260),
    safety_note: text(raw?.safety_note, 300)
      || "Cette analyse porte uniquement sur la technique et ne remplace pas un avis médical. En cas de douleur, arrête et consulte un professionnel de santé.",
  };
}

export type FormcheckDecision =
  | { kind: "deliver" }
  | { kind: "reject"; reason: string }
  | { kind: "retry"; reason: string };

/** Nom de l'exercice détecté à afficher (PDF, email), avec un repli neutre. */
export function detectedExerciseLabel(analysis: Pick<FormcheckAnalysis, "exercise_detected"> | null | undefined): string {
  return analysis?.exercise_detected?.name_fr || "Exercice analysé";
}

/**
 * Décide du sort d'une analyse :
 * - reject : vidéo inexploitable ou aucun exercice de musculation reconnu, le crédit est libéré ;
 * - retry : confiance trop basse ou sortie incomplète, on relance (puis alerte admin) ;
 * - deliver : rapport envoyé et crédit consommé.
 */
export function decideFormcheckOutcome(
  analysis: FormcheckAnalysis,
  minConfidence = getFormcheckMinConfidence(),
): FormcheckDecision {
  if (!analysis.exploitable) {
    return {
      kind: "reject",
      reason: analysis.rejection_reason
        || "On ne voit pas assez bien ton mouvement pour l'analyser. Refilme ta série de profil, corps entier dans le cadre, avec une bonne lumière.",
    };
  }
  if (!analysis.exercise_detected.is_strength_exercise || !analysis.exercise_detected.name_fr) {
    return {
      kind: "reject",
      reason: analysis.rejection_reason
        || "On ne reconnaît aucun exercice de musculation sur ta vidéo. Filme une seule série d'un exercice de musculation, corps entier et charge dans le cadre.",
    };
  }
  if (analysis.confidence < minConfidence) {
    return { kind: "retry", reason: `LOW_CONFIDENCE:${analysis.confidence.toFixed(2)}` };
  }
  if (analysis.priority_corrections.length < 3 || !analysis.summary || analysis.score <= 0) {
    return { kind: "retry", reason: "INCOMPLETE_OUTPUT" };
  }
  return { kind: "deliver" };
}

export interface VisionFrame { index: number; timestampS: number; jpeg: Buffer }

export interface VisionUsage { inputTokens: number; cachedInputTokens: number; outputTokens: number; reasoningTokens: number; totalTokens: number }

export interface VisionResult {
  analysis: FormcheckAnalysis;
  model: string;
  responseId: string;
  costUsd: number | null;
  reasoningEffort?: string;
  usage?: VisionUsage | null;
}

export async function runFormcheckVisionAnalysis(input: {
  analysisId: string;
  email: string;
  durationS: number;
  frames: VisionFrame[];
}): Promise<VisionResult> {
  const content: any[] = [
    {
      type: "input_text",
      text: buildFormcheckPrompt({
        frameTimestamps: input.frames.map((f) => f.timestampS),
        durationS: input.durationS,
      }),
    },
  ];
  for (const frame of input.frames) {
    content.push({ type: "input_text", text: `frame ${frame.index} (${frame.timestampS.toFixed(1)} s)` });
    content.push({ type: "input_image", image_url: `data:image/jpeg;base64,${frame.jpeg.toString("base64")}`, detail: "high" });
  }
  const { runOpenAIText } = await import("../openaiResponses");
  const result = await runOpenAIText({
    profile: "vision",
    model: getFormcheckModel(),
    reasoningEffort: getFormcheckReasoningEffort(),
    instructions: FORMCHECK_INSTRUCTIONS,
    input: [{ role: "user", content }],
    safetyId: input.email,
    schema: FORMCHECK_ANALYSIS_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "formcheck_analysis",
    maxOutputTokens: 32_000,
    retries: 2,
    label: `formcheck-${input.analysisId}`,
  });
  const parsed = JSON.parse(result.text);
  const tokens = result.usage?.tokens;
  return {
    analysis: normalizeFormcheckAnalysis(parsed, input.frames.length),
    model: result.model,
    responseId: result.responseId,
    // Coût au tarif du modèle réellement utilisé (le suivi global ai_usage_events reste au tarif gpt-5.6-sol).
    costUsd: tokens ? estimateFormcheckCostUsd(result.model, tokens) : null,
    reasoningEffort: result.reasoningEffort,
    usage: tokens
      ? { inputTokens: tokens.inputTokens, cachedInputTokens: tokens.cachedInputTokens, outputTokens: tokens.outputTokens, reasoningTokens: tokens.reasoningTokens, totalTokens: tokens.totalTokens }
      : null,
  };
}
