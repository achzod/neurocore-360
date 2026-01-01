import Anthropic from "@anthropic-ai/sdk";
import { getAllResponsesFormatted, getSectionPromptData } from "./responsePreprocessor";
import { analyzeBodyPhotosWithAI, PhotoAnalysisResult } from "./photoAnalysisAI";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

type Responses = Record<string, unknown>;

interface SupplementProtocol {
  name: string;
  dosage: string;
  timing: string;
  duration: string;
  why: string;
  brands: string[];
  warnings?: string;
}

interface NarrativeSection {
  id: string;
  title: string;
  score: number;
  level: "excellent" | "bon" | "moyen" | "faible";
  isPremium: boolean;
  introduction: string;
  whatIsWrong: string;
  personalizedAnalysis: string;
  recommendations: string;
  supplements: SupplementProtocol[];
  actionPlan: string;
  scienceDeepDive: string;
  teaser?: string;
}

interface NarrativeReport {
  global: number;
  auditType: string;
  heroSummary: string;
  executiveNarrative: string;
  globalDiagnosis: string;
  sections: NarrativeSection[];
  prioritySections: string[];
  strengthSections: string[];
  supplementStack: SupplementProtocol[];
  lifestyleProtocol: string;
  weeklyPlan: {
    week1: string;
    week2: string;
    weeks3_4: string;
    months2_3: string;
  };
  photoAnalysis?: {
    summary: string;
    postureAnalysis: string;
    muscularAnalysis: string;
    fatAnalysis: string;
    recommendations: string;
    correctiveProtocol: string;
    score: number;
  };
  conclusion: string;
}

// ============================================================================
// CONFIGURATION DES SECTIONS
// ============================================================================

const SECTION_CONFIG: Array<{id: string; title: string; premium: boolean; expert: string; focus: string}> = [
  {
    id: "profil-base",
    title: "Profil de Base",
    premium: false,
    expert: "Médecin anti-âge spécialiste longévité",
    focus: "Fenêtre hormonale selon âge, vieillissement biologique, NMN/NR/Resvératrol si >30 ans"
  },
  {
    id: "composition-corporelle",
    title: "Composition Corporelle",
    premium: false,
    expert: "Coach physique élite recomposition",
    focus: "BF% estimé, ratio taille/hanches, stratégie recomp/cut/bulk, créatine 5g, déficit/surplus précis"
  },
  {
    id: "metabolisme-energie",
    title: "Métabolisme & Énergie",
    premium: false,
    expert: "Spécialiste mitochondrial",
    focus: "Flexibilité métabolique, crashes glycémiques, CoQ10 Ubiquinol 200mg, PQQ 20mg, ALCAR 1g"
  },
  {
    id: "nutrition-tracking",
    title: "Nutrition",
    premium: false,
    expert: "Nutritionniste fonctionnel",
    focus: "Protéines 2g/kg, leucine threshold 3g/repas, timing alimentaire, oméga-3 index 8-12%"
  },
  {
    id: "digestion-microbiome",
    title: "Digestion & Microbiome",
    premium: true,
    expert: "Gastro-entérologue fonctionnel",
    focus: "Protocole 5R, L-Glutamine 5g, Zinc-Carnosine 75mg, probiotiques souches spécifiques"
  },
  {
    id: "activite-performance",
    title: "Activité & Performance",
    premium: true,
    expert: "Préparateur physique élite",
    focus: "Périodisation, RPE, citrulline 6-8g, beta-alanine 3-6g, créatine, récupération"
  },
  {
    id: "sommeil-recuperation",
    title: "Sommeil & Récupération",
    premium: true,
    expert: "Somnologue expert chronobiologie",
    focus: "Architecture sommeil, L-Théanine 200-400mg, Apigénine 50mg, Mag Threonate, température 18-19°C"
  },
  {
    id: "hrv-cardiaque",
    title: "HRV & Santé Cardiaque",
    premium: true,
    expert: "Cardiologue fonctionnel",
    focus: "RMSSD optimal, cohérence cardiaque 5.5/min, CoQ10, K2 MK-7 200mcg, oméga-3 3-4g"
  },
  {
    id: "analyses-biomarqueurs",
    title: "Analyses & Biomarqueurs",
    premium: true,
    expert: "Médecin fonctionnel",
    focus: "Ranges OPTIMAUX vs normaux, HOMA-IR <1.5, CRP-us <0.5, homocystéine <7, vitamine D 50-80"
  },
  {
    id: "hormones-stress",
    title: "Hormones & Stress",
    premium: true,
    expert: "Endocrinologue fonctionnel",
    focus: "Tongkat Ali 400mg, Fadogia 600mg, Boron 10mg, Ashwagandha KSM-66 600mg, cortisol salivaire"
  },
  {
    id: "lifestyle-substances",
    title: "Lifestyle & Substances",
    premium: true,
    expert: "Médecin lifestyle",
    focus: "TUDCA 250-500mg, NAC 600-1200mg, caféine timing, dopamine detox, lumière circadienne"
  },
  {
    id: "biomecanique-mobilite",
    title: "Biomécanique & Mobilité",
    premium: true,
    expert: "Kinésithérapeute du sport",
    focus: "Analyse posturale, UC-II 40mg, routine coiffe rotateurs, McGill Big 3, ATG protocol"
  },
  {
    id: "psychologie-mental",
    title: "Psychologie & Mental",
    premium: true,
    expert: "Psychologue de la performance",
    focus: "Ashwagandha Sensoril 250mg, Saffron Affron 28mg, L-Théanine, système d'identité"
  },
  {
    id: "neurotransmetteurs",
    title: "Neurotransmetteurs",
    premium: true,
    expert: "Neurobiologiste fonctionnel",
    focus: "Profil dopamine/sérotonine/GABA/acétylcholine, Mucuna 15% L-DOPA 200mg MAX, Alpha-GPC 300mg, 5-HTP 50-100mg"
  },
];

