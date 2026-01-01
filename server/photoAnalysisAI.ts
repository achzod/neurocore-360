import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_CONFIG } from "./geminiConfig";

// ⚠️ SDK standard @google/generative-ai - fonctionne partout (Replit, Render, local)
const genAI = new GoogleGenerativeAI(GEMINI_CONFIG.GEMINI_API_KEY);

// 🔥 Modèle spécialisé VISION pour analyse photos corporelles
// gemini-2.5-pro supporte nativement la vision (images + texte)
const VISION_MODEL = "gemini-2.5-pro";

const model = genAI.getGenerativeModel({
  model: VISION_MODEL,
});

console.log(`[PhotoAnalysis] Using vision model: ${VISION_MODEL}`);

export interface PhotoAnalysisResult {
  fatDistribution: {
    visceral: "faible" | "modere" | "eleve" | "tres-eleve";
    subcutaneous: "faible" | "modere" | "eleve" | "tres-eleve";
    zones: string[];
    estimatedBF: string;
    waistToHipRatio: string;
    insulinResistanceSigns?: string;
  };
  posture: {
    headPosition: string;
    shoulderAlignment: string;
    spineAlignment: string;
    pelvicTilt: string;
    kneesAlignment: string;
    footPosition?: string;
    overallScore: number;
    issues: string[];
  };
  muscularBalance: {
    upperBody: string;
    lowerBody: string;
    leftRightSymmetry: string;
    anteriorPosterior: string;
    weakAreas: string[];
    strongAreas: string[];
    trainingLevel?: string;
  };
  medicalObservations: {
    skinCondition: string[];
    edemaPresence: string;
    vascularSigns: string[];
    hormonalSigns?: string[];
    potentialConcerns: string[];
  };
  recommendations: {
    posturalCorrections: string[];
    muscleGroupsToTarget: string[];
    mobilityWork: string[];
    stretchingProtocol?: string[];
    medicalFollowUp: string[];
  };
  expertSummary?: {
    primaryFindings: string;
    metabolicProfile: string;
    trainingPriorities: string;
    redFlags: string;
  };
  summary: string;
  confidenceLevel: number;
}

