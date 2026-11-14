/**
 * FormCheck V2 : prompt, schéma JSON strict, normalisation et décision.
 * L'appel réseau est isolé dans runFormcheckVisionAnalysis (injectable pour les tests).
 */
import { getFormcheckMinConfidence, getFormcheckModel } from "./config";

export type AnnotationType = "circle" | "line" | "angle" | "arrow";

export interface FormcheckPoint { x: number; y: number }

export interface FormcheckAnnotation {
  type: AnnotationType;
  points: FormcheckPoint[];
  radius: number;
  label: string;
}

export interface FormcheckError {
  title: string;
  description: string;
  severity: "mineure" | "modérée" | "majeure";
  frame_index: number;
  annotations: FormcheckAnnotation[];
}

export interface FormcheckAnalysis {
  exploitable: boolean;
  rejection_reason: string;
  exercise_recognized: string;
  matches_declared_exercise: boolean;
  camera_view: "profil" | "face" | "dos" | "trois_quarts" | "autre";
  confidence: number;
  reps_count: number;
  tempo: { eccentric_s: number; pause_bottom_s: number; concentric_s: number; pause_top_s: number; comment: string };
  range_of_motion: { rating: "complète" | "partielle" | "insuffisante" | "non évaluable"; comment: string };
  symmetry: { assessable: boolean; comment: string };
  intensity: { reps_in_reserve: number; proximity_to_failure: "loin" | "modérée" | "proche" | "échec" | "non évaluable"; comment: string };
  errors: FormcheckError[];
  strengths: string[];
  priority_corrections: Array<{ title: string; cue: string; why: string }>;
  next_session_cues: string[];
  score: number;
  summary: string;
  safety_note: string;
}

const str = { type: "string" } as const;
const num = { type: "number" } as const;
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
});

export const FORMCHECK_ANALYSIS_SCHEMA = obj({
  exploitable: { type: "boolean" },
  rejection_reason: str,
  exercise_recognized: str,
  matches_declared_exercise: { type: "boolean" },
  camera_view: { type: "string", enum: ["profil", "face", "dos", "trois_quarts", "autre"] },
  confidence: num,
  reps_count: { type: "integer" },
  tempo: obj({ eccentric_s: num, pause_bottom_s: num, concentric_s: num, pause_top_s: num, comment: str }),
  range_of_motion: obj({ rating: { type: "string", enum: ["complète", "partielle", "insuffisante", "non évaluable"] }, comment: str }),
  symmetry: obj({ assessable: { type: "boolean" }, comment: str }),
  intensity: obj({
    reps_in_reserve: { type: "integer" },
    proximity_to_failure: { type: "string", enum: ["loin", "modérée", "proche", "échec", "non évaluable"] },
    comment: str,
  }),
  errors: {
    type: "array",
    items: obj({
      title: str,
      description: str,
      severity: { type: "string", enum: ["mineure", "modérée", "majeure"] },
      frame_index: { type: "integer" },
      annotations: {
        type: "array",
        items: obj({
          type: { type: "string", enum: ["circle", "line", "angle", "arrow"] },
          points: { type: "array", items: obj({ x: num, y: num }) },
          radius: num,
          label: str,
        }),
      },
    }),
  },
  strengths: { type: "array", items: str },
  priority_corrections: { type: "array", items: obj({ title: str, cue: str, why: str }) },
  next_session_cues: { type: "array", items: str },
  score: { type: "integer" },
  summary: str,
  safety_note: str,
});

export const FORMCHECK_INSTRUCTIONS = [
  "Tu es Achzod, coach en musculation certifié, et tu fais une analyse technique (form check) à partir d'images extraites d'une vidéo.",
  "Tu tutoies le client, ton direct et concret de coach, phrases courtes, zéro blabla. Français correct et accentué. Pas de tiret long.",
  "Tu analyses uniquement ce qui est visible sur les images. Tu n'inventes rien. Si un critère n'est pas visible (angle de caméra, cadrage), tu le dis.",
  "Interdit : tout diagnostic médical, toute hypothèse de blessure ou de pathologie, toute prescription. Tu parles de technique, de placement, de trajectoire et de tempo.",
  "Tu réponds uniquement avec le JSON du schéma fourni.",
].join("\n");