// ============================================================================
// SYSTEM PROMPT OPTIMISÉ
// ============================================================================

const SYSTEM_PROMPT = `Tu es ACHZOD, expert en biohacking métabolique. Tu produis des audits PRÉCIS et ACTIONNABLES.

RÈGLES D'ÉCRITURE ABSOLUES :

1. PHRASES COURTES : max 35 mots par phrase
2. PARAGRAPHES COURTS : max 5 phrases par paragraphe
3. JAMAIS répéter "Tu as déclaré/indiqué" plus de 2 fois par section
4. JAMAIS de sections > 800 mots total
5. TOUJOURS : problème → mécanisme → action concrète

STRUCTURE DE CHAQUE ANALYSE :
- Connecter donnée à conséquence : "Sommeil 6h → cortisol élevé → fatigue après-midi"
- Pas de cours magistral - diagnostic puis actions
- Tableaux pour protocoles, pas de prose interminable

CE QUI EST INTERDIT :
- "consulte un professionnel de santé"
- "selon tes objectifs personnels"
- "il est possible que", "tu ressens probablement"
- "Cette section sera enrichie"
- Répéter les mêmes infos dans plusieurs sections
- Paragraphes de plus de 6 lignes

FORMAT OBLIGATOIRE POUR SUPPLÉMENTS :
Nom (forme biodisponible) | Dosage exact | Marque | Timing précis | Durée

EXEMPLES DE MOLÉCULES AVEC FORMES :
- Magnésium : Glycinate ou Threonate (PAS oxyde)
- CoQ10 : Ubiquinol (PAS ubiquinone si >35 ans)
- B12 : Méthylcobalamine (PAS cyanocobalamine)
- Curcumine : Meriva ou Longvida (PAS curcuma basique)
- Zinc : Picolinate ou Citrate (PAS oxyde)

TON : Coach expert qui parle cash. Direct. Zéro remplissage. Chaque phrase apporte de la valeur.

PERSONNALISATION : Cite les données du client pour justifier chaque recommandation. Pas de conseils génériques.`;

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

