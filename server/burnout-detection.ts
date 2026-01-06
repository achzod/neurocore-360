/**
 * NEUROCORE 360 - Burnout Detection Engine
 * Server-side analysis for burnout questionnaire
 * Structure identique à Discovery Scan
 */

import type { Express } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchArticles } from "./knowledge/storage";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface BurnoutResponse {
  [questionId: string]: string; // "0" to "4" scale
}

// Format identique à Discovery
interface BurnoutReportData {
  globalScore: number;
  phase: "alarme" | "resistance" | "epuisement";
  phaseLabel: string;
  clientName: string;
  generatedAt: string;
  metrics: {
    key: string;
    label: string;
    value: number;
    max: number;
    description: string;
  }[];
  sections: {
    id: string;
    title: string;
    subtitle?: string;
    chips?: string[];
    content: string; // HTML
  }[];
}

// Burnout categories for analysis
const BURNOUT_CATEGORIES = [
  { id: "energie", name: "Energie", questionPrefix: "e", description: "Vitalité" },
  { id: "sommeil", name: "Sommeil", questionPrefix: "s", description: "Récupération" },
  { id: "cognitif", name: "Cognitif", questionPrefix: "c", description: "Clarté mentale" },
  { id: "emotionnel", name: "Emotionnel", questionPrefix: "em", description: "Équilibre" },
  { id: "physique", name: "Physique", questionPrefix: "p", description: "Corps" },
  { id: "social", name: "Social", questionPrefix: "so", description: "Relations" },
];

