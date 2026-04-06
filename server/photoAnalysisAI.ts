import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_CONFIG, validateAnthropicConfig } from "./anthropicConfig";
import { PhotoAnalysis } from "./types";

// Ultimate Scan photo analysis should not require extra Render env vars.
// We run vision analysis with Claude (Opus 4.6 by default) using ANTHROPIC_API_KEY.

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

  // Normalize posture (Claude may return different formats)
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

  // Normalize summary (Claude may return object or string)
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

const MAX_PHOTO_BASE64_SIZE = 500_000; // ~375KB decoded, plenty for Claude vision

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

  // If image is too large, log warning but still send (Claude can handle up to ~5MB)
  // The real fix is frontend compression before upload
  if (data.length > MAX_PHOTO_BASE64_SIZE) {
    console.warn(`[PhotoAnalysis] Image too large: ${(data.length / 1024).toFixed(0)}KB base64 (${(data.length * 0.75 / 1024 / 1024).toFixed(1)}MB decoded). May cause API errors.`);
  }

  return { mediaType, data };
}

function getAnthropicClient(): Anthropic {
  if (!validateAnthropicConfig()) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }
  return new Anthropic({ apiKey: ANTHROPIC_CONFIG.ANTHROPIC_API_KEY });
}

export async function analyzeBodyPhotosWithAI(
  photos: { front?: string; side?: string; back?: string },
  userContext?: { sexe?: string; age?: string; objectif?: string }
): Promise<PhotoAnalysisResult> {
  const client = getAnthropicClient();

  const blocks: any[] = [];
  const labels: string[] = [];

  const add = (label: string, raw?: string) => {
    if (!raw) return;
    const parsed = parsePhotoToBase64(raw);
    if (!parsed) return;

    // Skip images that are way too large (>4MB base64 = ~3MB decoded)
    // These will cause Claude API "Could not process image" errors
    if (parsed.data.length > 4_000_000) {
      console.warn(`[PhotoAnalysis] SKIPPING ${label}: ${(parsed.data.length / 1024 / 1024).toFixed(1)}MB base64 — too large for API`);
      return;
    }

    blocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: parsed.mediaType,
        data: parsed.data,
      },
    });
    labels.push(label);
  };

  add("Photo 1: Vue de face", photos.front);
  add("Photo 2: Vue de profil", photos.side);
  add("Photo 3: Vue de dos", photos.back);

  if (blocks.length === 0) return getDefaultAnalysis("Aucune photo fournie");

  const contextText = userContext
    ? `\nCONTEXTE CLIENT: Sexe ${userContext.sexe || "non specifie"}, Age ${userContext.age || "non specifie"}, Objectif ${userContext.objectif || "non specifie"}`
    : "";

  const fullPrompt = `${PHOTO_ANALYSIS_PROMPT}${contextText}\n\nPhotos fournies: ${labels.join(", ")}\n\nAnalyse ces photos et retourne ton analyse en JSON.`;
  blocks.push({ type: "text", text: fullPrompt });

  try {
    console.log(`[PhotoAnalysis Claude] Analysing ${labels.length} photos with ${ANTHROPIC_CONFIG.ANTHROPIC_MODEL}...`);

    const resp = await client.messages.create({
      model: ANTHROPIC_CONFIG.ANTHROPIC_MODEL,
      max_tokens: 4096,
      temperature: 0.3,
      messages: [{ role: "user", content: blocks }],
    } as any);

    const textContent = (resp as any).content?.find((c: any) => c.type === "text");
    const text = textContent?.text || "";

    // Try multiple extraction strategies for JSON
    let jsonStr: string | null = null;

    // Strategy 1: Extract from ```json blocks
    const codeBlockMatch = String(text).match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    // Strategy 2: Find the largest JSON object
    if (!jsonStr) {
      const jsonMatch = String(text).match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }

    if (!jsonStr) {
      console.error("[PhotoAnalysis Claude] No JSON found in response:", String(text).slice(0, 500));
      return getDefaultAnalysis("JSON non trouve dans la reponse");
    }

    // Aggressive JSON cleanup
    jsonStr = jsonStr.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1"); // trailing commas
    jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, " "); // control chars
    // Fix multiline strings (newlines inside JSON string values)
    jsonStr = jsonStr.replace(/\n/g, " ").replace(/\r/g, " ");
    // Fix single quotes used instead of double
    // Fix unescaped quotes inside strings
    jsonStr = jsonStr.replace(/\\'/g, "'");
    // Remove any BOM
    jsonStr = jsonStr.replace(/^\uFEFF/, "");

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      // Strategy 3: try to extract a smaller valid JSON
      try {
        // Remove everything before first { and after last }
        const firstBrace = jsonStr.indexOf("{");
        const lastBrace = jsonStr.lastIndexOf("}");
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          const trimmed = jsonStr.substring(firstBrace, lastBrace + 1);
          parsed = JSON.parse(trimmed);
        } else {
          throw e;
        }
      } catch (e2) {
        // Strategy 4: retry API call with stricter prompt
        console.error("[PhotoAnalysis Claude] JSON parse failed, retrying with strict prompt...");
        console.error("[PhotoAnalysis Claude] Snippet:", jsonStr.slice(0, 500));
        try {
          const retryBlocks = blocks.filter((b: any) => b.type === "image").slice(0, 2);
          retryBlocks.push({ type: "text", text: "Analyse ces photos. Reponds UNIQUEMENT avec un JSON valide, sans texte avant ou apres, sans markdown. Le JSON doit contenir: fatDistribution, muscularBalance, posture, confidenceLevel, summary, recommendations, medicalObservations." });
          const retryResp = await client.messages.create({
            model: ANTHROPIC_CONFIG.ANTHROPIC_MODEL,
            max_tokens: 4096,
            temperature: 0.1,
            messages: [{ role: "user", content: retryBlocks }],
          } as any);
          const retryText = (retryResp as any).content?.find((c: any) => c.type === "text")?.text || "";
          const retryJson = retryText.replace(/[\x00-\x1F\x7F\n\r]/g, " ").match(/\{[\s\S]*\}/);
          if (retryJson) {
            parsed = JSON.parse(retryJson[0].replace(/,(\s*[}\]])/g, "$1"));
            console.log("[PhotoAnalysis Claude] Retry with strict prompt succeeded");
          } else {
            throw new Error("Retry also failed");
          }
        } catch (retryErr) {
          console.error("[PhotoAnalysis Claude] All parse attempts failed");
          return getDefaultAnalysis("Erreur parsing JSON");
        }
      }
    }

    console.log(`[PhotoAnalysis Claude] Analysis complete - confidence: ${(parsed as any).confidenceLevel || 70}%`);
    return normalizeAnalysisResult(parsed);
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error("[PhotoAnalysis Claude] Error:", msg);

    // If image processing failed, retry with fewer/smaller images
    if ((msg.includes("400") || msg.includes("Could not process")) && blocks.length > 2) {
      console.warn("[PhotoAnalysis Claude] Retrying with smaller image set...");
      // Remove the largest image block and retry
      const imageBlocks = blocks.filter((b: any) => b.type === "image");
      const textBlock = blocks.find((b: any) => b.type === "text");
      if (imageBlocks.length > 1 && textBlock) {
        // Sort by data size, remove the largest
        imageBlocks.sort((a: any, b: any) => (b.source?.data?.length || 0) - (a.source?.data?.length || 0));
        const smallerBlocks = [...imageBlocks.slice(1), textBlock];
        try {
          console.log(`[PhotoAnalysis Claude] Retry with ${imageBlocks.length - 1} photos...`);
          const retryResp = await client.messages.create({
            model: ANTHROPIC_CONFIG.ANTHROPIC_MODEL,
            max_tokens: 4096,
            temperature: 0.3,
            messages: [{ role: "user", content: smallerBlocks }],
          } as any);
          const retryText = (retryResp as any).content?.find((c: any) => c.type === "text")?.text || "";
          const retryJson = String(retryText).match(/\{[\s\S]*\}/);
          if (retryJson) {
            const parsed = JSON.parse(retryJson[0].replace(/,(\s*[}\]])/g, "$1"));
            console.log("[PhotoAnalysis Claude] Retry succeeded with fewer photos");
            return normalizeAnalysisResult(parsed);
          }
        } catch (retryErr) {
          console.error("[PhotoAnalysis Claude] Retry also failed:", retryErr);
        }
      }
    }
    return getDefaultAnalysis(msg || "Erreur API Claude");
  }
}

export function formatPhotoAnalysisForReport(photoAnalysis: PhotoAnalysisResult | null): string {
  if (!photoAnalysis) return "";
  // Keep it compact; the full JSON is embedded in the report pipeline separately.
  const bf = (photoAnalysis as any)?.fatDistribution?.estimatedBF || "N/A";
  const summary = (photoAnalysis as any)?.summary || "";
  return `ANALYSE PHOTO (Vision)\n- Estimation BF: ${bf}\n- Synthese: ${summary}`.trim();
}

