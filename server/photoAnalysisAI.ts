import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_CONFIG } from "./geminiConfig";
import { PhotoAnalysis } from "./types";

// Initialisation standard
const genAI = new GoogleGenerativeAI(GEMINI_CONFIG.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.GEMINI_MODEL });

// On utilise maintenant le type PhotoAnalysis exporté globalement
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

export async function analyzeBodyPhotosWithAI(
  photos: { front?: string; side?: string; back?: string },
  userContext?: { sexe?: string; age?: string; objectif?: string }
): Promise<PhotoAnalysisResult> {
  
  const parts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];
  
  const processPhoto = (base64Data: string): { data: string; mimeType: string } => {
    let cleanData = base64Data;
    let mimeType = "image/jpeg";
    
    if (base64Data.includes(";base64,")) {
      const dataParts = base64Data.split(";base64,");
      if (dataParts.length === 2) {
        const extractedMime = dataParts[0].replace("data:", "");
        if (["image/png", "image/gif", "image/webp", "image/jpeg"].includes(extractedMime)) {
          mimeType = extractedMime;
        }
        cleanData = dataParts[1];
      }
    }
    
    cleanData = cleanData.replace(/\s/g, '');
    
    return { data: cleanData, mimeType };
  };
  
  const photoLabels: string[] = [];
  
  if (photos.front) {
    const processed = processPhoto(photos.front);
    parts.push({ inlineData: processed });
    photoLabels.push("Photo 1: Vue de face");
  }
  if (photos.side) {
    const processed = processPhoto(photos.side);
    parts.push({ inlineData: processed });
    photoLabels.push("Photo 2: Vue de profil");
  }
  if (photos.back) {
    const processed = processPhoto(photos.back);
    parts.push({ inlineData: processed });
    photoLabels.push("Photo 3: Vue de dos");
  }
  
  if (parts.length === 0) {
    return getDefaultAnalysis("Aucune photo fournie");
  }
  
  const contextText = userContext 
    ? `\nCONTEXTE CLIENT: Sexe ${userContext.sexe || "non specifie"}, Age ${userContext.age || "non specifie"}, Objectif ${userContext.objectif || "non specifie"}`
    : "";
  
  parts.push({ 
    text: `${PHOTO_ANALYSIS_PROMPT}${contextText}\n\nPhotos fournies: ${photoLabels.join(", ")}\n\nAnalyse ces photos et retourne ton analyse en JSON.` 
  });
  
  try {
    console.log(`[PhotoAnalysis Gemini] Analysing ${photoLabels.length} photos with ${GEMINI_CONFIG.GEMINI_MODEL}...`);
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });
    
    const text = result.response.text() || "";
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[PhotoAnalysis Gemini] No JSON found in response:", text.substring(0, 500));
      return getDefaultAnalysis("JSON non trouve dans la reponse");
    }
    
    let jsonStr = jsonMatch[0];
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
    jsonStr = jsonStr.replace(/\/\/[^\n]*/g, '');
    jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');
    jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, ' ');
    
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[PhotoAnalysis Gemini] JSON parse failed, trying recovery. Raw:", jsonStr.substring(0, 1000));
      try {
        jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        jsonStr = jsonStr.replace(/\n/g, ' ').replace(/\r/g, '');
        jsonStr = jsonStr.replace(/\s+/g, ' ');
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.error("[PhotoAnalysis Gemini] JSON recovery failed:", e);
        return getDefaultAnalysis("Erreur parsing JSON - reponse IA malformee");
      }
    }
    
    console.log(`[PhotoAnalysis Gemini] Analysis complete - confidence: ${(parsed as { confidenceLevel?: number }).confidenceLevel || 70}%`);
    return normalizeAnalysisResult(parsed);
    
  } catch (error) {
    console.error("[PhotoAnalysis Gemini] Error:", error);
    return getDefaultAnalysis("Erreur lors de l'analyse IA Gemini");
  }
}