export function buildFormcheckPrompt(input: {
  declaredExercise: string;
  frameTimestamps: number[];
  durationS: number;
}): string {
  const frames = input.frameTimestamps
    .map((t, i) => `frame ${i} = ${t.toFixed(1)} s`)
    .join(", ");
  return `Exercice déclaré par le client : ${input.declaredExercise}.
Vidéo d'une série, durée ${input.durationS.toFixed(1)} s. ${input.frameTimestamps.length} images extraites dans l'ordre chronologique (${frames}).

Règles :
1. exploitable = false si on ne peut pas juger la technique : personne absente ou coupée (pieds, barre ou articulations clés hors cadre), image trop sombre ou floue, caméra qui bouge trop, plusieurs séries ou plusieurs personnes, pas d'exercice de musculation. Dans ce cas, rejection_reason explique en une ou deux phrases quoi refilmer et comment (cadrage, distance, angle, lumière). Sinon rejection_reason = "".
2. exercise_recognized : l'exercice que tu vois. matches_declared_exercise = false s'il ne correspond pas à l'exercice déclaré (une variante proche compte comme correspondante).
3. confidence entre 0 et 1 : ta confiance globale dans l'analyse (cadrage, netteté, nombre d'images utiles).
4. reps_count : nombre de répétitions estimé sur la série (les images sont espacées, estime à partir des positions et de la durée).
5. tempo en secondes (excentrique, pause basse, concentrique, pause haute) estimé à partir des horodatages ; comment explique.
6. range_of_motion, symmetry (assessable = false si la vue ne permet pas de juger, par exemple vue de profil stricte), intensity (reps_in_reserve estimé, -1 si non évaluable ; proximity_to_failure).
7. errors : 0 à 5 erreurs techniques, de la plus importante à la moins importante. frame_index = l'index de l'image où l'erreur se voit le mieux (0 à ${input.frameTimestamps.length - 1}). annotations : 1 à 3 formes sobres sur cette image en coordonnées relatives (x et y entre 0 et 1, origine en haut à gauche) :
   - circle : points = [centre], radius = rayon relatif à la largeur (0.03 à 0.15), pour entourer une zone (genou, bas du dos, coude…)
   - line : points = [début, fin], pour une trajectoire ou un alignement (barre, tibia, dos)
   - angle : points = [point A, sommet, point B], pour un angle articulaire (hanche, genou, coude)
   - arrow : points = [départ, arrivée], pour la correction à faire
   label : 1 à 4 mots. Mets radius = 0 si ce n'est pas un cercle.
8. strengths : 2 à 4 points forts réels.
9. priority_corrections : exactement 3 corrections prioritaires, chacune avec un titre, une consigne courte à se répéter pendant la série (cue) et le pourquoi.
10. next_session_cues : 3 à 5 consignes concrètes pour la prochaine séance (charge, tempo, échauffement, placement, vidéo à refaire).
11. score sur 100 de la qualité technique de cette série.
12. summary : 2 à 3 phrases de verdict, en tutoyant.
13. safety_note : une phrase de prudence (pas de diagnostic, consulter un professionnel de santé en cas de douleur).`;
}

// ---------------------------------------------------------------------------
// Normalisation défensive : le modèle peut se tromper, le PDF ne doit jamais casser.
// ---------------------------------------------------------------------------

const clamp = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const text = (v: unknown, max = 600): string => String(v ?? "").replace(/[\u2013\u2014]/g, ",").trim().slice(0, max);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(String(v)) ? (v as T) : fallback;

