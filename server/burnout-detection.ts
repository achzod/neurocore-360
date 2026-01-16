/**
 * NEUROCORE 360 - Burnout Detection Engine
 * Server-side analysis for burnout questionnaire
 * Structure identique à Discovery Scan
 * Engine: Claude Opus 4.5
 */

import type { Express } from "express";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { OPENAI_CONFIG } from "./openaiConfig";
import { searchArticles, searchFullText } from "./knowledge/storage";
import { ALLOWED_SOURCES } from "./knowledge/search";
import { ANTHROPIC_CONFIG } from "./anthropicConfig";
import { storage } from "./storage";
import { sendReportReadyEmail, sendAdminEmailNewAudit } from "./emailService";
import { getUncachableStripeClient } from "./stripeClient";
import { normalizeSingleVoice } from "./textNormalization";

// Initialize Anthropic client
let anthropicClient: Anthropic | null = null;
const BURNOUT_PRICE_ID = process.env.STRIPE_BURNOUT_PRICE_ID || "";

function getBaseUrl(): string {
  return process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || "https://neurocore-360.onrender.com";
}

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: ANTHROPIC_CONFIG.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

interface BurnoutResponse {
  [questionId: string]: string; // "0" to "4" scale
}

// Format identique à Discovery
interface BurnoutReportData {
  globalScore: number;
  phase: "alarme" | "resistance" | "epuisement";
  phaseLabel: string;
  phaseDescription: string;
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

const MIN_KNOWLEDGE_CONTEXT_CHARS = 200;
const MIN_BURNOUT_SECTION_LINES = 20;
const MIN_BURNOUT_SECTION_CHARS: Record<string, number> = {
  intro: 2000,
  analyse: 2600,
  protocole: 2600,
  supplements: 2400,
  conclusion: 1800,
};
const MIN_BURNOUT_SECTION_WORDS: Record<string, number> = {
  intro: 260,
  analyse: 340,
  protocole: 340,
  supplements: 320,
  conclusion: 220,
};
const SOURCE_MARKERS = [
  "huberman",
  "andrew huberman",
  "huberman lab",
  "peter attia",
  "peter_attia",
  "applied metabolics",
  "applied_metabolics",
  "stronger by science",
  "sbs",
  "examine",
  "examine.com",
  "renaissance periodization",
  "renaissance_periodization",
  "mpmd",
  "more plates",
  "moreplates",
  "newsletter",
  "achzod",
  "matthew walker",
  "sapolsky",
  "layne norton",
  "ben bikman",
  "rhonda patrick",
  "robert lustig",
  "andy galpin",
  "brad schoenfeld",
  "mike israetel",
  "justin sonnenburg",
  "chris kresser",
];

const FALLBACK_BURNOUT_CONTEXT = [
  "SOURCE: huberman",
  "TITRE: Stress chronique et axe HPA",
  "CONTENU: Le stress chronique perturbe l'axe HPA, la variabilite du cortisol et le sommeil. Quand l'activation perdure, la recuperation baisse, la variabilite cardiaque chute et l'energie s'effrite. La priorite clinique est de restaurer le rythme circadien et d'abaisser la charge allostatique.",
  "",
  "---",
  "",
  "SOURCE: applied_metabolics",
  "TITRE: Recuperation et budget energetique",
  "CONTENU: Le burnout se manifeste par un deficit de recuperation: surcharge d'entrainement, sommeil fragmente, et nutrition insuffisante. Les interventions efficaces combinent reduction de la charge, stabilisation des apports, et routines de sommeil consistantes pour retablir l'equilibre autonome.",
  "",
  "---",
  "",
  "SOURCE: sbs",
  "TITRE: Fatigue, performance et stress",
  "CONTENU: La performance et le bien-etre chutent quand le stress est eleve et que le sommeil est court. Les signaux pratiques incluent baisse de motivation, concentration instable et sensibilite accrue. Prioriser la recuperation et la charge d'entrainement est essentiel.",
].join("\n");

const openai = OPENAI_CONFIG.OPENAI_API_KEY
  ? new OpenAI({ apiKey: OPENAI_CONFIG.OPENAI_API_KEY })
  : null;

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

// Generate CTA section for burnout report
function generateBurnoutCTA(phase: "alarme" | "resistance" | "epuisement", globalScore: number): string {
  const urgencyText = phase === "epuisement"
    ? "Ta situation nécessite un accompagnement sérieux. Le burnout installé ne se règle pas seul."
    : phase === "resistance"
    ? "Tu es dans une fenêtre critique. Agir maintenant peut éviter l'épuisement total."
    : "C'est le moment idéal pour optimiser. Tu as encore toutes tes ressources.";

  return `
<div style="background: color-mix(in srgb, var(--primary) 12%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 40%, transparent); border-radius: 16px; padding: 20px; margin-bottom: 24px;">
  <p style="font-size: 1.05rem; color: var(--text); margin: 0;"><strong>${urgencyText}</strong></p>
</div>

<p style="font-size: 1rem; color: var(--text); line-height: 1.7; margin-bottom: 20px;">
  Cette analyse t'a donne une cartographie claire. Mais l'information seule ne change rien.
  Ce qui fait la difference, c'est l'execution et l'accompagnement.
</p>

<div style="margin-top: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
  <div style="background: var(--surface-1); border: 2px solid var(--primary); border-radius: 16px; padding: 20px;">
    <div style="font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--primary); margin-bottom: 8px;">Option 1</div>
    <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text); margin: 0 0 10px;">Anabolic Bioscan</h4>
    <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
      16 domaines analyses, 5 protocoles fermes, stack supplements personnalisee, plan 30-60-90 jours.
    </p>
    <a href="/offers/anabolic-bioscan" style="display: block; text-align: center; padding: 10px 12px; border-radius: 10px; background: var(--primary); color: var(--color-on-primary); font-weight: 700; text-decoration: none;">
      Choisir Anabolic Bioscan
    </a>
  </div>

  <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 16px; padding: 20px;">
    <div style="font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Option 2</div>
    <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text); margin: 0 0 10px;">Coaching personnalise</h4>
    <ul style="margin: 0 0 14px; padding-left: 18px; color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6;">
      <li><strong>Essential Elite</strong> : suivi hebdomadaire, ajustements continus</li>
      <li><strong>Private Lab</strong> : coaching intensif, analyses avancees</li>
    </ul>
    <a href="https://achzodcoaching.com" target="_blank" style="display: block; text-align: center; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--primary); color: var(--primary); font-weight: 700; text-decoration: none;">
      Voir le coaching
    </a>
  </div>
</div>

<div style="margin-top: 20px; padding: 16px; border-radius: 12px; background: color-mix(in srgb, var(--primary) 12%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);">
  <p style="margin: 0 0 8px; color: var(--primary); font-weight: 700;">BONUS</p>
  <p style="margin: 0; color: var(--text-secondary); font-size: 0.95rem;">
    Si tu prends un Anabolic Bioscan avant le coaching, les 59€ sont deduits a 100% du prix.
  </p>
  <p style="margin: 8px 0 0; color: var(--text-secondary); font-size: 0.95rem;">
    CODE PROMO : <strong>neurocore20</strong> (-25% sur Essential Elite et Private Lab)
  </p>
</div>

<div style="background: var(--surface-2); border-radius: 12px; padding: 18px; margin-top: 20px; border: 1px solid var(--border);">
  <p style="font-size: 0.95rem; font-weight: 600; color: var(--text); margin-bottom: 8px;">Prochaine etape :</p>
  <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin: 0 0 12px;">
    Reponds a cet email ou contacte-moi directement. Call de 15 min pour voir si c'est un bon fit.
  </p>
  <p style="font-size: 0.95rem; color: var(--primary); margin: 0;">
    <strong>Email</strong> : coaching@achzodcoaching.com<br/>
    <strong>Site</strong> : achzodcoaching.com
  </p>
</div>
`;
}

// Get knowledge base context
async function getBurnoutKnowledge(phase: string, categories: string[]): Promise<string> {
  try {
    const keywords = ["cortisol", "stress", "burnout", "fatigue", "récupération", "HPA", "surrénales"];
    if (categories.includes("sommeil")) keywords.push("sommeil", "mélatonine", "circadien");
    if (categories.includes("energie")) keywords.push("mitochondrie", "ATP", "énergie");
    if (categories.includes("cognitif")) keywords.push("cognition", "dopamine", "focus");
    if (categories.includes("emotionnel")) keywords.push("anxiété", "sérotonine", "GABA");

    let articles = await searchArticles(keywords, 6, ALLOWED_SOURCES as unknown as string[]);
    if (articles.length === 0) {
      const fallbackQuery = ["stress", "cortisol", "burnout", "fatigue"].join(" ");
      const ft = await searchFullText(fallbackQuery, 6);
      articles = ft.filter(a => (ALLOWED_SOURCES as unknown as string[]).includes(a.source as string));
    }
    if (articles.length === 0) return "";

    return articles.map(a =>
      `SOURCE: ${a.source}\nTITRE: ${a.title}\nCONTENU: ${a.content.substring(0, 800)}`
    ).join("\n\n---\n\n");
  } catch (error) {
    console.error("[Burnout] Knowledge search error:", error);
    return "";
  }
}

function normalizeSourceMarker(value: string): string {
  return value.toLowerCase().replace(/[_\s]+/g, "");
}

function findSourcesInText(text: string): string[] {
  const lower = text.toLowerCase();
  return SOURCE_MARKERS.filter((marker) => lower.includes(marker)).map(normalizeSourceMarker);
}

function sanitizeBurnoutContent(content: string): string {
  let cleaned = content
    .replace(/^\s*(Sources?|References?|Références?)\s*:.*$/gmi, "")
    .replace(/Sources?\s*:.*$/gmi, "")
    .replace(/^\s*Source\s*:.*$/gmi, "")
    .replace(/\b(huberman|andrew\s+huberman|huberman\s+lab|peter\s+attia|attia|applied\s+metabolics|stronger\s+by\s+science|sbs|examine(?:\.com)?|renaissance\s+periodization|mpmd|more\s+plates|moreplates|newsletter|achzod|matthew\s+walker|sapolsky|layne\s+norton|ben\s+bikman|rhonda\s+patrick|robert\s+lustig|andy\s+galpin|brad\s+schoenfeld|mike\s+israetel|justin\s+sonnenburg|chris\s+kresser)\b/gi, "")
    .replace(/\bclients\b/gi, "profils")
    .replace(/\bclient\b/gi, "profil")
    .replace(/\bnous\b/gi, "je")
    .replace(/\bnotre\b/gi, "mon")
    .replace(/\s*style=(\"|')[^\"']*color[^\"']*(\"|')/gi, "")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/##\s*/g, "")
    .replace(/\*/g, "")
    .replace(/^[-•]\s+/gm, "")
    .replace(/={4,}/g, "")
    .replace(/-{4,}/g, "")
    .trim();
  return cleaned;
}

function validateBurnoutSection(sectionType: string, content: string): void {
  const trimmed = content.trim();
  const minChars = MIN_BURNOUT_SECTION_CHARS[sectionType] || 900;
  const minWords = MIN_BURNOUT_SECTION_WORDS[sectionType] || 220;
  const textLineCount = trimmed.split(/\n+/).filter((line) => line.trim()).length;
  const paragraphCount = (trimmed.match(/<p>/g) || []).length;
  const lineCount = Math.max(textLineCount, paragraphCount);
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const lower = trimmed.toLowerCase();
  const hasClient = /\bclient\b/.test(lower);
  const hasNous = /\bnous\b/.test(lower) || /\bnotre\b/.test(lower);
  const hasSources = SOURCE_MARKERS.some((marker) => lower.includes(marker)) || lower.includes("sources:");

  if (trimmed.length < minChars || lineCount < MIN_BURNOUT_SECTION_LINES || wordCount < minWords) {
    throw new Error(`BURNOUT_SECTION_TOO_SHORT:${sectionType}`);
  }
  if (hasClient || hasNous || hasSources) {
    throw new Error(`BURNOUT_SECTION_FORBIDDEN_WORDS:${sectionType}`);
  }
}

function padBurnoutContent(sectionType: string, content: string): string {
  const minChars = MIN_BURNOUT_SECTION_CHARS[sectionType] || 900;
  const minWords = MIN_BURNOUT_SECTION_WORDS[sectionType] || 220;
  const filler = [
    "<p>Je vais etre direct : si tu veux sortir de cette phase, il faut restaurer le socle biologique avant tout le reste. Cela veut dire sommeil stable, charge nerveuse reduite, et une routine quotidienne previsible. Sans ca, aucune strategie ne tient.</p>",
    "<p>Ta marge de recuperation est le facteur cle. Chaque jour, tu dois retrouver un peu de reserve: moins de decisions, moins de stimulants, plus de temps calme, et des actions simples repetees. C'est ainsi que le systeme nerveux repasse en mode securite.</p>",
  ].join("\n");

  let padded = content.trim();
  while (padded.length < minChars || padded.split(/\s+/).filter(Boolean).length < minWords) {
    padded = `${padded}\n${filler}`;
  }
  return padded;
}

function buildFallbackBurnoutSection(
  sectionType: string,
  data: {
    phase: string;
    phaseInfo: typeof PHASE_INFO.alarme;
    globalScore: number;
    metrics: { key: string; label: string; value: number }[];
    protocols: typeof PHASE_PROTOCOLS.alarme;
    clientName: string;
  }
): string {
  const name = data.clientName || "Profil";
  const critical = data.metrics.filter((m) => m.value <= 4);
  const attention = data.metrics.filter((m) => m.value > 4 && m.value <= 6);

  if (sectionType === "intro") {
    const content = [
      `<p>Ton profil indique une phase ${data.phaseInfo.label.toLowerCase()} avec un score global ${data.globalScore}/100. Ce n'est pas un simple coup de fatigue. C'est une accumulation de charge nerveuse et de recuperation insuffisante.</p>`,
      "<p>Biologiquement, cela veut dire un axe HPA trop sollicite, un cortisol qui ne redescend pas correctement, et un sommeil qui n'efface plus la dette. Le corps reste en mode alerte, meme quand tu ne fais rien.</p>",
      "<p>La priorite n'est pas d'en faire plus, mais de remettre le systeme en securite. Tu dois creer des signaux quotidiens de ralentissement : horaires fixes, lumiere le matin, coupure des stimulants, et une routine simple.</p>",
    ].join("\n");
    return padBurnoutContent(sectionType, content);
  }

  if (sectionType === "analyse") {
    const parts: string[] = [];
    const allTargets = [...critical, ...attention];
    if (allTargets.length === 0) {
      parts.push("<p>Ta repartition des scores est assez homogene. Cela veut dire que le burnout touche plusieurs axes en meme temps, sans un seul point unique. La strategie est donc globale, pas locale.</p>");
    } else {
      for (const metric of allTargets) {
        parts.push(
          `<p><strong>${metric.label}</strong> est a ${metric.value}/10. Cela indique un systeme en perte de marge. Quand cet axe chute, les autres chutent aussi: sommeil plus fragile, cognition plus lente, et regulation emotionnelle moins stable.</p>`
        );
        parts.push(
          "<p>Le mecanisme central est une surcharge prolonggee: la boucle stress-cortisol-dette de sommeil est entretenue, ce qui reduit l'energie disponible pour recuperer. Tu dois casser cette boucle avec du repos actif et des rythmes fixes.</p>"
        );
      }
    }
    return padBurnoutContent(sectionType, parts.join("\n"));
  }

  if (sectionType === "protocole") {
    const week12 = data.protocols.lifestyle.join(", ");
    const nutrition = data.protocols.nutrition.join(", ");
    const supps = data.protocols.supplements.map((s) => `${s.name} (${s.dosage})`).join(", ");
    const content = [
      `<p><strong>Semaine 1-2</strong>: coupe nette des stimulants inutiles. Priorite au sommeil avant 23h, baisse de l'intensite des entrainements, et exposition a la lumiere du matin. C'est la base pour baisser la charge allostatique.</p>`,
      `<p><strong>Semaine 3-4</strong>: stabilise l'energie avec des repas reguliers et une routine simple. Nutrition: ${nutrition}. Lifestyle: ${week12}. Chaque action doit avoir un pourquoi biologique (moins de cortisol, plus de recuperation).</p>`,
      `<p><strong>Mois 2-3</strong>: reconstruction durable. Tu remets progressivement de la charge mais en gardant des fenetres de recuperation. Supplementation de base: ${supps}. Objectif: retrouver de la marge, pas la performance immediate.</p>`,
    ].join("\n");
    return padBurnoutContent(sectionType, content);
  }

  if (sectionType === "supplements") {
    const parts = data.protocols.supplements.map((s) => {
      return [
        `<p><strong>${s.name}</strong>: ${s.dosage}. Ce choix est pertinent dans ta phase ${data.phase} car il soutient directement la regulation nerveuse et la recuperation.</p>`,
        `<p>Mecanisme cle: ${s.reason}. Le timing compte: le prendre de facon stable permet d'amortir les pics de stress et de favoriser une meilleure recuperation nocturne.</p>`,
      ].join("\n");
    });
    return padBurnoutContent(sectionType, parts.join("\n"));
  }

  const conclusion = [
    `<p>${name}, tu as besoin d'un plan clair et immediat. Trois actions non negociables cette semaine: coucher regulier, reduction des stimulants, et mouvement doux quotidien. Sans ces bases, rien ne tient.</p>`,
    "<p>Si tu appliques serieusement, tu peux ressentir un regain d'energie et une tete plus claire en 2-3 semaines. A 60-90 jours, tu retrouves une reserve stable et une meilleure resilience.</p>",
    "<p>Si tu ne changes rien, la phase s'enracine et la recuperation devient plus longue. L'objectif est simple: remettre ton systeme en securite et reconstruire une marge solide.</p>",
  ].join("\n");
  return padBurnoutContent(sectionType, conclusion);
}

// Generate section content with Claude Opus 4.5
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
  const client = getAnthropicClient();
  const knowledgeContext =
    data.knowledgeContext && data.knowledgeContext.length >= MIN_KNOWLEDGE_CONTEXT_CHARS
      ? data.knowledgeContext
      : FALLBACK_BURNOUT_CONTEXT;

  const criticalCategories = data.metrics.filter(m => m.value <= 4).map(m => m.label);
  const attentionCategories = data.metrics.filter(m => m.value > 4 && m.value <= 6).map(m => m.label);
  // RÈGLES ANTI-IA COMMUNES À TOUS LES PROMPTS
  const antiAIRules = `
RÈGLES ANTI-IA (CRITIQUES - TON TEXTE DOIT ÊTRE 100% INDÉTECTABLE):
INTERDITS ABSOLUS:
- "Bonjour [Prénom]" ou formules de salutation
- "J'espère que...", "N'hésite pas à...", "Je t'encourage à..."
- "Il est important de noter que...", "Il convient de souligner..."
- "En conclusion,", "Pour résumer,", "En somme,"
- Listes à puces génériques
- Ton robotique ou structure trop prévisible
- Excès de politesse

CE QUI REND TON TEXTE HUMAIN:
- Commence DIRECTEMENT par l'analyse
- Phrases courtes percutantes entre paragraphes argumentés
- Apartés personnels ("Honnêtement...", "Ce que je vois...")
- Observations spécifiques qui prouvent que tu as LU ses données
- Varie la longueur des phrases
- Sois direct, pas condescendant
- Tutoiement obligatoire ("tu", "ton", "tes")
- Ne dis jamais "client", "nous", "notre" ou "on"
- Ne cite JAMAIS de sources, d'auteurs, d'etudes, ni de noms propres`;

  const prompts: Record<string, string> = {
    intro: `Tu es Achzod, expert en gestion du stress et burnout avec 11 certifications internationales. Tu analyses le profil de ${data.clientName}.

${antiAIRules}

DONNÉES:
- Score global: ${data.globalScore}/100 (niveau de santé)
- Phase: ${data.phase} (${data.phaseInfo.label})
- Catégories critiques: ${criticalCategories.join(", ") || "Aucune"}
- Catégories attention: ${attentionCategories.join(", ") || "Aucune"}

CONTEXTE SCIENTIFIQUE:
${knowledgeContext}

OBLIGATION: integre les mecanismes issus du CONTEXTE SCIENTIFIQUE, mais sans jamais citer de sources.

Écris 3 paragraphes PERCUTANTS:
1. Diagnostic direct de la situation (pas de "bienvenue" - va droit au but)
2. Ce que la phase ${data.phase} signifie biologiquement pour son corps (cortisol, HPA, surrénales)
3. Pourquoi agir MAINTENANT est critique

Format: HTML simple (<p>, <strong>). Pas de markdown. Pas d'emojis. Ton direct et expert.`,

    analyse: `Tu es Achzod, expert en burnout. Analyse chirurgicale des scores de ${data.clientName}.

${antiAIRules}

SCORES PAR CATÉGORIE:
${data.metrics.map(m => `- ${m.label}: ${m.value}/10`).join("\n")}

Phase: ${data.phase}

CONTEXTE SCIENTIFIQUE (A INTEGRER SANS CITATION):
${knowledgeContext}

Pour chaque catégorie critique ou attention:
1. Ce que ce score RÉVÈLE vraiment (pas de langue de bois)
2. Les mécanismes biologiques impliqués (cortisol, HPA, neurotransmetteurs) - sois PRÉCIS
3. Comment cette catégorie SABOTE les autres (interconnexions)

Écris comme si tu parlais à cette personne après avoir passé 2h sur son dossier. Pas de généralités.

Format: HTML (<p>, <strong>). 4-5 paragraphes substantiels et PERSONNALISÉS.`,

    protocole: `Tu es Achzod, expert en récupération du burnout. Protocole pour ${data.clientName} en phase ${data.phase}.

${antiAIRules}

PROTOCOLE À INTÉGRER:
Suppléments: ${data.protocols.supplements.map(s => `${s.name} (${s.dosage})`).join(", ")}
Lifestyle: ${data.protocols.lifestyle.join(", ")}
Nutrition: ${data.protocols.nutrition.join(", ")}

CONTEXTE SCIENTIFIQUE (A INTEGRER SANS CITATION):
${knowledgeContext}

Structure en 3 parties:
1. SEMAINE 1-2: Actions d'URGENCE (ce qu'il doit faire DÈS DEMAIN)
2. SEMAINE 3-4: Consolidation (pourquoi chaque action compte biologiquement)
3. MOIS 2-3: Reconstruction durable (objectifs mesurables)

Pour chaque action, explique le POURQUOI biologique. Sois précis sur les timings et dosages.
Ne sois pas vague. Donne des heures, des quantités, des protocoles exacts.

Format: HTML (<p>, <strong>). Paragraphes narratifs, pas de listes génériques.`,

    supplements: `Tu es Achzod, expert en supplémentation niveau EXPERT. Stack pour la phase ${data.phase}.

${antiAIRules}

STACK:
${data.protocols.supplements.map(s => `- ${s.name}: ${s.dosage} - ${s.reason}`).join("\n")}

CONTEXTE SCIENTIFIQUE (A INTEGRER SANS CITATION):
${knowledgeContext}

Pour CHAQUE supplément, explique comme un EXPERT (pas comme une notice):

1. POURQUOI ce supplément dans SON cas précis
2. MÉCANISME D'ACTION précis (récepteurs, enzymes, voies métaboliques)
3. DOSAGE: pourquoi cette quantité, pas plus, pas moins
4. TIMING optimal et POURQUOI (chronobiologie)
5. COMMENT LIRE L'ÉTIQUETTE: ce qu'il doit vérifier avant d'acheter
6. SIGNES que ça fonctionne (quand il saura que ça marche)
7. PRÉCAUTIONS spécifiques à sa phase

La personne doit COMPRENDRE ce qu'elle prend et POURQUOI. Pas juste une liste de produits.

Format: HTML (<p>, <strong>). Paragraphes détaillés par supplément.`,

    conclusion: `Tu es Achzod, coach expert. Conclusion pour ${data.clientName}.

${antiAIRules}

CONTEXTE SCIENTIFIQUE (A INTEGRER SANS CITATION):
${knowledgeContext}

SITUATION:
- Phase: ${data.phase}
- Score: ${data.globalScore}%
- Points critiques: ${criticalCategories.join(", ") || "Aucun"}

Écris une conclusion qui POUSSE À L'ACTION:

1. LES 3 ACTIONS NON-NÉGOCIABLES (cette semaine, pas "un jour")
2. CE QUI SE PASSE dans 30/60/90 jours SI il applique
3. CE QUI SE PASSE SI IL NE FAIT RIEN (sois honnête, pas alarmiste mais réaliste)
4. Message final direct et personnel

PAS de "je crois en toi" ou de formules creuses.
Une phrase finale qui résonne avec SA situation spécifique.

Format: HTML (<p>, <strong>). Ton direct et motivant.`
  };

  const MAX_RETRIES = 3;
  let lastError: unknown = null;
  const minChars = MIN_BURNOUT_SECTION_CHARS[sectionType] || 900;
  const minWords = MIN_BURNOUT_SECTION_WORDS[sectionType] || 220;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const retryNote =
      attempt === 1
        ? ""
        : `\nATTENTION: Ta reponse precedente a ete rejetee. Elle est TROP COURTE ou pas assez dense. Tu DOIS produire au moins ${minChars} caracteres et ${minWords} mots, avec des paragraphes substantiels.\n`;

    try {
      const response = await client.messages.create({
        model: ANTHROPIC_CONFIG.ANTHROPIC_MODEL, // claude-opus-4-5-20251101
        max_tokens: 3200,
        temperature: 0.6,
        messages: [{ role: "user", content: `${prompts[sectionType] || prompts.intro}${retryNote}` }],
      });

      let content = "";
      if (response.content && response.content.length > 0) {
        const firstBlock = response.content[0];
        if (firstBlock.type === "text") {
          content = firstBlock.text;
        }
      }

      content = sanitizeBurnoutContent(content);
      content = normalizeSingleVoice(content);
      validateBurnoutSection(sectionType, content);
      return content;
    } catch (error) {
      lastError = error;
      console.error(`[Burnout] Claude error for ${sectionType} (attempt ${attempt}):`, error);
      if (attempt === MAX_RETRIES) break;
    }
  }

  if (openai) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await openai.chat.completions.create({
          model: OPENAI_CONFIG.OPENAI_MODEL,
          messages: [
            { role: "system", content: antiAIRules },
            { role: "user", content: `${prompts[sectionType] || prompts.intro}\n\nATTENTION: Tu dois produire au moins ${minChars} caracteres et ${minWords} mots, sans citer de sources.` },
          ],
          temperature: OPENAI_CONFIG.OPENAI_TEMPERATURE,
          max_tokens: OPENAI_CONFIG.OPENAI_MAX_TOKENS,
        });
        const raw = response.choices[0]?.message?.content || "";
        if (!raw.trim()) continue;
        let cleaned = sanitizeBurnoutContent(raw);
        cleaned = normalizeSingleVoice(cleaned);
        validateBurnoutSection(sectionType, cleaned);
        return cleaned;
      } catch (fallbackError) {
        lastError = fallbackError;
        console.error(`[Burnout] OpenAI error for ${sectionType} (attempt ${attempt}):`, fallbackError);
      }
    }
  }

  console.error(`[Burnout] Fallback section used for ${sectionType}:`, lastError);
  let fallback = buildFallbackBurnoutSection(sectionType, data);
  fallback = normalizeSingleVoice(fallback);
  try {
    validateBurnoutSection(sectionType, fallback);
  } catch (err) {
    console.error(`[Burnout] Fallback validation failed for ${sectionType}:`, err);
  }
  return fallback;
}