const PHOTO_ANALYSIS_PROMPT = `Tu es un EXPERT de classe mondiale combinant les compétences de :
- Médecin du sport spécialisé composition corporelle (niveau Dr. Peter Attia)
- Kinésithérapeute postural certifié (méthode Mézières/McKenzie)
- Physiologiste musculaire (Dr. Andy Galpin)
- Endocrinologue clinique (patterns hormonaux visibles)

MISSION : Analyse EXPERTE EXHAUSTIVE des 3 photos corporelles (face, dos, profil).

=== MÉTHODOLOGIE D'ANALYSE ===

1. COMPOSITION CORPORELLE DÉTAILLÉE :
   - Estimation % masse grasse PRÉCISE (pas de fourchette large) avec justification visuelle
   - Pattern de stockage : androïde (viscéral) vs gynoïde (sous-cutané périphérique)
   - Ratio taille/hanches estimé et signification métabolique
   - Signes visuels de résistance à l'insuline (acanthosis nigricans, adiposité centrale)
   - Qualité de la peau (hydratation, cellulite, vergetures = historique pondéral)

2. ANALYSE MUSCULAIRE BILATÉRALE :
   - Asymétries gauche/droite PRÉCISES (deltoïdes, trapèzes, obliques, quadriceps, mollets)
   - Ratio développement anterior/posterior (poitrine vs dos)
   - Groupes musculaires HYPERTROPHIQUES (overdeveloped)
   - Groupes musculaires ATROPHIQUES (underdeveloped)  
   - Estimation du niveau d'entraînement (débutant/intermédiaire/avancé)

3. ANALYSE POSTURALE BIOMÉCANIQUE :
   - Position cervicale (forward head posture - mesure en cm estimée)
   - Cyphose thoracique (degré : légère/modérée/prononcée)
   - Lordose lombaire (normale/hyperlordose/hypolordose)
   - Bascule pelvienne (antérieure/postérieure/neutre)
   - Valgus/varus des genoux
   - Position des pieds (pronation/supination)
   - Épaules : protrusion, élévation asymétrique, rotation interne

4. SIGNES MÉDICAUX/HORMONAUX VISIBLES :
   - Gynécomastie (développement tissu mammaire masculin)
   - Pattern de pilosité (testostérone)
   - Rétention d'eau (œdème périphérique)
   - Signes inflammatoires cutanés
   - Varices, télangiectasies
   - Cicatrices, décolorations

REPONDS UNIQUEMENT avec ce JSON (pas de texte avant/apres, pas de markdown) :

{
  "fatDistribution": {
    "visceral": "faible|modere|eleve|tres-eleve",
    "subcutaneous": "faible|modere|eleve|tres-eleve",
    "zones": ["4 zones PRÉCISES avec intensité: ex: 'abdomen inférieur (++)', 'flancs latéraux (+)', 'région sous-scapulaire (+)', 'cuisses internes (+)'"],
    "estimatedBF": "XX% (justification: visible définition abs/veines/séparation musculaire)",
    "waistToHipRatio": "0.XX - Pattern [androïde/gynoïde] - Risque métabolique [faible/modéré/élevé]",
    "insulinResistanceSigns": "description signes visibles ou 'aucun signe visible'"
  },
  "posture": {
    "headPosition": "Forward head posture ~Xcm / cervicales neutres",
    "shoulderAlignment": "Description PRÉCISE: protrusion [X°], rotation interne [gauche/droite/bilatéral], élévation asymétrique [gauche+Xcm]",
    "spineAlignment": "Cyphose [degré], lordose [type], scoliose [si visible]",
    "pelvicTilt": "Bascule [antérieure Xmm / postérieure / neutre], impact sur lordose lombaire",
    "kneesAlignment": "Valgus/varus [degré], hyperextension [oui/non]",
    "footPosition": "Pronation/supination, arches [plates/normales/creuses]",
    "overallScore": 0-100,
    "issues": ["3 problèmes PRIORITAIRES avec impact fonctionnel"]
  },
  "muscularBalance": {
    "upperBody": "Développement deltoïdes [ant/lat/post], trapèzes [sup/moy/inf], pectoraux, dorsaux - asymétries notées",
    "lowerBody": "Quadriceps [vaste ext/int/droit], ischio-jambiers, fessiers [max/med/min], mollets - asymétries notées",
    "leftRightSymmetry": "Asymétries PRÉCISES: ex 'deltoïde gauche +15%, oblique droit -10%'",
    "anteriorPosterior": "Ratio ant/post estimé, déséquilibre [chaîne antérieure dominante / postérieure / équilibré]",
    "weakAreas": ["3 groupes ATROPHIQUES avec impact fonctionnel"],
    "strongAreas": ["3 groupes HYPERTROPHIQUES"],
    "trainingLevel": "Débutant / Intermédiaire / Avancé - justification visuelle"
  },
  "medicalObservations": {
    "skinCondition": ["Observations PRÉCISES: texture, hydratation, cellulite grade, vergetures, pigmentation"],
    "edemaPresence": "Localisation et degré si présent, ou 'Aucun œdème visible'",
    "vascularSigns": ["Varices, télangiectasies, veines visibles (vascularisation ou insuffisance)"],
    "hormonalSigns": ["Gynécomastie, pattern adipeux hormonal, pilosité, signes thyroïdiens"],
    "potentialConcerns": ["Observations nécessitant attention médicale"]
  },
  "recommendations": {
    "posturalCorrections": ["3 exercices ULTRA-PRÉCIS avec sets/reps: ex 'Chin tucks 3x15 (30s hold) + Wall angels 3x12 + Face pulls 4x15'"],
    "muscleGroupsToTarget": ["3 groupes PRIORITAIRES à renforcer avec exercices spécifiques"],
    "mobilityWork": ["3 exercices mobilité PRÉCIS: ex 'Hip flexor stretch 90/90 2x60s chaque côté'"],
    "stretchingProtocol": ["2 protocoles étirements pour déséquilibres identifiés"],
    "medicalFollowUp": ["Recommandations spécifiques si signes médicaux identifiés"]
  },
  "expertSummary": {
    "primaryFindings": "3 findings MAJEURS identifiés",
    "metabolicProfile": "Profil métabolique résumé",
    "trainingPriorities": "Top 3 priorités entraînement",
    "redFlags": "Signaux d'alerte nécessitant suivi"
  },
  "summary": "Synthèse EXPERTE en 4-5 phrases: profil global, points forts, axes d'amélioration prioritaires, recommandation clé",
  "confidenceLevel": 85-98
}

RÈGLES STRICTES :
1. Sois EXPERT et PRÉCIS - pas de généralités
2. Cite des MESURES/DEGRÉS estimés quand possible
3. Identifie les ASYMÉTRIES bilatérales
4. Note les patterns HORMONAUX visibles
5. Donne des exercices avec SETS/REPS précis
6. JSON VALIDE uniquement - pas de commentaires`;