function getLevel(score: number): "excellent" | "bon" | "moyen" | "faible" {
  if (score >= 80) return "excellent";
  if (score >= 65) return "bon";
  if (score >= 50) return "moyen";
  return "faible";
}

function cleanGeneratedText(text: string): string {
  if (!text) return "";

  return text
    // Supprimer les répétitions excessives de "Tu as déclaré/indiqué"
    .replace(/(Tu as (déclaré|indiqué|mentionné|renseigné|rapporté)[^.]*\.\s*){3,}/gi, (match) => {
      const sentences = match.split(/\.\s*/).filter(s => s.trim());
      return sentences.slice(0, 2).join('. ') + '. ';
    })
    // Supprimer les placeholders vides
    .replace(/Cette section \w+ sera enrichie[^.]*\./gi, '')
    .replace(/selon tes objectifs personnels/gi, 'pour ton objectif')
    .replace(/consulte un professionnel de santé/gi, '')
    .replace(/il est recommandé de consulter[^.]*\./gi, '')
    // Nettoyer les espaces et backslashes
    .replace(/\\\s*$/gm, "")
    .replace(/\\n\\n/g, "\n\n")
    .replace(/\\"/g, '"')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function generateWithClaude(prompt: string, maxTokens: number = 2048): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
      system: SYSTEM_PROMPT
    });

    const content = message.content[0];
    let text = content.type === "text" ? content.text : "";

    return cleanGeneratedText(text);
  } catch (error) {
    console.error("Claude API error:", error);
    throw error;
  }
}

// ============================================================================
// GÉNÉRATION DU RÉSUMÉ EXÉCUTIF
// ============================================================================

async function generateHeroSummary(responses: Responses, global: number, scores: Record<string, number>): Promise<string> {
  const lowestScores = Object.entries(scores)
    .filter(([key]) => key !== "global")
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);

  const highestScores = Object.entries(scores)
    .filter(([key]) => key !== "global")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  const prompt = `Score global : ${global}%

SCORES LES PLUS BAS : ${lowestScores.map(([k, v]) => `${k}: ${v}%`).join(", ")}
SCORES LES PLUS HAUTS : ${highestScores.map(([k, v]) => `${k}: ${v}%`).join(", ")}

DONNÉES CLIENT :
- Objectif : ${responses["objectif"] || "recomposition"}
- Sommeil : ${responses["duree-sommeil"] || "non renseigné"}
- Stress : ${responses["niveau-stress"] || "non renseigné"}
- Activité : ${responses["niveau-activite"] || "modérée"}

GÉNÈRE un résumé de 4-5 phrases MAXIMUM :
1. Ce que le score global signifie (1 phrase)
2. Le pattern principal qui explique les scores bas (1-2 phrases)
3. Les 2-3 priorités immédiates (1 phrase)
4. Ce qui va bien (1 phrase)

Pas d'introduction. Pas de "Félicitations". Direct.`;

  return generateWithClaude(prompt, 600);
}

async function generateExecutiveSummary(responses: Responses, global: number, scores: Record<string, number>): Promise<string> {
  const allData = getAllResponsesFormatted(responses);

  const prompt = `GÉNÈRE un résumé exécutif de 4 paragraphes COURTS (max 5 phrases chacun).

SCORE GLOBAL : ${global}%
SCORES : ${JSON.stringify(scores)}

${allData}

STRUCTURE (respecte les limites) :

PARAGRAPHE 1 - ÉTAT ACTUEL (max 5 phrases) :
Synthèse du profil. Cite 2-3 données clés. Identifie le pattern dominant.

PARAGRAPHE 2 - PROBLÈMES INTERCONNECTÉS (max 5 phrases) :
Comment les scores bas se renforcent mutuellement. Cascade causale.

PARAGRAPHE 3 - FORCES (max 4 phrases) :
Les 2-3 domaines qui fonctionnent bien. Pourquoi c'est un atout.

PARAGRAPHE 4 - STRATÉGIE (max 4 phrases) :
Vue d'ensemble du plan. Résultats attendus à 90 jours.

TOTAL : Max 400 mots. Pas de remplissage.`;

  return generateWithClaude(prompt, 800);
}