// Phase descriptions
const PHASE_INFO = {
  alarme: {
    label: "Phase d'Alarme",
    color: "#22C55E",
    description: "Ton corps réagit au stress mais a encore toutes ses ressources. C'est le moment idéal pour agir car tu peux rebondir rapidement."
  },
  resistance: {
    label: "Phase de Résistance",
    color: "#F59E0B",
    description: "Ton corps compense depuis un moment et commence à s'épuiser. Tes surrénales travaillent en surcharge. Il est crucial d'agir maintenant."
  },
  epuisement: {
    label: "Phase d'Épuisement",
    color: "#EF4444",
    description: "Tes ressources sont très faibles et ton corps montre des signes de burnout installé. Un repos profond et un accompagnement sont nécessaires."
  }
};

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
      "Arrêt total des stimulants artificiels",
      "Sieste de 20 minutes entre 13h-15h",
      "Réduire l'intensité des entraînements de 50%",
      "Méditation guidée 10 minutes/jour",
      "Coucher avant 22h30 sans exception",
    ],
    nutrition: [
      "Augmenter les glucides complexes le soir",
      "Bouillon d'os ou collagène pour les surrénales",
      "Éviter l'alcool pendant 4 semaines",
      "Sel de qualité (Himalaya) pour les surrénales",
    ],
  },
  epuisement: {
    supplements: [
      { name: "Magnésium bisglycinate", dosage: "600mg réparti", reason: "Reconstruction nerveuse" },
      { name: "Phosphatidylsérine", dosage: "300mg le soir", reason: "Réduction du cortisol nocturne" },
      { name: "Adaptogènes combinés", dosage: "Selon formule", reason: "Support surrénalien profond" },
      { name: "Vitamine C liposomale", dosage: "1-2g/jour", reason: "Synthèse hormones surrénaliennes" },
      { name: "Zinc", dosage: "30mg le soir", reason: "Immunité et hormones" },
    ],
    lifestyle: [
      "Arrêt de tout exercice intense pendant 2-4 semaines",
      "Marche douce uniquement (30 min max)",
      "Congé ou réduction significative du travail",
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

// Get knowledge base context
async function getBurnoutKnowledge(phase: string, categories: string[]): Promise<string> {
  try {
    const keywords = ["cortisol", "stress", "burnout", "fatigue", "récupération", "HPA", "surrénales"];
    if (categories.includes("sommeil")) keywords.push("sommeil", "mélatonine", "circadien");
    if (categories.includes("energie")) keywords.push("mitochondrie", "ATP", "énergie");
    if (categories.includes("cognitif")) keywords.push("cognition", "dopamine", "focus");
    if (categories.includes("emotionnel")) keywords.push("anxiété", "sérotonine", "GABA");

    const articles = await searchArticles(keywords, 6);
    if (articles.length === 0) return "";

    return articles.map(a =>
      `SOURCE: ${a.source}\nTITRE: ${a.title}\nCONTENU: ${a.content.substring(0, 800)}`
    ).join("\n\n---\n\n");
  } catch (error) {
    console.error("[Burnout] Knowledge search error:", error);
    return "";
  }
}

// Generate section content with Gemini
async function generateBurnoutSection(
  sectionType: string,
  data: {
    phase: string;
    phaseInfo: typeof PHASE_INFO.alarme;
    globalScore: number;
    metrics: { key: string; label: string; value: number }[];
    protocols: typeof PHASE_PROTOCOLS.alarme;
    knowledgeContext: string;
    clientName: string;
  }
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const criticalCategories = data.metrics.filter(m => m.value <= 4).map(m => m.label);
  const attentionCategories = data.metrics.filter(m => m.value > 4 && m.value <= 6).map(m => m.label);

  const prompts: Record<string, string> = {
    intro: `Tu es un expert en gestion du stress et burnout. Génère un message d'ouverture personnalisé pour ${data.clientName}.

DONNÉES:
- Score global: ${data.globalScore}/100 (score inversé: ${100 - data.globalScore}% de santé)
- Phase: ${data.phase} (${data.phaseInfo.label})
- Catégories critiques: ${criticalCategories.join(", ") || "Aucune"}
- Catégories attention: ${attentionCategories.join(", ") || "Aucune"}

CONTEXTE SCIENTIFIQUE:
${data.knowledgeContext}

Écris 3 paragraphes:
1. Accueil empathique + résumé de la situation
2. Ce que signifie la phase ${data.phase} pour le corps
3. Pourquoi c'est le bon moment d'agir

Format: HTML simple (<p>, <strong>). Pas de markdown. Pas d'emojis. Ton direct et bienveillant.`,

    analyse: `Tu es un expert en burnout. Analyse les scores de ${data.clientName}.

SCORES PAR CATÉGORIE:
${data.metrics.map(m => `- ${m.label}: ${m.value}/10`).join("\n")}

Phase: ${data.phase}

CONTEXTE SCIENTIFIQUE:
${data.knowledgeContext}

Pour chaque catégorie critique ou attention, explique:
1. Ce que ce score révèle sur l'état actuel
2. Les mécanismes biologiques impliqués (cortisol, HPA, neurotransmetteurs)
3. Comment cette catégorie impacte les autres

Format: HTML (<p>, <strong>, <br/>). 4-5 paragraphes substantiels. Pas de listes à puces.`,

    protocole: `Tu es un expert en récupération du burnout. Crée un protocole pour ${data.clientName} en phase ${data.phase}.

PROTOCOLE À INTÉGRER:
Suppléments: ${data.protocols.supplements.map(s => `${s.name} (${s.dosage})`).join(", ")}
Lifestyle: ${data.protocols.lifestyle.join(", ")}
Nutrition: ${data.protocols.nutrition.join(", ")}

CONTEXTE SCIENTIFIQUE:
${data.knowledgeContext}

Structure en 3 parties:
1. SEMAINE 1-2: Actions immédiates (urgence)
2. SEMAINE 3-4: Consolidation
3. MOIS 2-3: Reconstruction durable

Pour chaque action, explique POURQUOI (mécanisme biologique). Sois précis sur les timings et dosages.

Format: HTML (<p>, <strong>). Paragraphes narratifs, pas de listes.`,

    supplements: `Tu es un expert en supplémentation. Détaille le stack pour la phase ${data.phase}.

STACK:
${data.protocols.supplements.map(s => `- ${s.name}: ${s.dosage} - ${s.reason}`).join("\n")}

CONTEXTE SCIENTIFIQUE:
${data.knowledgeContext}

Pour chaque supplément:
1. Mécanisme d'action précis
2. Pourquoi ce dosage spécifique
3. Timing optimal et interactions
4. Signes que ça fonctionne

Format: HTML (<p>, <strong>). Paragraphes détaillés par supplément.`,

    conclusion: `Tu es un coach en récupération burnout. Écris une conclusion motivante pour ${data.clientName}.

SITUATION:
- Phase: ${data.phase}
- Score: ${data.globalScore}%
- Points critiques: ${criticalCategories.join(", ") || "Aucun"}

Écris:
1. Résumé des 3 actions prioritaires
2. Ce qui va changer dans 30/60/90 jours si le protocole est suivi
3. Message d'encouragement réaliste

Format: HTML (<p>, <strong>). Ton direct et motivant. Pas de promesses irréalistes.`
  };

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompts[sectionType] || prompts.intro }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
    });

    let content = result.response.text() || "";
    // Clean markdown artifacts
    content = content
      .replace(/\*\*/g, "<strong>").replace(/\*\*/g, "</strong>")
      .replace(/##\s*/g, "")
      .replace(/\*/g, "")
      .replace(/^[-•]\s+/gm, "")
      .replace(/={4,}/g, "")
      .replace(/-{4,}/g, "")
      .trim();

    return content;
  } catch (error) {
    console.error(`[Burnout] Gemini error for ${sectionType}:`, error);
    return `<p>Analyse en cours de génération...</p>`;
  }
}