function normalizeAnalysisResult(parsed: Record<string, unknown>): PhotoAnalysisResult {
  return {
    fatDistribution: {
      visceral: (parsed.fatDistribution as Record<string, unknown>)?.visceral as PhotoAnalysisResult["fatDistribution"]["visceral"] || "modere",
      subcutaneous: (parsed.fatDistribution as Record<string, unknown>)?.subcutaneous as PhotoAnalysisResult["fatDistribution"]["subcutaneous"] || "modere",
      zones: ((parsed.fatDistribution as Record<string, unknown>)?.zones as string[]) || [],
      estimatedBF: ((parsed.fatDistribution as Record<string, unknown>)?.estimatedBF as string) || "Non estime",
      waistToHipRatio: ((parsed.fatDistribution as Record<string, unknown>)?.waistToHipRatio as string) || "Non estime",
    },
    posture: {
      headPosition: ((parsed.posture as Record<string, unknown>)?.headPosition as string) || "Non evalue",
      shoulderAlignment: ((parsed.posture as Record<string, unknown>)?.shoulderAlignment as string) || "Non evalue",
      spineAlignment: ((parsed.posture as Record<string, unknown>)?.spineAlignment as string) || "Non evalue",
      pelvicTilt: ((parsed.posture as Record<string, unknown>)?.pelvicTilt as string) || "Non evalue",
      kneesAlignment: ((parsed.posture as Record<string, unknown>)?.kneesAlignment as string) || "Non evalue",
      overallScore: ((parsed.posture as Record<string, unknown>)?.overallScore as number) || 50,
      issues: ((parsed.posture as Record<string, unknown>)?.issues as string[]) || [],
    },
    muscularBalance: {
      upperBody: ((parsed.muscularBalance as Record<string, unknown>)?.upperBody as string) || "Non evalue",
      lowerBody: ((parsed.muscularBalance as Record<string, unknown>)?.lowerBody as string) || "Non evalue",
      leftRightSymmetry: ((parsed.muscularBalance as Record<string, unknown>)?.leftRightSymmetry as string) || "Non evalue",
      anteriorPosterior: ((parsed.muscularBalance as Record<string, unknown>)?.anteriorPosterior as string) || "Non evalue",
      weakAreas: ((parsed.muscularBalance as Record<string, unknown>)?.weakAreas as string[]) || [],
      strongAreas: ((parsed.muscularBalance as Record<string, unknown>)?.strongAreas as string[]) || [],
    },
    medicalObservations: {
      skinCondition: ((parsed.medicalObservations as Record<string, unknown>)?.skinCondition as string[]) || [],
      edemaPresence: ((parsed.medicalObservations as Record<string, unknown>)?.edemaPresence as string) || "Non observe",
      vascularSigns: ((parsed.medicalObservations as Record<string, unknown>)?.vascularSigns as string[]) || [],
      potentialConcerns: ((parsed.medicalObservations as Record<string, unknown>)?.potentialConcerns as string[]) || [],
    },
    recommendations: {
      posturalCorrections: ((parsed.recommendations as Record<string, unknown>)?.posturalCorrections as string[]) || [],
      muscleGroupsToTarget: ((parsed.recommendations as Record<string, unknown>)?.muscleGroupsToTarget as string[]) || [],
      mobilityWork: ((parsed.recommendations as Record<string, unknown>)?.mobilityWork as string[]) || [],
      medicalFollowUp: ((parsed.recommendations as Record<string, unknown>)?.medicalFollowUp as string[]) || [],
    },
    summary: (parsed.summary as string) || "Analyse completee",
    confidenceLevel: (parsed.confidenceLevel as number) || 70,
  };
}

function getDefaultAnalysis(reason: string): PhotoAnalysisResult {
  return {
    fatDistribution: {
      visceral: "modere",
      subcutaneous: "modere",
      zones: [],
      estimatedBF: "Non disponible - " + reason,
      waistToHipRatio: "Non disponible",
    },
    posture: {
      headPosition: "Non evalue - photos requises",
      shoulderAlignment: "Non evalue",
      spineAlignment: "Non evalue",
      pelvicTilt: "Non evalue",
      kneesAlignment: "Non evalue",
      overallScore: 50,
      issues: ["Analyse photo non disponible: " + reason],
    },
    muscularBalance: {
      upperBody: "Non evalue",
      lowerBody: "Non evalue",
      leftRightSymmetry: "Non evalue",
      anteriorPosterior: "Non evalue",
      weakAreas: [],
      strongAreas: [],
    },
    medicalObservations: {
      skinCondition: [],
      edemaPresence: "Non observe",
      vascularSigns: [],
      potentialConcerns: [],
    },
    recommendations: {
      posturalCorrections: ["Fournir des photos pour une analyse posturale complete"],
      muscleGroupsToTarget: [],
      mobilityWork: [],
      medicalFollowUp: [],
    },
    summary: `Analyse photo non realisee: ${reason}. Pour une analyse complete, veuillez fournir 3 photos (face, profil, dos) en bonne qualite et eclairage.`,
    confidenceLevel: 0,
  };
}