async function generateGlobalDiagnosis(responses: Responses, global: number, scores: Record<string, number>): Promise<string> {
  const allData = getAllResponsesFormatted(responses);

  const prompt = `GÉNÈRE un diagnostic métabolique global de 5 paragraphes DENSES mais CONCIS.

SCORE : ${global}%
SCORES DÉTAILLÉS : ${JSON.stringify(scores)}

${allData}

STRUCTURE (max 600 mots total) :

1. PHÉNOTYPE MÉTABOLIQUE (max 100 mots)
Identifie le type : hyper-cortisolémique, inflammatoire, résistance insuline, etc.
Base-toi sur les données concrètes.

2. AXE HPA & STRESS (max 100 mots)
Niveau de stress déclaré → impact cortisol → conséquences.

3. FONCTION MITOCHONDRIALE (max 100 mots)
Énergie déclarée à différents moments → flexibilité métabolique.

4. INFLAMMATION & HORMONES (max 100 mots)
Déduire le niveau inflammatoire. Impact hormonal probable.

5. CASCADES & PROJECTION (max 100 mots)
Comment les problèmes se renforcent. Ce qui arrive si rien ne change.

Direct. Factuel. Pas de spéculation non fondée.`;

  return generateWithClaude(prompt, 1200);
}

// ============================================================================
// GÉNÉRATION DES SECTIONS
// ============================================================================

