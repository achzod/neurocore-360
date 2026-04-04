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
  // Minimal shape normalization to avoid frontend crashes.
  const base = getDefaultAnalysis("normalisation");
  const merged = { ...base, ...(obj as any) };
  merged.confidenceLevel = Number((merged as any).confidenceLevel ?? 70);
  if (!Number.isFinite(merged.confidenceLevel)) merged.confidenceLevel = 70;
  return merged as PhotoAnalysisResult;
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

    // Clean common JSON issues
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");
    jsonStr = jsonStr.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    // Fix unescaped newlines in string values
    jsonStr = jsonStr.replace(/:\s*"([^"]*)\n([^"]*?)"/g, (_, a, b) => `: "${a} ${b}"`);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      // Try one more time with aggressive cleanup
      try {
        jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, " ");
        parsed = JSON.parse(jsonStr);
      } catch (e2) {
        console.error("[PhotoAnalysis Claude] JSON parse failed:", e, "\nJSON snippet:", jsonStr.slice(0, 300));
        return getDefaultAnalysis("Erreur parsing JSON");
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