export async function analyzeBodyPhotosWithAI(
  photos: string[] | { front?: string; side?: string; back?: string },
  userContext?: { sexe?: string; age?: string; objectif?: string }
): Promise<PhotoAnalysisResult> {
  
  // ⚠️ FIX: Support both array and object format
  let photoObj: { front?: string; side?: string; back?: string };
  if (Array.isArray(photos)) {
    photoObj = {
      front: photos[0],
      side: photos[1],
      back: photos[2],
    };
  } else {
    photoObj = photos;
  }
  
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
  
  if (photoObj.front) {
    const processed = processPhoto(photoObj.front);
    parts.push({ inlineData: processed });
    photoLabels.push("Photo 1: Vue de face");
  }
  if (photoObj.side) {
    const processed = processPhoto(photoObj.side);
    parts.push({ inlineData: processed });
    photoLabels.push("Photo 2: Vue de profil");
  }
  if (photoObj.back) {
    const processed = processPhoto(photoObj.back);
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
    
    // ⚠️ SDK standard @google/generative-ai
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        maxOutputTokens: 8192,
      }
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
  const fat = parsed.fatDistribution as Record<string, unknown> || {};
  const posture = parsed.posture as Record<string, unknown> || {};
  const muscle = parsed.muscularBalance as Record<string, unknown> || {};
  const medical = parsed.medicalObservations as Record<string, unknown> || {};
  const recs = parsed.recommendations as Record<string, unknown> || {};
  const expert = parsed.expertSummary as Record<string, unknown> || {};

  return {
    fatDistribution: {
      visceral: fat.visceral as PhotoAnalysisResult["fatDistribution"]["visceral"] || "modere",
      subcutaneous: fat.subcutaneous as PhotoAnalysisResult["fatDistribution"]["subcutaneous"] || "modere",
      zones: (fat.zones as string[]) || [],
      estimatedBF: (fat.estimatedBF as string) || "Non estime",
      waistToHipRatio: (fat.waistToHipRatio as string) || "Non estime",
      insulinResistanceSigns: (fat.insulinResistanceSigns as string) || "Non évalué",
    },
    posture: {
      headPosition: (posture.headPosition as string) || "Non evalue",
      shoulderAlignment: (posture.shoulderAlignment as string) || "Non evalue",
      spineAlignment: (posture.spineAlignment as string) || "Non evalue",
      pelvicTilt: (posture.pelvicTilt as string) || "Non evalue",
      kneesAlignment: (posture.kneesAlignment as string) || "Non evalue",
      footPosition: (posture.footPosition as string) || "Non évalué",
      overallScore: (posture.overallScore as number) || 50,
      issues: (posture.issues as string[]) || [],
    },
    muscularBalance: {
      upperBody: (muscle.upperBody as string) || "Non evalue",
      lowerBody: (muscle.lowerBody as string) || "Non evalue",
      leftRightSymmetry: (muscle.leftRightSymmetry as string) || "Non evalue",
      anteriorPosterior: (muscle.anteriorPosterior as string) || "Non evalue",
      weakAreas: (muscle.weakAreas as string[]) || [],
      strongAreas: (muscle.strongAreas as string[]) || [],
      trainingLevel: (muscle.trainingLevel as string) || "Non évalué",
    },
    medicalObservations: {
      skinCondition: (medical.skinCondition as string[]) || [],
      edemaPresence: (medical.edemaPresence as string) || "Non observe",
      vascularSigns: (medical.vascularSigns as string[]) || [],
      hormonalSigns: (medical.hormonalSigns as string[]) || [],
      potentialConcerns: (medical.potentialConcerns as string[]) || [],
    },
    recommendations: {
      posturalCorrections: (recs.posturalCorrections as string[]) || [],
      muscleGroupsToTarget: (recs.muscleGroupsToTarget as string[]) || [],
      mobilityWork: (recs.mobilityWork as string[]) || [],
      stretchingProtocol: (recs.stretchingProtocol as string[]) || [],
      medicalFollowUp: (recs.medicalFollowUp as string[]) || [],
    },
    expertSummary: expert.primaryFindings ? {
      primaryFindings: (expert.primaryFindings as string) || "",
      metabolicProfile: (expert.metabolicProfile as string) || "",
      trainingPriorities: (expert.trainingPriorities as string) || "",
      redFlags: (expert.redFlags as string) || "Aucun",
    } : undefined,
    summary: (parsed.summary as string) || "Analyse EXPERTE completee",
    confidenceLevel: (parsed.confidenceLevel as number) || 85,
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
      insulinResistanceSigns: "Non évalué",
    },
    posture: {
      headPosition: "Non evalue - photos requises",
      shoulderAlignment: "Non evalue",
      spineAlignment: "Non evalue",
      pelvicTilt: "Non evalue",
      kneesAlignment: "Non evalue",
      footPosition: "Non évalué",
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
      trainingLevel: "Non évalué",
    },
    medicalObservations: {
      skinCondition: [],
      edemaPresence: "Non observe",
      vascularSigns: [],
      hormonalSigns: [],
      potentialConcerns: [],
    },
    recommendations: {
      posturalCorrections: ["Fournir des photos pour une analyse posturale complete"],
      muscleGroupsToTarget: [],
      mobilityWork: [],
      stretchingProtocol: [],
      medicalFollowUp: [],
    },
    expertSummary: {
      primaryFindings: "Photos requises pour analyse",
      metabolicProfile: "Non évalué",
      trainingPriorities: "Non évalué",
      redFlags: "Aucun",
    },
    summary: `Analyse photo non realisee: ${reason}. Pour une analyse EXPERTE complete, veuillez fournir 3 photos (face, profil, dos) en bonne qualite avec eclairage uniforme.`,
    confidenceLevel: 0,
  };
}