async function generateSectionContent(
  config: typeof SECTION_CONFIG[0],
  score: number,
  responses: Responses,
  allScores: Record<string, number>,
  photoContext?: string
): Promise<{
  introduction: string;
  whatIsWrong: string;
  personalizedAnalysis: string;
  recommendations: string;
  supplements: SupplementProtocol[];
  actionPlan: string;
  scienceDeepDive: string;
}> {
  const sectionData = getSectionPromptData(config.id, responses);
  const level = getLevel(score);

  const photoBlock = photoContext ? `
ANALYSE PHOTO (utilise ces données) :
${photoContext}
` : "";

  // Adapter la quantité de contenu selon le score
  const contentLevel = score >= 80 ? "LÉGER" : score >= 65 ? "MODÉRÉ" : "COMPLET";

  const prompt = `EXPERT : ${config.expert}
SECTION : ${config.title}
SCORE : ${score}% (${level})
FOCUS : ${config.focus}

${sectionData}
${photoBlock}

NIVEAU DE CONTENU : ${contentLevel}
${score >= 80 ? "Score excellent → recommandations d'optimisation légères seulement" : ""}
${score < 65 ? "Score bas → protocole complet nécessaire" : ""}

GÉNÈRE un JSON avec ces champs (RESPECTE LES LIMITES) :

{
  "introduction": "[MAX 120 mots] Ce que ce score de ${score}% signifie. 2-3 phrases. Connecte au profil global.",

  "whatIsWrong": "[MAX 150 mots] Problèmes identifiés. Format liste si pertinent. Donnée → conséquence.",

  "personalizedAnalysis": "[MAX 200 mots] Analyse des réponses spécifiques. Comment ça impacte l'objectif de ${responses["objectif"] || "santé"}.",

  "recommendations": "[MAX 250 mots] ACTIONS CONCRÈTES avec timing. Pas de conseils vagues. Adapté aux contraintes (${responses["profession"] || "bureau"}, ${responses["niveau-activite"] || "modéré"}).",

  "supplements": [${score < 75 ? `
    {
      "name": "Nom exact avec forme (ex: Magnésium Glycinate)",
      "dosage": "Dose précise ex: 200mg x2/jour",
      "timing": "Avec repas / avant coucher / à jeun",
      "duration": "8 semaines / permanent / cycling",
      "why": "1-2 phrases : pourquoi pour CE profil",
      "brands": ["Thorne", "NOW Foods", "Life Extension"],
      "warnings": "Contre-indications ou Aucune"
    }` : '"Score > 75% : supplémentation optionnelle"'}
  ],

  "actionPlan": "[MAX 150 mots] Semaine 1 concrète. Jour par jour si pertinent.",

  "scienceDeepDive": "[MAX 150 mots] Mécanismes clés. Voies impliquées. Pour les curieux."
}

RÈGLES :
- Max ${score < 70 ? "4" : "2"} suppléments
- Si score > 80% : juste optimisation, pas de protocole lourd
- JSON VALIDE uniquement
- Total section : MAX 700 mots`;

  const response = await generateWithClaude(prompt, 2500);

  try {
    // Extraire le JSON
    let cleanResponse = response
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let jsonStr = jsonMatch[0]
        .replace(/,\s*\]/g, "]")
        .replace(/,\s*\}/g, "}")
        .replace(/[\u0000-\u001F\u007F]/g, " ");

      const parsed = JSON.parse(jsonStr);

      return {
        introduction: cleanGeneratedText(parsed.introduction || ""),
        whatIsWrong: cleanGeneratedText(parsed.whatIsWrong || ""),
        personalizedAnalysis: cleanGeneratedText(parsed.personalizedAnalysis || ""),
        recommendations: cleanGeneratedText(parsed.recommendations || ""),
        supplements: Array.isArray(parsed.supplements) ? parsed.supplements.filter((s: unknown) => typeof s === 'object') : [],
        actionPlan: cleanGeneratedText(parsed.actionPlan || ""),
        scienceDeepDive: cleanGeneratedText(parsed.scienceDeepDive || "")
      };
    }
  } catch (e) {
    console.error(`[NarrativeAI] Parse error for ${config.id}:`, e);
  }

  // Fallback
  return {
    introduction: `Score de ${score}% en ${config.title}. Cette section nécessite ton attention.`,
    whatIsWrong: "Analyse en cours de génération.",
    personalizedAnalysis: "",
    recommendations: "",
    supplements: [],
    actionPlan: "",
    scienceDeepDive: ""
  };
}

// ============================================================================
// ANALYSE PHOTO AMÉLIORÉE
// ============================================================================

