import { OPENAI_REPORT_MODEL, runOpenAIText } from "./openaiResponses";
import { PhotoAnalysis } from "./types";

// Ultimate Scan photo analysis uses the same OpenAI key as every report engine.

export type PhotoAnalysisResult = PhotoAnalysis;

const PHOTO_ANALYSIS_PROMPT = `Tu es un EXPERT en composition corporelle, biomecanique et evaluation posturale (15 ans d'experience).

Analyse ces photos avec une PRECISION CLINIQUE. Evalue :

1. COMPOSITION CORPORELLE DETAILLEE
   - % masse grasse estimé (range précis)
   - Répartition viscéral vs sous-cutané
   - Pattern de stockage hormonal (androide/gynoide/mixte)
   - Zones prioritaires de stockage
   - Ratio taille/hanches
   - Presence retention d'eau ou inflammation visible

2. ANALYSE MUSCULAIRE APPROFONDIE
   - Densité et développement par groupes musculaires
   - Asymétries gauche/droite (épaules, bras, jambes)
   - Déséquilibres anterior/posterior (pecs vs dos, quads vs ischios)
   - Groupes musculaires dominants vs inhibés
   - Points forts exploitables
   - Points faibles urgents à corriger

3. EVALUATION POSTURALE BIOMECANIQUE
   - Position tête/cervicales (protraction?)
   - Alignement épaules (enroulement, élévation?)
   - Courbures rachis (cyphose, lordose, scoliose?)
   - Bassin (antéversion, rétroversion, latéralité?)
   - Genoux (valgus, varus, recurvatum?)
   - Impact fonctionnel sur performance

4. SIGNES MEDICAUX/SANTE
   - Qualité peau (texture, élasticité, inflammation)
   - Signes œdème ou rétention
   - Signes vasculaires
   - Drapeaux rouges médicaux

REPONDS UNIQUEMENT avec ce JSON (pas de texte avant/apres, pas de markdown) :

{
  "fatDistribution": {
    "visceral": "faible|modere|eleve|tres-eleve",
    "subcutaneous": "faible|modere|eleve|tres-eleve",
    "zones": ["4 zones stockage prioritaires avec DETAILS"],
    "estimatedBF": "Range qualitatif uniquement (ex: 'modéré-élevé', 'faible-modéré') - JAMAIS de chiffre précis sans mesure DEXA/BOD POD. Sois CONSERVATEUR.",
    "waistToHipRatio": "Tendance qualitative uniquement (ex: 'tendance androïde', 'tendance gynoïde', 'mixte') - JAMAIS de chiffre précis (ex: 0.92) sans mesure au ruban selon protocole standardisé",
    "hormonalPattern": "description pattern hormonal visible",
    "inflammationSigns": "description signes inflammation/retention"
  },
  "posture": {
    "headPosition": "evaluation DETAILLEE avec angles si possible",
    "shoulderAlignment": "evaluation DETAILLEE asymetries",
    "spineAlignment": "evaluation DETAILLEE courbures",
    "pelvicTilt": "evaluation DETAILLEE + impact",
    "kneesAlignment": "evaluation DETAILLEE valgus/varus",
    "overallScore": 0-100,
    "issues": ["3 problemes biomecaniques MAJEURS avec consequences"]
  },
  "muscularBalance": {
    "upperBody": "evaluation DETAILLEE densite/developpement",
    "lowerBody": "evaluation DETAILLEE densite/developpement",
    "leftRightSymmetry": "evaluation DETAILLEE asymetries specifiques",
    "anteriorPosterior": "evaluation DETAILLEE desequilibres",
    "weakAreas": ["3 groupes FAIBLES avec niveau severite"],
    "strongAreas": ["3 groupes FORTS a exploiter"]
  },
  "medicalObservations": {
    "skinCondition": ["observations texture/elasticite/inflammation"],
    "edemaPresence": "localisation et severite si present",
    "vascularSigns": ["signes visibles circulation"],
    "potentialConcerns": ["drapeaux rouges medicaux si presents"]
  },
  "recommendations": {
    "posturalCorrections": ["3 corrections PRECISES avec nom exercices"],
    "muscleGroupsToTarget": ["3 groupes prioritaires avec raison"],
    "mobilityWork": ["2 zones mobilite URGENTES"],
    "medicalFollowUp": ["si drapeaux rouges detectes"]
  },
  "summary": "Synthese EXPERT en 3-4 phrases : composition actuelle, desequilibres majeurs, priorites correction",
  "confidenceLevel": 70-100
}

REGLES CRITIQUES :
- Sois ULTRA-PRECIS : donne des details mesurables
- REMPLIS CHAQUE CHAMP avec expertise
- Utilise vocabulaire CLINIQUE et TECHNIQUE
- JSON VALIDE uniquement, pas de commentaires
- Si incertitude, indique-le dans le champ mais donne quand meme une analyse`;