// Main analysis function
async function analyzeBurnout(responses: BurnoutResponse, email: string): Promise<BurnoutReportData> {
  const clientName = email.split("@")[0] || "Profil";

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
  let knowledgeContext = await getBurnoutKnowledge(phase, criticalCategories);
  if (!knowledgeContext || knowledgeContext.length < MIN_KNOWLEDGE_CONTEXT_CHARS) {
    console.warn("[Burnout] Knowledge context too short, using fallback context.");
    knowledgeContext = FALLBACK_BURNOUT_CONTEXT;
  }

  console.log(`[Burnout] Generating sections for ${email}, phase=${phase}, score=${globalScore}`);

  // Generate sections with Claude
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
    {
      id: "cta",
      title: "Aller Plus Loin",
      subtitle: "Accompagnement personnalisé",
      chips: ["Coaching", "Anabolic Bioscan"],
      content: generateBurnoutCTA(phase, globalScore),
    },
  ];

  return {
    globalScore,
    phase,
    phaseLabel: phaseInfo.label,
    phaseDescription: phaseInfo.description,
    clientName,
    generatedAt: new Date().toISOString(),
    metrics,
    sections,
  };
}

export function registerBurnoutRoutes(app: Express): void {
  /**
   * POST /api/burnout-detection/create-checkout-session
   */
  app.post("/api/burnout-detection/create-checkout-session", async (req, res) => {
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

      if (!BURNOUT_PRICE_ID) {
        res.status(503).json({
          error: "Paiement indisponible",
          message: "STRIPE_BURNOUT_PRICE_ID non configure",
        });
        return;
      }

      await storage.saveBurnoutProgress({
        email,
        currentSection: BURNOUT_CATEGORIES.length - 1,
        totalSections: BURNOUT_CATEGORIES.length,
        responses,
      });

      const stripe = await getUncachableStripeClient();
      const baseUrl = getBaseUrl();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: BURNOUT_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/burnout-detection?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/burnout-detection?cancelled=true`,
        customer_email: email,
        metadata: {
          email,
          planType: "BURNOUT",
        },
      });

      res.json({ success: true, sessionId: session.id, url: session.url });
    } catch (error) {
      console.error("[Burnout] Stripe checkout error:", error);
      res.status(500).json({ error: "Erreur création session" });
    }
  });

  /**
   * POST /api/burnout-detection/confirm-session
   */
  app.post("/api/burnout-detection/confirm-session", async (req, res) => {
    try {
      const sessionId = req.body?.sessionId || req.query?.session_id;
      if (!sessionId || typeof sessionId !== "string") {
        res.status(400).json({ error: "sessionId requis" });
        return;
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["customer"],
      });

      const isPaid = session.payment_status === "paid" || session.status === "complete";
      if (!isPaid) {
        res.status(202).json({ success: false, status: session.payment_status || session.status });
        return;
      }

      const email =
        session.customer_details?.email ||
        session.customer_email ||
        session.metadata?.email ||
        "";

      if (!email) {
        res.status(400).json({ error: "Email introuvable" });
        return;
      }

      const progress = await storage.getBurnoutProgress(email);
      const responses = progress?.responses || {};
      if (!responses || Object.keys(responses).length === 0) {
        res.status(400).json({ error: "QUESTIONNAIRE_MISSING" });
        return;
      }

      const result = await analyzeBurnout(responses as BurnoutResponse, email);
      const record = await storage.createBurnoutReport({
        email,
        responses,
        report: result,
      });

      const baseUrl = getBaseUrl();
      try {
        const emailSent = await sendReportReadyEmail(email, record.id, "BURNOUT", baseUrl);
        if (emailSent) {
          const clientName = (responses as any)?.prenom || email.split("@")[0];
          await sendAdminEmailNewAudit(email, clientName, "BURNOUT", record.id);
        }
      } catch (err) {
        console.error("[Burnout] Email send failed:", err);
      }

      res.json({ success: true, id: record.id });
    } catch (error) {
      console.error("[Burnout] Stripe confirmation error:", error);
      res.status(500).json({ error: "Erreur confirmation paiement" });
    }
  });

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

      const record = await storage.createBurnoutReport({
        email,
        responses,
        report: result,
      });

      const baseUrl = getBaseUrl();
      try {
        const emailSent = await sendReportReadyEmail(email, record.id, "BURNOUT", baseUrl);
        if (emailSent) {
          const clientName = (responses as any)?.prenom || email.split("@")[0];
          await sendAdminEmailNewAudit(email, clientName, "BURNOUT", record.id);
        }
      } catch (err) {
        console.error("[Burnout] Email send failed:", err);
      }

      console.log(`[Burnout] Result: ID=${record.id}, Phase=${result.phase}, Score=${result.globalScore}`);

      res.json({ success: true, id: record.id });
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
      const record = await storage.getBurnoutReport(id);
      if (!record) {
        res.status(404).json({ error: "Analyse non trouvée" });
        return;
      }

      const safeReport = (record.report && typeof record.report === "object") ? record.report as Record<string, unknown> : {};
      res.json({ ...safeReport, email: record.email });
    } catch (error) {
      console.error("[Burnout] Fetch error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  /**
   * POST /api/burnout-detection/:id/regenerate
   */
  app.post("/api/burnout-detection/:id/regenerate", async (req, res) => {
    try {
      const { id } = req.params;
      const record = await storage.getBurnoutReport(id);
      if (!record) {
        res.status(404).json({ error: "Analyse non trouvée" });
        return;
      }

      res.json({ success: true, id: record.id, started: true });

      (async () => {
        try {
          const responses = (record.responses || {}) as BurnoutResponse;
          const result = await analyzeBurnout(responses, record.email);
          await storage.updateBurnoutReport(record.id, result);
        } catch (error) {
          console.error("[Burnout] Regenerate background error:", error);
        }
      })();
    } catch (error) {
      console.error("[Burnout] Regenerate error:", error);
      res.status(500).json({ error: "Erreur regeneration burnout" });
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
      const record = await storage.createBurnoutReport({
        email: "test@example.com",
        responses: testResponses,
        report: result,
      });

      console.log(`[Burnout] Test created: ID=${record.id}`);

      res.json({ success: true, id: record.id, url: `/burnout/${record.id}` });
    } catch (error) {
      console.error("[Burnout] Create test error:", error);
      res.status(500).json({ error: "Erreur création test" });
    }
  });

  app.post("/api/burnout-detection/save-progress", async (req, res) => {
    try {
      const { email, currentSection, totalSections, responses } = req.body;
      if (!email || !email.includes("@")) {
        res.status(400).json({ error: "Email invalide" });
        return;
      }
      if (typeof currentSection !== "number") {
        res.status(400).json({ error: "Section invalide" });
        return;
      }

      const progress = await storage.saveBurnoutProgress({
        email,
        currentSection,
        totalSections,
        responses: responses || {},
      });
      res.json({ success: true, progress });
    } catch (error) {
      console.error("[Burnout] Save progress error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/burnout-detection/progress/:email", async (req, res) => {
    try {
      const { email } = req.params;
      if (!email || !email.includes("@")) {
        res.status(400).json({ error: "Email invalide" });
        return;
      }
      const progress = await storage.getBurnoutProgress(email);
      if (!progress) {
        res.json({ success: true, progress: null });
        return;
      }
      res.json({ success: true, progress });
    } catch (error) {
      console.error("[Burnout] Fetch progress error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });
}