async function generatePhotoAnalysis(
  photoResult: PhotoAnalysisResult,
  responses: Responses
): Promise<NarrativeReport["photoAnalysis"]> {

  const prompt = `ANALYSE PHOTO pour audit métabolique.

DONNÉES PHOTO IA :
- BF% estimé : ${photoResult.fatDistribution.estimatedBF}
- Ratio taille/hanches : ${photoResult.fatDistribution.waistToHipRatio}
- Graisse viscérale : ${photoResult.fatDistribution.visceral}
- Score posture : ${photoResult.posture.overallScore}/100
- Tête : ${photoResult.posture.headPosition}
- Épaules : ${photoResult.posture.shoulderAlignment}
- Bassin : ${photoResult.posture.pelvicTilt}
- Problèmes posturaux : ${photoResult.posture.issues.join(", ") || "Aucun majeur"}
- Zones faibles : ${photoResult.muscularBalance.weakAreas.join(", ") || "Aucune"}
- Points forts : ${photoResult.muscularBalance.strongAreas.join(", ") || "Non spécifié"}

PROFIL CLIENT :
- Objectif : ${responses["objectif"] || "recomposition"}
- Sexe : ${responses["sexe"] || "non précisé"}

GÉNÈRE un JSON avec ces analyses EXPERTES :

{
  "summary": "[3-4 phrases] Synthèse visuelle globale. Ce que les photos révèlent sur le métabolisme et la posture.",

  "postureAnalysis": "[MAX 200 mots] Analyse posturale segment par segment. Identifie les syndromes (Upper/Lower Cross). Muscles raccourcis vs inhibés.",

  "muscularAnalysis": "[MAX 150 mots] Points forts vs faiblesses. Asymétries. Impact sur la performance et les blessures.",

  "fatAnalysis": "[MAX 150 mots] Pattern de stockage (androïde/gynoïde). Implications métaboliques. Zones résistantes.",

  "recommendations": "[MAX 200 mots] Actions prioritaires basées sur l'analyse visuelle.",

  "correctiveProtocol": "[FORMAT TABLEAU] Protocole correctif :
| Zone | Exercice | Sets x Reps | Fréquence |
| ... | ... | ... | ... |"
}

JSON VALIDE uniquement.`;

  const response = await generateWithClaude(prompt, 1500);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: cleanGeneratedText(parsed.summary || photoResult.summary),
        postureAnalysis: cleanGeneratedText(parsed.postureAnalysis || ""),
        muscularAnalysis: cleanGeneratedText(parsed.muscularAnalysis || ""),
        fatAnalysis: cleanGeneratedText(parsed.fatAnalysis || ""),
        recommendations: cleanGeneratedText(parsed.recommendations || ""),
        correctiveProtocol: cleanGeneratedText(parsed.correctiveProtocol || ""),
        score: photoResult.posture.overallScore
      };
    }
  } catch (e) {
    console.error("[NarrativeAI] Photo analysis parse error:", e);
  }

  // Fallback avec données brutes
  return {
    summary: photoResult.summary,
    postureAnalysis: `Score posture : ${photoResult.posture.overallScore}/100. ${photoResult.posture.issues.join(". ") || "Pas de problème majeur identifié."}`,
    muscularAnalysis: `Zones faibles : ${photoResult.muscularBalance.weakAreas.join(", ") || "Aucune"}. Points forts : ${photoResult.muscularBalance.strongAreas.join(", ") || "Non spécifié"}.`,
    fatAnalysis: `BF estimé : ${photoResult.fatDistribution.estimatedBF}. Graisse viscérale : ${photoResult.fatDistribution.visceral}.`,
    recommendations: photoResult.recommendations.posturalCorrections.join(". ") || "Voir protocole correctif.",
    correctiveProtocol: "",
    score: photoResult.posture.overallScore
  };
}

// ============================================================================
// PLAN HEBDOMADAIRE
// ============================================================================

async function generateWeeklyPlan(
  responses: Responses,
  prioritySections: string[],
  scores: Record<string, number>
): Promise<NarrativeReport["weeklyPlan"]> {

  const prompt = `GÉNÈRE un plan 12 semaines CONCRET.

PRIORITÉS (scores les plus bas) : ${prioritySections.join(", ")}
PROFIL : ${responses["profession"] || "bureau"}, activité ${responses["niveau-activite"] || "modérée"}
OBJECTIF : ${responses["objectif"] || "santé"}

JSON avec 4 phases (MAX 150 mots chacune) :

{
  "week1": "FONDATIONS - Actions quotidiennes concrètes. Pas de suppléments encore. Horaires précis. Habitudes à installer.",

  "week2": "CONSOLIDATION - Renforcer semaine 1. Ajouter 2-3 pratiques. Premiers suppléments de base (D3, Magnésium, Oméga-3).",

  "weeks3_4": "OPTIMISATION - Stack complet si scores bas. Ajustements selon ressentis. Métriques à suivre.",

  "months2_3": "MAINTENANCE - Protocole stable. Bilan sanguin à refaire. Objectifs chiffrés à atteindre."
}

Adapté à SES contraintes. Pas de généralités.
JSON VALIDE uniquement.`;

  const response = await generateWithClaude(prompt, 1200);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        week1: cleanGeneratedText(parsed.week1 || ""),
        week2: cleanGeneratedText(parsed.week2 || ""),
        weeks3_4: cleanGeneratedText(parsed.weeks3_4 || ""),
        months2_3: cleanGeneratedText(parsed.months2_3 || "")
      };
    }
  } catch (e) {
    console.error("[NarrativeAI] Weekly plan parse error:", e);
  }

  return {
    week1: "Semaine 1 : Installer les fondations - sommeil régulier, hydratation, réduction écrans le soir.",
    week2: "Semaine 2 : Consolider + introduire suppléments de base (D3/K2, Magnésium, Oméga-3).",
    weeks3_4: "Semaines 3-4 : Optimisation avec stack complet selon tes scores prioritaires.",
    months2_3: "Mois 2-3 : Maintenance et ajustements. Refaire bilan sanguin pour mesurer progrès."
  };
}

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