function getDefaultAnalysis(reason: string): PhotoAnalysisResult {
  return {
    fatDistribution: {
      visceral: "modere",
      subcutaneous: "modere",
      zones: [],
      estimatedBF: `Analyse indisponible (${reason})`,
      waistToHipRatio: "non visible",
      hormonalPattern: "non determine",
      inflammationSigns: "non determine",
    } as any,
    posture: {
      headPosition: "non visible",
      shoulderAlignment: "non visible",
      spineAlignment: "non visible",
      pelvicTilt: "non visible",
      kneesAlignment: "non visible",
      overallScore: 50,
      issues: [],
    },
    muscularBalance: {
      upperBody: "non visible",
      lowerBody: "non visible",
      leftRightSymmetry: "non visible",
      anteriorPosterior: "non visible",
      weakAreas: [],
      strongAreas: [],
    },
    medicalObservations: {
      skinCondition: [],
      edemaPresence: "non visible",
      vascularSigns: [],
      potentialConcerns: [],
    },
    recommendations: {
      posturalCorrections: [],
      muscleGroupsToTarget: [],
      mobilityWork: [],
      medicalFollowUp: [],
    },
    summary: `Analyse photo non disponible: ${reason}`,
    confidenceLevel: 70,
  } as any;
}

function normalizeAnalysisResult(obj: Record<string, unknown>): PhotoAnalysisResult {
  const base = getDefaultAnalysis("normalisation");
  const raw = obj as any;

  // Normalize posture if a provider ever returns a legacy field name.
  const posture = raw.posture || {};
  const postureDetails = posture.details || {};
  const toStr = (v: unknown): string => {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") {
      const s = JSON.stringify(v);
      return s === "{}" || s === "[]" ? "" : s;
    }
    return String(v);
  };
  base.posture = {
    headPosition: toStr(posture.headPosition) || toStr(postureDetails.tete_cou) || toStr(posture.tete) || toStr(posture.head) || toStr(posture.overall) || "non visible",
    shoulderAlignment: toStr(posture.shoulderAlignment) || toStr(postureDetails.epaules) || toStr(posture.shoulders) || "non visible",
    spineAlignment: toStr(posture.spineAlignment) || toStr(postureDetails.alignement_vertebral) || toStr(posture.spine) || toStr(posture.colonne) || "non visible",
    pelvicTilt: toStr(posture.pelvicTilt) || toStr(postureDetails.bassin) || toStr(posture.pelvis) || "non visible",
    kneesAlignment: toStr(posture.kneesAlignment) || toStr(postureDetails.genoux) || toStr(posture.knees) || "non visible",
    overallScore: Number(posture.overallScore || posture.score || posture.note || 50),
    issues: Array.isArray(posture.issues) ? posture.issues : [],
  };

  // Normalize summary if a provider ever returns an object.
  base.summary = typeof raw.summary === "string" ? raw.summary
    : raw.summary ? JSON.stringify(raw.summary) : "Analyse completee";

  // Normalize fatDistribution
  const fat = raw.fatDistribution || raw.fat_distribution || {};
  base.fatDistribution = {
    visceral: fat.visceral || fat.overall || "modere",
    subcutaneous: fat.subcutaneous || "modere",
    zones: Array.isArray(fat.zones) ? fat.zones : (typeof fat.zones === "object" ? Object.values(fat.zones || {}) : []),
    estimatedBF: fat.estimatedBF || fat.estimated_body_fat_percentage || raw.summary?.estimated_body_fat_percentage || "non determine",
    waistToHipRatio: fat.waistToHipRatio || "non visible",
    hormonalPattern: fat.hormonalPattern || fat.pattern || "non determine",
    inflammationSigns: fat.inflammationSigns || "non determine",
  } as any;

  // Normalize muscularBalance
  const muscle = raw.muscularBalance || raw.muscular_balance || {};
  base.muscularBalance = {
    upperBody: muscle.upperBody || muscle.observations?.epaules || muscle.overall || "non visible",
    lowerBody: muscle.lowerBody || muscle.observations?.membres_inferieurs || "non visible",
    leftRightSymmetry: muscle.leftRightSymmetry || "non visible",
    anteriorPosterior: muscle.anteriorPosterior || muscle.observations?.posture_musculaire || "non visible",
    weakAreas: muscle.weakAreas || [],
    strongAreas: muscle.strongAreas || [],
  };

  // Normalize recommendations
  const recs = raw.recommendations || {};
  base.recommendations = {
    posturalCorrections: recs.posturalCorrections || recs.exercice || [],
    muscleGroupsToTarget: recs.muscleGroupsToTarget || [],
    mobilityWork: recs.mobilityWork || [],
    medicalFollowUp: recs.medicalFollowUp || recs.suivi_medical || [],
  };

  // Normalize medical
  const med = raw.medicalObservations || raw.medical_observations || {};
  base.medicalObservations = {
    skinCondition: med.skinCondition || med.peau || [],
    edemaPresence: med.edemaPresence || "non visible",
    vascularSigns: med.vascularSigns || [],
    potentialConcerns: med.potentialConcerns || med.principal_concerns || raw.summary?.principal_concerns || [],
  };

  base.confidenceLevel = Number(raw.confidenceLevel || raw.confidence_level || 70);
  if (!Number.isFinite(base.confidenceLevel)) base.confidenceLevel = 70;

  return base as PhotoAnalysisResult;
}