// Main analysis function
async function analyzeBurnout(responses: BurnoutResponse, email: string): Promise<BurnoutReportData> {
  const clientName = email.split("@")[0] || "Client";

  // Calculate scores per category (0-10 scale for metrics)
  const metrics = BURNOUT_CATEGORIES.map((cat) => {
    const categoryQuestions = Object.entries(responses).filter(([key]) =>
      key.startsWith(cat.questionPrefix)
    );
    const totalScore = categoryQuestions.reduce((acc, [, val]) => acc + parseInt(val || "0"), 0);
    const maxScore = categoryQuestions.length * 4;
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    // Inverser: score élevé = mauvais, donc santé = 10 - (percentage/10)
    const healthScore = Math.round(10 - (percentage / 10));

    return {
      key: cat.id,
      label: cat.name,
      value: Math.max(1, Math.min(10, healthScore)),
      max: 10,
      description: cat.description,
    };
  });

  // Calculate global score (stress level)
  const totalScore = Object.values(responses).reduce((acc, v) => acc + parseInt(v || "0"), 0);
  const totalQuestions = Object.keys(responses).length;
  const maxScore = totalQuestions * 4;
  const stressPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  // Score global = santé (inversé)
  const globalScore = Math.round(100 - stressPercentage);

  // Determine phase
  let phase: "alarme" | "resistance" | "epuisement";
  if (stressPercentage >= 70) {
    phase = "epuisement";
  } else if (stressPercentage >= 40) {
    phase = "resistance";
  } else {
    phase = "alarme";
  }

  const phaseInfo = PHASE_INFO[phase];
  const protocols = PHASE_PROTOCOLS[phase];

  // Get knowledge context
  const criticalCategories = metrics.filter(m => m.value <= 4).map(m => m.key);
  const knowledgeContext = await getBurnoutKnowledge(phase, criticalCategories);

  console.log(`[Burnout] Generating sections for ${email}, phase=${phase}, score=${globalScore}`);

  // Generate sections with Gemini
  const sectionData = { phase, phaseInfo, globalScore, metrics, protocols, knowledgeContext, clientName };

  const [introContent, analyseContent, protocoleContent, supplementsContent, conclusionContent] = await Promise.all([
    generateBurnoutSection("intro", sectionData),
    generateBurnoutSection("analyse", sectionData),
    generateBurnoutSection("protocole", sectionData),
    generateBurnoutSection("supplements", sectionData),
    generateBurnoutSection("conclusion", sectionData),
  ]);

  const sections = [
    {
      id: "intro",
      title: "Diagnostic Burnout",
      subtitle: phaseInfo.label,
      chips: [phaseInfo.label, `Score: ${globalScore}/100`],
      content: introContent,
    },
    {
      id: "analyse",
      title: "Analyse par Catégorie",
      subtitle: "Tes systèmes en détail",
      chips: criticalCategories.length > 0 ? [`${criticalCategories.length} zones critiques`] : ["Équilibre correct"],
      content: analyseContent,
    },
    {
      id: "protocole",
      title: "Protocole de Récupération",
      subtitle: "Plan d'action personnalisé",
      chips: ["Semaine par semaine"],
      content: protocoleContent,
    },
    {
      id: "supplements",
      title: "Stack Suppléments",
      subtitle: `Adapté à la phase ${phase}`,
      chips: protocols.supplements.map(s => s.name),
      content: supplementsContent,
    },
    {
      id: "conclusion",
      title: "Prochaines Étapes",
      subtitle: "Ton chemin vers la récupération",
      chips: ["30/60/90 jours"],
      content: conclusionContent,
    },
  ];

  return {
    globalScore,
    phase,
    phaseLabel: phaseInfo.label,
    clientName,
    generatedAt: new Date().toISOString(),
    metrics,
    sections,
  };
}