export type ProgressCallback = (progress: number, section: string) => void;

export async function generateNarrativeReportAI(
  responses: Responses,
  scores: Record<string, number>,
  auditType: string,
  onProgress?: ProgressCallback
): Promise<NarrativeReport> {

  const reportProgress = (p: number, s: string) => {
    if (onProgress) onProgress(p, s);
  };

  const global = scores["global"] || 65;
  console.log(`[NarrativeAI] Starting report - ${auditType} - Score: ${global}%`);

  reportProgress(5, "Analyse du profil...");

  // Génération parallèle des résumés
  const [heroSummary, executiveNarrative, globalDiagnosis] = await Promise.all([
    generateHeroSummary(responses, global, scores),
    generateExecutiveSummary(responses, global, scores),
    generateGlobalDiagnosis(responses, global, scores)
  ]);

  reportProgress(20, "Résumés générés...");

  // Analyse photo si disponible
  let photoResult: PhotoAnalysisResult | null = null;
  let photoAnalysis: NarrativeReport["photoAnalysis"] = undefined;
  let photoContextComposition = "";
  let photoContextBiomecanique = "";

  const hasPhotos = responses["photo-front"] || responses["photo-side"] || responses["photo-back"];

  if (hasPhotos && auditType !== "GRATUIT") {
    reportProgress(25, "Analyse photo IA...");

    try {
      photoResult = await analyzeBodyPhotosWithAI(
        {
          front: responses["photo-front"] as string | undefined,
          side: responses["photo-side"] as string | undefined,
          back: responses["photo-back"] as string | undefined,
        },
        {
          sexe: responses["sexe"] as string | undefined,
          age: responses["age"] as string | undefined,
          objectif: responses["objectif"] as string | undefined,
        }
      );

      if (photoResult.confidenceLevel > 0) {
        photoAnalysis = await generatePhotoAnalysis(photoResult, responses);

        photoContextComposition = `BF% estimé: ${photoResult.fatDistribution.estimatedBF}
Ratio taille/hanches: ${photoResult.fatDistribution.waistToHipRatio}
Graisse viscérale: ${photoResult.fatDistribution.visceral}
Zones de stockage: ${photoResult.fatDistribution.zones.join(", ")}`;

        photoContextBiomecanique = `Score posture: ${photoResult.posture.overallScore}/100
Tête: ${photoResult.posture.headPosition}
Épaules: ${photoResult.posture.shoulderAlignment}
Bassin: ${photoResult.posture.pelvicTilt}
Problèmes: ${photoResult.posture.issues.join(", ")}
Zones faibles: ${photoResult.muscularBalance.weakAreas.join(", ")}
Points forts: ${photoResult.muscularBalance.strongAreas.join(", ")}`;
      }
    } catch (error) {
      console.error("[NarrativeAI] Photo analysis failed:", error);
    }
  }

  reportProgress(30, "Génération des sections...");

  // Préparer les sections
  const sectionsToGenerate = SECTION_CONFIG.map(config => {
    const scoreKey = config.id.replace(/-/g, "");
    const score = scores[scoreKey] || 60 + Math.floor(Math.random() * 20);
    return { config, score };
  });

  const freeSections = sectionsToGenerate.filter(s => !s.config.premium);
  const premiumSections = sectionsToGenerate.filter(s => s.config.premium);

  // Fonction pour obtenir le contexte photo approprié
  const getPhotoContext = (sectionId: string): string | undefined => {
    if (sectionId === "composition-corporelle") return photoContextComposition;
    if (sectionId === "biomecanique-mobilite") return photoContextBiomecanique;
    return undefined;
  };

  // Générer sections gratuites en parallèle
  const freeResults = await Promise.all(
    freeSections.map(async ({ config, score }) => {
      const content = await generateSectionContent(config, score, responses, scores, getPhotoContext(config.id));
      return { config, score, content };
    })
  );

  reportProgress(50, "Sections gratuites terminées...");

  // Générer sections premium par batch
  let premiumResults: typeof freeResults = [];

  if (auditType !== "GRATUIT") {
    const batchSize = 3;
    for (let i = 0; i < premiumSections.length; i += batchSize) {
      const batch = premiumSections.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(premiumSections.length / batchSize);

      reportProgress(50 + Math.floor((batchNum / totalBatches) * 35), `Sections Premium ${batchNum}/${totalBatches}...`);

      const batchResults = await Promise.all(
        batch.map(async ({ config, score }) => {
          const content = await generateSectionContent(config, score, responses, scores, getPhotoContext(config.id));
          return { config, score, content };
        })
      );
      premiumResults.push(...batchResults);
    }
  }

  reportProgress(85, "Compilation du rapport...");

  // Assembler les sections
  const allResults = [...freeResults, ...premiumResults];
  const sections: NarrativeSection[] = [];
  const allSupplements: SupplementProtocol[] = [];

  for (const sectionData of sectionsToGenerate) {
    const result = allResults.find(r => r.config.id === sectionData.config.id);
    const level = getLevel(sectionData.score);

    const content = result?.content || {
      introduction: "",
      whatIsWrong: "",
      personalizedAnalysis: "",
      recommendations: "",
      supplements: [],
      actionPlan: "",
      scienceDeepDive: ""
    };

    if (content.supplements?.length > 0) {
      allSupplements.push(...content.supplements);
    }

    sections.push({
      id: sectionData.config.id,
      title: sectionData.config.title,
      score: sectionData.score,
      level,
      isPremium: sectionData.config.premium,
      ...content,
      teaser: sectionData.config.premium && auditType === "GRATUIT"
        ? `Section Premium : analyse ${sectionData.config.title} par ${sectionData.config.expert}. Protocole complet avec dosages et marques.`
        : undefined
    });
  }

  // Identifier priorités et forces
  const prioritySections = sections
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(s => s.title);

  const strengthSections = sections
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.title);

  reportProgress(90, "Plan d'action...");

  // Générer plan hebdomadaire
  const weeklyPlan = await generateWeeklyPlan(responses, prioritySections, scores);

  // Conclusion
  const conclusion = `Ce rapport NEUROCORE 360° t'a fourni une analyse de ton profil métabolique sur ${sections.length} domaines. Chaque recommandation est calibrée pour ton objectif de ${responses["objectif"] || "santé optimale"}. Applique les protocoles progressivement en commençant par tes priorités : ${prioritySections.slice(0, 2).join(" et ")}. La constance bat l'intensité - ACHZOD.`;

  reportProgress(100, "Rapport terminé !");

  return {
    global,
    auditType,
    heroSummary,
    executiveNarrative,
    globalDiagnosis,
    sections,
    prioritySections,
    strengthSections,
    supplementStack: allSupplements.slice(0, 10),
    lifestyleProtocol: "Protocole intégré dans chaque section.",
    weeklyPlan,
    photoAnalysis,
    conclusion
  };
}
