/**
 * NEUROCORE 360 - Burnout Detection Engine
 * Server-side analysis for burnout questionnaire
 */

import type { Express } from "express";
import { searchArticles } from "./knowledge/storage";

interface BurnoutResponse {
  [questionId: string]: string; // "0" to "4" scale
}

interface BurnoutAnalysisResult {
  score: number;
  phase: "alarme" | "resistance" | "epuisement";
  phaseDescription: string;
  categories: {
    name: string;
    score: number;
    level: "optimal" | "attention" | "critique";
  }[];
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  protocols: {
    supplements: { name: string; dosage: string; reason: string }[];
    lifestyle: string[];
    nutrition: string[];
  };
  knowledgeInsights?: {
    title: string;
    source: string;
    excerpt: string;
  }[];
}

// Burnout categories for analysis
const BURNOUT_CATEGORIES = [
  { id: "energy", name: "Energie", questionPrefix: "e" },
  { id: "sleep", name: "Sommeil", questionPrefix: "s" },
  { id: "cognitive", name: "Cognitif", questionPrefix: "c" },
  { id: "emotional", name: "Emotionnel", questionPrefix: "em" },
  { id: "physical", name: "Physique", questionPrefix: "p" },
  { id: "social", name: "Social", questionPrefix: "so" },
];

// Protocols based on phase
const PHASE_PROTOCOLS = {
  alarme: {
    supplements: [
      { name: "Magnésium bisglycinate", dosage: "300-400mg le soir", reason: "Relaxation musculaire et nerveuse" },
      { name: "Ashwagandha KSM-66", dosage: "300mg 2x/jour", reason: "Modulation du cortisol" },
      { name: "L-Théanine", dosage: "200mg le soir", reason: "Relaxation sans somnolence" },
    ],
    lifestyle: [
      "Réduire le temps d'écran 1h avant le coucher",
      "Marche quotidienne de 30 minutes en nature",
      "Technique de respiration 4-7-8 avant de dormir",
      "Limiter la caféine après 14h",
    ],
    nutrition: [
      "Augmenter les protéines au petit-déjeuner",
      "Éviter les sucres rapides après 18h",
      "Ajouter des oméga-3 (poissons gras, graines de lin)",
    ],
  },
  resistance: {
    supplements: [
      { name: "Magnésium bisglycinate", dosage: "400-600mg réparti", reason: "Support système nerveux épuisé" },
      { name: "Rhodiola rosea", dosage: "200-400mg le matin", reason: "Adaptogène anti-fatigue" },
      { name: "Vitamine B Complex", dosage: "1x/jour le matin", reason: "Métabolisme énergétique" },
      { name: "Vitamine D3", dosage: "4000 UI/jour", reason: "Immunité et humeur" },
    ],
    lifestyle: [
      "Arrêt total des stimulants artificiels (pré-workout, etc.)",
      "Sieste de 20 minutes si possible entre 13h-15h",
      "Réduire l'intensité des entraînements de 50%",
      "Méditation guidée 10 minutes/jour",
      "Coucher avant 22h30 sans exception",
    ],
    nutrition: [
      "Augmenter les glucides complexes le soir",
      "Bouillon d'os ou collagène pour les surrénales",
      "Éviter l'alcool complètement pendant 4 semaines",
      "Sel de qualité (Himalaya) pour les surrénales",
    ],
  },
  epuisement: {
    supplements: [
      { name: "Magnésium bisglycinate", dosage: "600mg réparti sur la journée", reason: "Reconstruction nerveuse" },
      { name: "Phosphatidylsérine", dosage: "300mg le soir", reason: "Réduction du cortisol nocturne" },
      { name: "Adaptogènes combinés", dosage: "Selon formule", reason: "Support surrénalien profond" },
      { name: "Vitamine C liposomale", dosage: "1-2g/jour", reason: "Synthèse des hormones surrénaliennes" },
      { name: "Zinc", dosage: "30mg le soir", reason: "Immunité et hormones" },
    ],
    lifestyle: [
      "Arrêt de tout exercice intense pendant 2-4 semaines",
      "Marche douce uniquement (30 min max)",
      "Congé ou réduction significative de la charge de travail",
      "Consultation médicale recommandée",
      "Thérapie ou coaching recommandé",
      "10h de sommeil minimum",
    ],
    nutrition: [
      "Repas réguliers toutes les 3-4 heures",
      "Éviter tout jeûne intermittent",
      "Protéines à chaque repas",
      "Glucides complexes avant le coucher",
      "Aliments riches en B5 (avocat, champignons)",
    ],
  },
};