// In-memory store
const burnoutStore = new Map<string, BurnoutReportData & { email: string }>();

export function registerBurnoutRoutes(app: Express): void {
  /**
   * POST /api/burnout-detection/analyze
   */
  app.post("/api/burnout-detection/analyze", async (req, res) => {
    try {
      const { responses, email } = req.body;

      if (!responses || Object.keys(responses).length === 0) {
        res.status(400).json({ error: "Aucune réponse fournie" });
        return;
      }

      if (!email || !email.includes("@")) {
        res.status(400).json({ error: "Email invalide" });
        return;
      }

      console.log(`[Burnout] Analyzing for ${email}, ${Object.keys(responses).length} questions`);

      const result = await analyzeBurnout(responses, email);

      // Generate ID and store
      const id = `burnout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      burnoutStore.set(id, { ...result, email });

      console.log(`[Burnout] Result: ID=${id}, Phase=${result.phase}, Score=${result.globalScore}`);

      res.json({ success: true, id, ...result });
    } catch (error) {
      console.error("[Burnout] Analysis error:", error);
      res.status(500).json({ error: "Erreur lors de l'analyse" });
    }
  });

  /**
   * GET /api/burnout-detection/:id
   */
  app.get("/api/burnout-detection/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = burnoutStore.get(id);

      if (result) {
        res.json(result);
        return;
      }

      res.status(404).json({ error: "Analyse non trouvée" });
    } catch (error) {
      console.error("[Burnout] Fetch error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  /**
   * POST /api/burnout-detection/create-test
   */
  app.post("/api/burnout-detection/create-test", async (req, res) => {
    try {
      // Create test responses (moderate burnout - resistance phase)
      const testResponses: BurnoutResponse = {};
      // Simulate responses: mix of 1-3 values
      const prefixes = ["e", "s", "c", "em", "p", "so"];
      prefixes.forEach((prefix, idx) => {
        for (let i = 1; i <= 5; i++) {
          // Vary scores: sleep and cognitive worse
          const baseScore = prefix === "s" || prefix === "c" ? 3 : prefix === "p" ? 1 : 2;
          testResponses[`${prefix}${i}`] = String(Math.min(4, baseScore + Math.floor(Math.random() * 2)));
        }
      });

      const result = await analyzeBurnout(testResponses, "test@example.com");
      const id = `burnout-test-${Date.now()}`;
      burnoutStore.set(id, { ...result, email: "test@example.com" });

      console.log(`[Burnout] Test created: ID=${id}`);

      res.json({ success: true, id, url: `/burnout/${id}`, ...result });
    } catch (error) {
      console.error("[Burnout] Create test error:", error);
      res.status(500).json({ error: "Erreur création test" });
    }
  });
}