const MAX_PHOTO_BASE64_SIZE = 500_000;

function parsePhotoToBase64(photo: string): { mediaType: string; data: string } | null {
  const trimmed = String(photo || "").trim();
  if (!trimmed) return null;

  let mediaType = "image/jpeg";
  let data = "";

  // data URL
  if (trimmed.startsWith("data:image/")) {
    const m = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (!m) return null;
    mediaType = m[1];
    data = m[2];
  } else {
    // raw base64 -> assume jpeg
    data = trimmed.replace(/\s/g, "");
  }

  // The real fix for oversized images remains frontend compression before upload.
  if (data.length > MAX_PHOTO_BASE64_SIZE) {
    console.warn(`[PhotoAnalysis] Image too large: ${(data.length / 1024).toFixed(0)}KB base64 (${(data.length * 0.75 / 1024 / 1024).toFixed(1)}MB decoded). May cause API errors.`);
  }

  return { mediaType, data };
}

const PHOTO_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "fatDistribution",
    "posture",
    "muscularBalance",
    "medicalObservations",
    "recommendations",
    "summary",
    "confidenceLevel",
  ],
  properties: {
    fatDistribution: {
      type: "object",
      additionalProperties: false,
      required: ["visceral", "subcutaneous", "zones", "estimatedBF", "waistToHipRatio", "hormonalPattern", "inflammationSigns"],
      properties: {
        visceral: { type: "string", enum: ["faible", "modere", "eleve", "tres-eleve"] },
        subcutaneous: { type: "string", enum: ["faible", "modere", "eleve", "tres-eleve"] },
        zones: { type: "array", items: { type: "string" } },
        estimatedBF: { type: "string" },
        waistToHipRatio: { type: "string" },
        hormonalPattern: { type: "string" },
        inflammationSigns: { type: "string" },
      },
    },
    posture: {
      type: "object",
      additionalProperties: false,
      required: ["headPosition", "shoulderAlignment", "spineAlignment", "pelvicTilt", "kneesAlignment", "overallScore", "issues"],
      properties: {
        headPosition: { type: "string" },
        shoulderAlignment: { type: "string" },
        spineAlignment: { type: "string" },
        pelvicTilt: { type: "string" },
        kneesAlignment: { type: "string" },
        overallScore: { type: "number", minimum: 0, maximum: 100 },
        issues: { type: "array", items: { type: "string" } },
      },
    },
    muscularBalance: {
      type: "object",
      additionalProperties: false,
      required: ["upperBody", "lowerBody", "leftRightSymmetry", "anteriorPosterior", "weakAreas", "strongAreas"],
      properties: {
        upperBody: { type: "string" },
        lowerBody: { type: "string" },
        leftRightSymmetry: { type: "string" },
        anteriorPosterior: { type: "string" },
        weakAreas: { type: "array", items: { type: "string" } },
        strongAreas: { type: "array", items: { type: "string" } },
      },
    },
    medicalObservations: {
      type: "object",
      additionalProperties: false,
      required: ["skinCondition", "edemaPresence", "vascularSigns", "potentialConcerns"],
      properties: {
        skinCondition: { type: "array", items: { type: "string" } },
        edemaPresence: { type: "string" },
        vascularSigns: { type: "array", items: { type: "string" } },
        potentialConcerns: { type: "array", items: { type: "string" } },
      },
    },
    recommendations: {
      type: "object",
      additionalProperties: false,
      required: ["posturalCorrections", "muscleGroupsToTarget", "mobilityWork", "medicalFollowUp"],
      properties: {
        posturalCorrections: { type: "array", items: { type: "string" } },
        muscleGroupsToTarget: { type: "array", items: { type: "string" } },
        mobilityWork: { type: "array", items: { type: "string" } },
        medicalFollowUp: { type: "array", items: { type: "string" } },
      },
    },
    summary: { type: "string" },
    confidenceLevel: { type: "number", minimum: 0, maximum: 100 },
  },
} as const;