export function formatPhotoAnalysisForReport(analysis: PhotoAnalysisResult, prenom?: string): string {
  if (analysis.confidenceLevel === 0) {
    return analysis.summary;
  }
  
  const name = prenom || "toi";
  let report = "";
  
  report += `Alors ${name}, je vais te decrypter ce que je vois sur tes photos. C'est un moment cle parce que les chiffres c'est bien, mais la realite visuelle ne ment pas.\n\n`;
  
  report += `TA COMPOSITION CORPORELLE\n\n`;
  report += `Ta graisse viscerale est ${analysis.fatDistribution.visceral}, et ta graisse sous-cutanee est ${analysis.fatDistribution.subcutaneous}. `;
  if (analysis.fatDistribution.zones.length > 0) {
    report += `Tes zones de stockage principales : ${analysis.fatDistribution.zones.join(", ")}. `;
  }
  // Ne pas afficher de chiffres précis (WHR, BF %) si non mesurés
  const bfStr = analysis.fatDistribution.estimatedBF || "";
  const whrStr = analysis.fatDistribution.waistToHipRatio || "";
  // Si BF contient un % ou chiffres, utiliser description qualitative
  if (bfStr && !bfStr.includes("Non") && !bfStr.includes("disponible")) {
    if (bfStr.match(/\d+%/) || bfStr.match(/\d+-\d+%/)) {
      // C'est un chiffre, remplacer par tendance qualitative
      report += `Tendance composition corporelle : modérée-élevée (analyse visuelle, sans mesure précise). `;
    } else {
      report += `Tendance composition corporelle : ${bfStr}. `;
    }
  }
  // Si WHR contient un chiffre (0.XX), ne pas l'afficher
  if (whrStr && !whrStr.includes("Non") && !whrStr.includes("disponible")) {
    if (whrStr.match(/0\.\d+/)) {
      // C'est un chiffre inventé, utiliser pattern hormonal à la place
      report += `Distribution graisseuse : ${analysis.fatDistribution.hormonalPattern || "tendance de stockage abdominal (analyse visuelle)"}. `;
    } else {
      // C'est déjà une description qualitative
      report += `Distribution graisseuse : ${whrStr}. `;
    }
  } else {
    // Utiliser pattern hormonal comme fallback
    report += `Distribution graisseuse : ${analysis.fatDistribution.hormonalPattern || "analyse basée sur photos statiques"}. `;
  }
  report += `\n\nIMPORTANT : Analyse basée sur photos statiques. Pour mesures précises (tour de taille/hanches selon protocole standardisé, % masse grasse), utilise repères anatomiques et équipements validés.\n\n`;
  
  report += `TA POSTURE (Score: ${analysis.posture.overallScore}/100 - analyse basée sur photos statiques)\n`;
  report += `Ta tete : ${analysis.posture.headPosition}. Tes epaules : ${analysis.posture.shoulderAlignment}. `;
  report += `Ta colonne : ${analysis.posture.spineAlignment}. Ton bassin : ${analysis.posture.pelvicTilt}. Tes genoux : ${analysis.posture.kneesAlignment}.\n`;
  if (analysis.posture.issues.length > 0) {
    report += `Indices observés sur photos statiques : ${analysis.posture.issues.join("; ")}. À confirmer par tests vidéo simples pour validation.\n\n`;
  }
  
  report += `TON EQUILIBRE MUSCULAIRE\n`;
  report += `Ton haut du corps : ${analysis.muscularBalance.upperBody}. Ton bas du corps : ${analysis.muscularBalance.lowerBody}. `;
  report += `Ta symetrie gauche/droite : ${analysis.muscularBalance.leftRightSymmetry}. Ton equilibre avant/arriere : ${analysis.muscularBalance.anteriorPosterior}.\n`;
  if (analysis.muscularBalance.weakAreas.length > 0) {
    report += `Les zones ou tu dois bosser : ${analysis.muscularBalance.weakAreas.join(", ")}. `;
  }
  if (analysis.muscularBalance.strongAreas.length > 0) {
    report += `Tes points forts : ${analysis.muscularBalance.strongAreas.join(", ")}.\n\n`;
  }
  
  if (analysis.medicalObservations.potentialConcerns.length > 0 || analysis.medicalObservations.skinCondition.length > 0) {
    report += `CE QUE JE NOTE AUSSI\n`;
    if (analysis.medicalObservations.skinCondition.length > 0) {
      report += `Ta peau : ${analysis.medicalObservations.skinCondition.join(", ")}. `;
    }
    report += `Oedeme : ${analysis.medicalObservations.edemaPresence}. `;
    if (analysis.medicalObservations.vascularSigns.length > 0) {
      report += `Signes vasculaires : ${analysis.medicalObservations.vascularSigns.join(", ")}. `;
    }
    if (analysis.medicalObservations.potentialConcerns.length > 0) {
      report += `\nPoints a surveiller : ${analysis.medicalObservations.potentialConcerns.join("; ")}.\n\n`;
    }
  }
  
  report += `CE QUE TU DOIS FAIRE\n`;
  if (analysis.recommendations.posturalCorrections.length > 0) {
    report += `Pour ta posture : ${analysis.recommendations.posturalCorrections.join("; ")}. `;
  }
  if (analysis.recommendations.muscleGroupsToTarget.length > 0) {
    report += `\nMuscles a cibler en priorite : ${analysis.recommendations.muscleGroupsToTarget.join(", ")}. `;
  }
  if (analysis.recommendations.mobilityWork.length > 0) {
    report += `\nMobilite a travailler : ${analysis.recommendations.mobilityWork.join("; ")}. `;
  }
  if (analysis.recommendations.medicalFollowUp.length > 0) {
    report += `\nJe te conseille aussi de voir un pro pour : ${analysis.recommendations.medicalFollowUp.join("; ")}.`;
  }
  
  report += `\n\n${analysis.summary} (Fiabilite de mon analyse : ${analysis.confidenceLevel}%)`;
  
  return report;
}