export function normalizeFormcheckAnalysis(raw: any, frameCount: number): FormcheckAnalysis {
  const lastFrame = Math.max(0, frameCount - 1);
  const errors: FormcheckError[] = (Array.isArray(raw?.errors) ? raw.errors : []).slice(0, 5).map((e: any) => ({
    title: text(e?.title, 120),
    description: text(e?.description, 600),
    severity: oneOf(e?.severity, ["mineure", "modérée", "majeure"] as const, "modérée"),
    frame_index: Math.round(clamp(e?.frame_index, 0, lastFrame, 0)),
    annotations: (Array.isArray(e?.annotations) ? e.annotations : []).slice(0, 3).map((a: any) => ({
      type: oneOf(a?.type, ["circle", "line", "angle", "arrow"] as const, "circle"),
      points: (Array.isArray(a?.points) ? a.points : []).slice(0, 3).map((p: any) => ({
        x: clamp(p?.x, 0, 1, 0.5),
        y: clamp(p?.y, 0, 1, 0.5),
      })),
      radius: clamp(a?.radius, 0, 0.3, 0.06),
      label: text(a?.label, 40),
    })).filter((a: FormcheckAnnotation) => {
      const needed = a.type === "circle" ? 1 : a.type === "angle" ? 3 : 2;
      return a.points.length >= needed;
    }),
  })).filter((e: FormcheckError) => e.title);

  const corrections = (Array.isArray(raw?.priority_corrections) ? raw.priority_corrections : [])
    .map((c: any) => ({ title: text(c?.title, 120), cue: text(c?.cue, 200), why: text(c?.why, 400) }))
    .filter((c: { title: string }) => c.title)
    .slice(0, 3);

  return {
    exploitable: raw?.exploitable === true,
    rejection_reason: text(raw?.rejection_reason, 500),
    exercise_recognized: text(raw?.exercise_recognized, 80),
    matches_declared_exercise: raw?.matches_declared_exercise !== false,
    camera_view: oneOf(raw?.camera_view, ["profil", "face", "dos", "trois_quarts", "autre"] as const, "autre"),
    confidence: clamp(raw?.confidence, 0, 1, 0),
    reps_count: Math.round(clamp(raw?.reps_count, 0, 100, 0)),
    tempo: {
      eccentric_s: clamp(raw?.tempo?.eccentric_s, 0, 20, 0),
      pause_bottom_s: clamp(raw?.tempo?.pause_bottom_s, 0, 20, 0),
      concentric_s: clamp(raw?.tempo?.concentric_s, 0, 20, 0),
      pause_top_s: clamp(raw?.tempo?.pause_top_s, 0, 20, 0),
      comment: text(raw?.tempo?.comment, 400),
    },
    range_of_motion: {
      rating: oneOf(raw?.range_of_motion?.rating, ["complète", "partielle", "insuffisante", "non évaluable"] as const, "non évaluable"),
      comment: text(raw?.range_of_motion?.comment, 400),
    },
    symmetry: { assessable: raw?.symmetry?.assessable === true, comment: text(raw?.symmetry?.comment, 400) },
    intensity: {
      reps_in_reserve: Math.round(clamp(raw?.intensity?.reps_in_reserve, -1, 10, -1)),
      proximity_to_failure: oneOf(raw?.intensity?.proximity_to_failure, ["loin", "modérée", "proche", "échec", "non évaluable"] as const, "non évaluable"),
      comment: text(raw?.intensity?.comment, 400),
    },
    errors,
    strengths: (Array.isArray(raw?.strengths) ? raw.strengths : []).map((s: unknown) => text(s, 200)).filter(Boolean).slice(0, 4),
    priority_corrections: corrections,
    next_session_cues: (Array.isArray(raw?.next_session_cues) ? raw.next_session_cues : []).map((s: unknown) => text(s, 240)).filter(Boolean).slice(0, 5),
    score: Math.round(clamp(raw?.score, 0, 100, 0)),
    summary: text(raw?.summary, 700),
    safety_note: text(raw?.safety_note, 300)
      || "Cette analyse porte uniquement sur la technique et ne remplace pas un avis médical. En cas de douleur, arrête et consulte un professionnel de santé.",
  };
}

export type FormcheckDecision =
  | { kind: "deliver" }
  | { kind: "reject"; reason: string }
  | { kind: "retry"; reason: string };

/**
 * Décide du sort d'une analyse :
 * - reject : vidéo inexploitable ou mauvais exercice, le crédit est libéré ;
 * - retry : confiance trop basse ou sortie incomplète, on relance (puis alerte admin) ;
 * - deliver : rapport envoyé et crédit consommé.
 */
export function decideFormcheckOutcome(
  analysis: FormcheckAnalysis,
  declaredExerciseLabel: string,
  minConfidence = getFormcheckMinConfidence(),
): FormcheckDecision {
  if (!analysis.exploitable) {
    return {
      kind: "reject",
      reason: analysis.rejection_reason
        || "On ne voit pas assez bien ton mouvement pour l'analyser. Refilme ta série de profil, corps entier dans le cadre, avec une bonne lumière.",
    };
  }
  if (!analysis.matches_declared_exercise) {
    const seen = analysis.exercise_recognized ? ` On voit plutôt : ${analysis.exercise_recognized}.` : "";
    return {
      kind: "reject",
      reason: `La vidéo ne correspond pas à l'exercice choisi (${declaredExerciseLabel}).${seen} Renvoie-la en choisissant le bon exercice, ou filme le bon mouvement.`,
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

export interface VisionResult { analysis: FormcheckAnalysis; model: string; responseId: string; costUsd: number | null }

export async function runFormcheckVisionAnalysis(input: {
  analysisId: string;
  email: string;
  declaredExercise: string;
  durationS: number;
  frames: VisionFrame[];
}): Promise<VisionResult> {
  const content: any[] = [
    {
      type: "input_text",
      text: buildFormcheckPrompt({
        declaredExercise: input.declaredExercise,
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
    instructions: FORMCHECK_INSTRUCTIONS,
    input: [{ role: "user", content }],
    safetyId: input.email,
    schema: FORMCHECK_ANALYSIS_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "formcheck_analysis",
    maxOutputTokens: 12_000,
    retries: 2,
    label: `formcheck-${input.analysisId}`,
  });
  const parsed = JSON.parse(result.text);
  return {
    analysis: normalizeFormcheckAnalysis(parsed, input.frames.length),
    model: result.model,
    responseId: result.responseId,
    costUsd: (result.usage as any)?.costs?.openaiGpt56SolUsd ?? null,
  };
}