// Get knowledge base context for burnout analysis
async function getBurnoutKnowledgeContext(
  phase: "alarme" | "resistance" | "epuisement",
  criticalCategories: string[]
): Promise<{ title: string; source: string; excerpt: string }[]> {
  try {
    // Build keywords based on phase and critical categories
    const keywords: string[] = ["cortisol", "stress", "burnout", "fatigue", "récupération"];

    if (phase === "epuisement") {
      keywords.push("adrenal", "HPA", "épuisement", "surmenage");
    } else if (phase === "resistance") {
      keywords.push("adaptogène", "rhodiola", "ashwagandha", "adaptation");
    }

    if (criticalCategories.includes("Sommeil")) {
      keywords.push("sommeil", "mélatonine", "circadien", "insomnie");
    }
    if (criticalCategories.includes("Energie")) {
      keywords.push("énergie", "mitochondrie", "ATP", "fatigue");
    }
    if (criticalCategories.includes("Cognitif")) {
      keywords.push("cognition", "focus", "dopamine", "concentration");
    }
    if (criticalCategories.includes("Emotionnel")) {
      keywords.push("anxiété", "sérotonine", "GABA", "humeur");
    }

    const articles = await searchArticles(keywords.slice(0, 8), 5);

    return articles.map(a => ({
      title: a.title,
      source: a.source,
      excerpt: a.content.substring(0, 300) + "..."
    }));
  } catch (error) {
    console.error("[Burnout] Knowledge search error:", error);
    return [];
  }
}

async function analyzeBurnout(responses: BurnoutResponse, email: string): Promise<BurnoutAnalysisResult> {
  // Calculate scores per category
  const categoryScores = BURNOUT_CATEGORIES.map((cat) => {
    const categoryQuestions = Object.entries(responses).filter(([key]) =>
      key.startsWith(cat.questionPrefix)
    );
    const totalScore = categoryQuestions.reduce((acc, [, val]) => acc + parseInt(val || "0"), 0);
    const maxScore = categoryQuestions.length * 4;
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    return {
      name: cat.name,
      score: Math.round(percentage),
      level: percentage >= 70 ? "critique" as const : percentage >= 40 ? "attention" as const : "optimal" as const,
    };
  });

  // Calculate global score
  const totalScore = Object.values(responses).reduce((acc, v) => acc + parseInt(v || "0"), 0);
  const totalQuestions = Object.keys(responses).length;
  const maxScore = totalQuestions * 4;
  const globalPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  // Determine phase
  let phase: "alarme" | "resistance" | "epuisement";
  let phaseDescription: string;

  if (globalPercentage >= 70) {
    phase = "epuisement";
    phaseDescription =
      "Phase d'épuisement avancé. Ton corps et ton esprit montrent des signes de burnout installé. Une intervention est nécessaire.";
  } else if (globalPercentage >= 40) {
    phase = "resistance";
    phaseDescription =
      "Phase de résistance. Ton corps compense mais s'épuise progressivement. C'est le moment idéal pour agir.";
  } else {
    phase = "alarme";
    phaseDescription =
      "Phase d'alarme légère. Tu montres quelques signes de stress mais tu as les ressources pour rebondir rapidement.";
  }

  // Get protocols for the phase
  const protocols = PHASE_PROTOCOLS[phase];

  // Build recommendations based on category scores
  const criticalCategories = categoryScores.filter((c) => c.level === "critique");
  const attentionCategories = categoryScores.filter((c) => c.level === "attention");

  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];

  // Immediate actions based on critical categories
  if (criticalCategories.some((c) => c.name === "Sommeil")) {
    immediate.push("Priorité absolue: améliorer la qualité du sommeil");
    immediate.push("Pas d'écrans 2h avant le coucher");
  }
  if (criticalCategories.some((c) => c.name === "Energie")) {
    immediate.push("Réduire drastiquement les efforts physiques intenses");
    immediate.push("Augmenter les temps de repos");
  }
  if (criticalCategories.some((c) => c.name === "Emotionnel")) {
    immediate.push("Identifier et limiter les sources de stress émotionnel");
    immediate.push("Parler à un proche ou professionnel");
  }

  // Short term (2-4 weeks)
  shortTerm.push(...protocols.lifestyle.slice(0, 3));
  shortTerm.push("Mettre en place une routine de récupération quotidienne");

  // Long term (1-3 months)
  longTerm.push("Réévaluer tes priorités de vie");
  longTerm.push("Construire des habitudes de gestion du stress durables");
  longTerm.push("Équilibrer vie pro et personnelle");

  // Get knowledge base insights
  const criticalCategoryNames = criticalCategories.map(c => c.name);
  const knowledgeInsights = await getBurnoutKnowledgeContext(phase, criticalCategoryNames);

  console.log(`[Burnout] Knowledge base: ${knowledgeInsights.length} articles found for phase=${phase}`);

  return {
    score: Math.round(globalPercentage),
    phase,
    phaseDescription,
    categories: categoryScores,
    recommendations: { immediate, shortTerm, longTerm },
    protocols,
    knowledgeInsights,
  };
}