export async function analyzeBodyPhotosWithAI(
  photos: { front?: string; side?: string; back?: string },
  userContext?: { sexe?: string; age?: string; objectif?: string }
): Promise<PhotoAnalysisResult> {
  const images: Array<{ label: string; imageUrl: string; size: number }> = [];
  const labels: string[] = [];

  const SUPPORTED_MEDIA = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ]);

  const add = (label: string, raw?: string) => {
    if (!raw) return;
    const parsed = parsePhotoToBase64(raw);
    if (!parsed) return;

    // Skip images that are way too large (>4MB base64 = ~3MB decoded)
    if (parsed.data.length > 4_000_000) {
      console.warn(`[PhotoAnalysis] SKIPPING ${label}: ${(parsed.data.length / 1024 / 1024).toFixed(1)}MB base64 ,  too large for API`);
      return;
    }

    const mt = parsed.mediaType.toLowerCase();
    if (!SUPPORTED_MEDIA.has(mt)) {
      console.warn(`[PhotoAnalysis] SKIPPING ${label}: unsupported media type "${mt}" ,  needs JPEG/PNG/GIF/WebP. Likely iPhone HEIC ,  ask the client to re-upload or enable client-side HEIC→JPEG conversion.`);
      return;
    }

    images.push({
      label,
      imageUrl: `data:${parsed.mediaType};base64,${parsed.data}`,
      size: parsed.data.length,
    });
    labels.push(label);
  };

  add("Photo 1: Vue de face", photos.front);
  add("Photo 2: Vue de profil", photos.side);
  add("Photo 3: Vue de dos", photos.back);

  if (images.length === 0) return getDefaultAnalysis("Aucune photo fournie");

  const contextText = userContext
    ? `\nCONTEXTE CLIENT: Sexe ${userContext.sexe || "non specifie"}, Age ${userContext.age || "non specifie"}, Objectif ${userContext.objectif || "non specifie"}`
    : "";

  const fullPrompt = `${PHOTO_ANALYSIS_PROMPT}${contextText}\n\nPhotos fournies: ${labels.join(", ")}\n\nAnalyse uniquement ce qui est réellement visible. Retourne le JSON demandé.`;

  const analyze = async (selected: typeof images, label: string): Promise<PhotoAnalysisResult> => {
    const content: any[] = [{ type: "input_text", text: fullPrompt }];
    for (const image of selected) {
      content.push({ type: "input_text", text: image.label });
      content.push({ type: "input_image", image_url: image.imageUrl, detail: "high" });
    }
    const result = await runOpenAIText({
      profile: "vision",
      instructions:
        "Tu analyses des photos de composition corporelle avec prudence et précision. Tu distingues strictement observation et hypothèse. Tu n'inventes aucune mesure. Tu réponds en français et uniquement dans le schéma JSON fourni.",
      input: [{ role: "user", content }],
      safetyId: `${userContext?.age || "unknown"}-${labels.join("|")}`,
      schema: PHOTO_ANALYSIS_SCHEMA as unknown as Record<string, unknown>,
      schemaName: "ultimate_photo_analysis",
      maxOutputTokens: 10_000,
      label,
    });
    return normalizeAnalysisResult(JSON.parse(result.text));
  };

  try {
    console.log(`[PhotoAnalysis OpenAI] Analysing ${labels.length} photos with ${OPENAI_REPORT_MODEL}...`);
    const parsed = await analyze(images, "ultimate-photo-analysis");
    console.log(`[PhotoAnalysis OpenAI] Analysis complete - confidence: ${parsed.confidenceLevel || 70}%`);
    return parsed;
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error("[PhotoAnalysis OpenAI] Error:", msg);

    if (images.length > 1) {
      try {
        const smaller = [...images].sort((a, b) => a.size - b.size).slice(0, images.length - 1);
        console.warn(`[PhotoAnalysis OpenAI] Retrying with ${smaller.length} smaller photos...`);
        return await analyze(smaller, "ultimate-photo-analysis-retry");
      } catch (retryErr) {
        console.error("[PhotoAnalysis OpenAI] Retry failed:", retryErr);
      }
    }
    return getDefaultAnalysis(msg || "Erreur API OpenAI");
  }
}

export function formatPhotoAnalysisForReport(photoAnalysis: PhotoAnalysisResult | null): string {
  if (!photoAnalysis) return "";
  // Keep it compact; the full JSON is embedded in the report pipeline separately.
  const bf = (photoAnalysis as any)?.fatDistribution?.estimatedBF || "N/A";
  const summary = (photoAnalysis as any)?.summary || "";
  return `ANALYSE PHOTO (Vision)\n- Estimation BF: ${bf}\n- Synthese: ${summary}`.trim();
}