export function formatPhotoAnalysisForReport(analysis: PhotoAnalysisResult, prenom?: string): string {
  if (analysis.confidenceLevel === 0) {
    return analysis.summary;
  }
  
  const name = prenom || "toi";
  let report = "";
  
  report += `${name}, voici mon analyse EXPERTE de tes photos corporelles. Cette evaluation visuelle est aussi importante que tes reponses au questionnaire - elle revele ce que les chiffres seuls ne peuvent pas montrer.\n\n`;
  
  // Expert Summary first if available
  if (analysis.expertSummary) {
    report += `=== DIAGNOSTIC PRINCIPAL ===\n`;
    report += `Findings majeurs : ${analysis.expertSummary.primaryFindings}\n`;
    report += `Profil metabolique : ${analysis.expertSummary.metabolicProfile}\n`;
    report += `Priorites entrainement : ${analysis.expertSummary.trainingPriorities}\n`;
    if (analysis.expertSummary.redFlags && analysis.expertSummary.redFlags !== "Aucun") {
      report += `Signaux d'alerte : ${analysis.expertSummary.redFlags}\n`;
    }
    report += `\n`;
  }
  
  report += `=== COMPOSITION CORPORELLE DETAILLEE ===\n\n`;
  report += `Graisse viscerale : ${analysis.fatDistribution.visceral.toUpperCase()}\n`;
  report += `Graisse sous-cutanee : ${analysis.fatDistribution.subcutaneous.toUpperCase()}\n`;
  if (analysis.fatDistribution.zones.length > 0) {
    report += `Zones de stockage identifiees :\n`;
    analysis.fatDistribution.zones.forEach(zone => {
      report += `  + ${zone}\n`;
    });
  }
  report += `Taux de masse grasse estime : ${analysis.fatDistribution.estimatedBF}\n`;
  report += `Ratio taille/hanches : ${analysis.fatDistribution.waistToHipRatio}\n`;
  if (analysis.fatDistribution.insulinResistanceSigns) {
    report += `Signes de resistance a l'insuline : ${analysis.fatDistribution.insulinResistanceSigns}\n`;
  }
  report += `\n`;
  
  report += `=== ANALYSE POSTURALE BIOMECANIQUE (Score: ${analysis.posture.overallScore}/100) ===\n\n`;
  report += `Position cervicale : ${analysis.posture.headPosition}\n`;
  report += `Alignement epaules : ${analysis.posture.shoulderAlignment}\n`;
  report += `Colonne vertebrale : ${analysis.posture.spineAlignment}\n`;
  report += `Bascule pelvienne : ${analysis.posture.pelvicTilt}\n`;
  report += `Genoux : ${analysis.posture.kneesAlignment}\n`;
  if (analysis.posture.footPosition) {
    report += `Position des pieds : ${analysis.posture.footPosition}\n`;
  }
  if (analysis.posture.issues.length > 0) {
    report += `\nProblemes PRIORITAIRES identifies :\n`;
    analysis.posture.issues.forEach(issue => {
      report += `  ! ${issue}\n`;
    });
  }
  report += `\n`;
  
  report += `=== EQUILIBRE MUSCULAIRE BILATERAL ===\n\n`;
  report += `Haut du corps : ${analysis.muscularBalance.upperBody}\n`;
  report += `Bas du corps : ${analysis.muscularBalance.lowerBody}\n`;
  report += `Symetrie gauche/droite : ${analysis.muscularBalance.leftRightSymmetry}\n`;
  report += `Equilibre anterior/posterior : ${analysis.muscularBalance.anteriorPosterior}\n`;
  if (analysis.muscularBalance.trainingLevel) {
    report += `Niveau d'entrainement estime : ${analysis.muscularBalance.trainingLevel}\n`;
  }
  if (analysis.muscularBalance.weakAreas.length > 0) {
    report += `\nGroupes musculaires ATROPHIQUES a renforcer :\n`;
    analysis.muscularBalance.weakAreas.forEach(area => {
      report += `  - ${area}\n`;
    });
  }
  if (analysis.muscularBalance.strongAreas.length > 0) {
    report += `\nGroupes musculaires HYPERTROPHIQUES (points forts) :\n`;
    analysis.muscularBalance.strongAreas.forEach(area => {
      report += `  + ${area}\n`;
    });
  }
  report += `\n`;
  
  report += `=== OBSERVATIONS MEDICALES & HORMONALES ===\n\n`;
  if (analysis.medicalObservations.skinCondition.length > 0) {
    report += `Etat cutane : ${analysis.medicalObservations.skinCondition.join("; ")}\n`;
  }
  report += `Oedeme : ${analysis.medicalObservations.edemaPresence}\n`;
  if (analysis.medicalObservations.vascularSigns.length > 0) {
    report += `Signes vasculaires : ${analysis.medicalObservations.vascularSigns.join("; ")}\n`;
  }
  if (analysis.medicalObservations.hormonalSigns && analysis.medicalObservations.hormonalSigns.length > 0) {
    report += `Signes hormonaux : ${analysis.medicalObservations.hormonalSigns.join("; ")}\n`;
  }
  if (analysis.medicalObservations.potentialConcerns.length > 0) {
    report += `\nPoints de vigilance medicale :\n`;
    analysis.medicalObservations.potentialConcerns.forEach(concern => {
      report += `  ! ${concern}\n`;
    });
  }
  report += `\n`;
  
  report += `=== PROTOCOLE CORRECTIF PERSONNALISE ===\n\n`;
  if (analysis.recommendations.posturalCorrections.length > 0) {
    report += `CORRECTIONS POSTURALES (avec sets/reps) :\n`;
    analysis.recommendations.posturalCorrections.forEach((corr, i) => {
      report += `  ${i+1}. ${corr}\n`;
    });
    report += `\n`;
  }
  if (analysis.recommendations.muscleGroupsToTarget.length > 0) {
    report += `GROUPES MUSCULAIRES PRIORITAIRES :\n`;
    analysis.recommendations.muscleGroupsToTarget.forEach((group, i) => {
      report += `  ${i+1}. ${group}\n`;
    });
    report += `\n`;
  }
  if (analysis.recommendations.mobilityWork.length > 0) {
    report += `TRAVAIL DE MOBILITE :\n`;
    analysis.recommendations.mobilityWork.forEach((mob, i) => {
      report += `  ${i+1}. ${mob}\n`;
    });
    report += `\n`;
  }
  if (analysis.recommendations.stretchingProtocol && analysis.recommendations.stretchingProtocol.length > 0) {
    report += `PROTOCOLE ETIREMENTS :\n`;
    analysis.recommendations.stretchingProtocol.forEach((stretch, i) => {
      report += `  ${i+1}. ${stretch}\n`;
    });
    report += `\n`;
  }
  if (analysis.recommendations.medicalFollowUp.length > 0) {
    report += `SUIVI MEDICAL RECOMMANDE :\n`;
    analysis.recommendations.medicalFollowUp.forEach(follow => {
      report += `  + ${follow}\n`;
    });
    report += `\n`;
  }
  
  report += `=== SYNTHESE EXPERTE ===\n\n`;
  report += `${analysis.summary}\n\n`;
  report += `Niveau de confiance de cette analyse : ${analysis.confidenceLevel}%`;
  
  return report;
}