// In-memory store for burnout results (persists until server restart)
const burnoutStore = new Map<string, BurnoutAnalysisResult & { email: string; createdAt: string }>();

export function registerBurnoutRoutes(app: Express): void {
  /**
   * POST /api/burnout-detection/analyze
   * Analyze burnout questionnaire responses
   */
  app.post("/api/burnout-detection/analyze", async (req, res) => {
    try {
      const { responses, email } = req.body as {
        responses: BurnoutResponse;
        email: string;
      };

      if (!responses || Object.keys(responses).length === 0) {
        res.status(400).json({ error: "Aucune réponse fournie" });
        return;
      }

      if (!email || !email.includes("@")) {
        res.status(400).json({ error: "Email invalide" });
        return;
      }

      console.log(`[Burnout] Analyzing responses for ${email}, ${Object.keys(responses).length} questions`);

      const result = await analyzeBurnout(responses, email);

      // Generate ID and store result
      const id = `burnout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      burnoutStore.set(id, { ...result, email, createdAt: new Date().toISOString() });

      // Log for admin notification
      console.log(`[Burnout] Result for ${email}: ID=${id}, Phase=${result.phase}, Score=${result.score}%, Knowledge=${result.knowledgeInsights?.length || 0} articles`);

      res.json({
        success: true,
        id,
        ...result,
      });
    } catch (error) {
      console.error("[Burnout] Analysis error:", error);
      res.status(500).json({ error: "Erreur lors de l'analyse" });
    }
  });

  /**
   * GET /api/burnout-detection/:id
   * Get burnout analysis result by ID
   */
  app.get("/api/burnout-detection/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Check in-memory store
      const result = burnoutStore.get(id);
      if (result) {
        res.json(result);
        return;
      }

      // ID not found
      res.status(404).json({ error: "Analyse non trouvée" });
    } catch (error) {
      console.error("[Burnout] Fetch error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  /**
   * POST /api/burnout-detection/create-test
   * Create a test burnout result for demo purposes
   */
  app.post("/api/burnout-detection/create-test", async (req, res) => {
    try {
      // Create test data - Phase Resistance (moderate burnout)
      const testResult: BurnoutAnalysisResult = {
        score: 55,
        phase: "resistance",
        phaseDescription: "Phase de résistance. Ton corps compense mais s'épuise progressivement. C'est le moment idéal pour agir.",
        categories: [
          { name: "Energie", score: 62, level: "attention" },
          { name: "Sommeil", score: 71, level: "critique" },
          { name: "Cognitif", score: 45, level: "attention" },
          { name: "Emotionnel", score: 58, level: "attention" },
          { name: "Physique", score: 38, level: "optimal" },
          { name: "Social", score: 52, level: "attention" }
        ],
        recommendations: {
          immediate: [
            "Priorité absolue: améliorer la qualité du sommeil",
            "Pas d'écrans 2h avant le coucher",
            "Identifier et limiter les sources de stress émotionnel"
          ],
          shortTerm: [
            "Arrêt total des stimulants artificiels (pré-workout, etc.)",
            "Sieste de 20 minutes si possible entre 13h-15h",
            "Réduire l'intensité des entraînements de 50%",
            "Mettre en place une routine de récupération quotidienne"
          ],
          longTerm: [
            "Réévaluer tes priorités de vie",
            "Construire des habitudes de gestion du stress durables",
            "Équilibrer vie pro et personnelle"
          ]
        },
        protocols: PHASE_PROTOCOLS.resistance,
        knowledgeInsights: [
          {
            title: "Cortisol et Phase de Résistance",
            source: "huberman",
            excerpt: "La phase de résistance du stress chronique est caractérisée par une élévation maintenue du cortisol. Le corps s'adapte mais épuise ses réserves de catécholamines..."
          },
          {
            title: "Rhodiola pour la Fatigue Chronique",
            source: "examine",
            excerpt: "La Rhodiola rosea a démontré des effets significatifs sur la réduction de la fatigue mentale et physique dans les études cliniques, avec des dosages de 200-400mg..."
          }
        ]
      };

      // Generate ID and store
      const id = `burnout-test-${Date.now()}`;
      burnoutStore.set(id, { ...testResult, email: "test@example.com", createdAt: new Date().toISOString() });

      console.log(`[Burnout] Test result created: ID=${id}`);

      res.json({
        success: true,
        id,
        url: `/burnout/${id}`,
        ...testResult
      });
    } catch (error) {
      console.error("[Burnout] Create test error:", error);
      res.status(500).json({ error: "Erreur création test" });
    }
  });
}
