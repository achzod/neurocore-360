/**
 * APEXLABS - Peptides Engine
 * Analyse et generation de protocoles peptides sur mesure
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

let anthropicClient: Anthropic | null = null;
const PEPTIDES_PRICE_ID = process.env.STRIPE_PEPTIDES_PRICE_ID || "";

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

type ResponseValue = string | string[] | number | null | undefined;
interface PeptidesResponse {
  [questionId: string]: ResponseValue;
}

interface PeptidesReportData {
  globalScore: number;
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
    content: string;
  }[];
  profile?: {
    primaryGoal?: string;
    secondaryGoals?: string[];
    experience?: string;
    tolerance?: string;
    budget?: string;
    timeline?: string;
  };
}

const PEPTIDES_METRICS = [
  { key: "recovery", label: "Recuperation", description: "Capacite de recuperation" },
  { key: "sommeil", label: "Sommeil", description: "Qualite du sommeil" },
  { key: "cognition", label: "Cognition", description: "Focus mental" },
  { key: "libido", label: "Libido", description: "Equilibre hormonal" },
  { key: "performance", label: "Performance", description: "Progression entrainement" },
  { key: "composition", label: "Composition", description: "Masse grasse" },
  { key: "tendons", label: "Tendons", description: "Tissus conjonctifs" },
  { key: "skin", label: "Peau", description: "Collagene" },
];

const MIN_KNOWLEDGE_CONTEXT_CHARS = 200;
const MIN_SECTION_LINES = 18;
const MIN_SECTION_CHARS: Record<string, number> = {
  intro: 2200,
  diagnostic: 2600,
  peptides: 2800,
  protocoles: 3000,
  stack: 2400,
  execution: 2200,
  cta: 1600,
};
const MIN_SECTION_WORDS: Record<string, number> = {
  intro: 260,
  diagnostic: 320,
  peptides: 360,
  protocoles: 380,
  stack: 300,
  execution: 260,
  cta: 180,
};

const SOURCE_MARKERS = [
  "sources",
  "source",
  "references",
  "reference",
  "références",
  "référence",
  "huberman",
  "andrew huberman",
  "huberman lab",
  "peter attia",
  "applied metabolics",
  "stronger by science",
  "sbs",
  "examine",
  "examine.com",
  "renaissance periodization",
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

const FALLBACK_PEPTIDES_CONTEXT = [
  "SOURCE: huberman",
  "TITRE: Axe GH/IGF-1 et recuperation",
  "CONTENU: L'axe GH/IGF-1 influence la recuperation tissulaire, la regulation glycemique et la composition corporelle. Un sommeil profond et une charge nerveuse stable facilitent la secretion pulsatile de GH.",
  "",
  "---",
  "",
  "SOURCE: applied_metabolics",
  "TITRE: Optimisation tissulaire et inflammation",
  "CONTENU: Les tissus conjonctifs repondent mieux lorsque l'inflammation est controlee et que les apports proteiques sont coherents. Les protocoles efficaces combinent charge progressive, sommeil, et timing nutritionnel.",
  "",
  "---",
  "",
  "SOURCE: sbs",
  "TITRE: Recomposition et adherence",
  "CONTENU: Les meilleurs resultats viennent d'un plan executable. Prioriser les actions a fort impact augmente la constance et la progression sur 8-12 semaines.",
].join("\n");

const openai = OPENAI_CONFIG.OPENAI_API_KEY
  ? new OpenAI({ apiKey: OPENAI_CONFIG.OPENAI_API_KEY })
  : null;

const COACHING_OFFER_TIERS = [
  {
    label: "Starter",
    href: "https://www.achzodcoaching.com/coaching-starter",
    offers: [{ duration: "8 semaines", price: 199 }],
  },
  {
    label: "Essential",
    href: "https://www.achzodcoaching.com/coaching-essential",
    offers: [
      { duration: "4 semaines", price: 249 },
      { duration: "8 semaines", price: 399 },
      { duration: "12 semaines", price: 549 },
    ],
  },
  {
    label: "Elite",
    href: "https://www.achzodcoaching.com/coaching-elite",
    offers: [
      { duration: "4 semaines", price: 399 },
      { duration: "8 semaines", price: 649 },
      { duration: "12 semaines", price: 899 },
    ],
  },
  {
    label: "Private Lab",
    href: "https://www.achzodcoaching.com/coaching-achzod-private-lab",
    offers: [
      { duration: "4 semaines", price: 499 },
      { duration: "8 semaines", price: 799 },
      { duration: "12 semaines", price: 1199 },
    ],
  },
];

const formatEuro = (value: number): string => {
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
  return `${formatted}€`;
};

const renderCoachingOffersTable = (deductionAmount: number) => {
  const hasDeduction = deductionAmount > 0;
  const rows = COACHING_OFFER_TIERS.flatMap((tier) =>
    tier.offers.map((offer) => {
      const after = Math.max(0, offer.price - deductionAmount);
      return `
        <tr style="border-top: 1px solid var(--border);">
          <td class="py-3 pr-4">
            <div class="font-medium" style="color: var(--text);">${tier.label}</div>
          </td>
          <td class="text-center py-3 px-2">${offer.duration}</td>
          <td class="text-center py-3 px-2">
            <span style="color: var(--text-secondary);${hasDeduction ? " text-decoration: line-through;" : ""}">${formatEuro(offer.price)}</span>
          </td>
          <td class="text-center py-3 px-2">
            <div class="font-bold" style="color: var(--primary);">${formatEuro(after)}</div>
          </td>
        </tr>
      `;
    })
  ).join("");

  return `
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr style="color: var(--text-secondary);">
          <th class="text-left py-2 pr-4">Formule</th>
          <th class="text-center py-2 px-2">Duree</th>
          <th class="text-center py-2 px-2">Prix standard</th>
          <th class="text-center py-2 px-2">Prix apres deduction</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
  `;
};

const EMOJI_REGEX = /[\p{Extended_Pictographic}\uFE0F]/gu;

function sanitizePeptidesContent(content: string): string {
  let cleaned = content
    .replace(/^\s*(Sources?|References?|Références?)\s*:.*$/gmi, "")
    .replace(/Sources?\s*:.*$/gmi, "")
    .replace(/^\s*Source\s*:.*$/gmi, "")
    .replace(/\b(huberman|andrew\s+huberman|huberman\s+lab|peter\s+attia|attia|applied\s+metabolics|stronger\s+by\s+science|sbs|examine(?:\.com)?|renaissance\s+periodization|mpmd|more\s+plates|moreplates|newsletter|achzod|matthew\s+walker|sapolsky|layne\s+norton|ben\s+bikman|rhonda\s+patrick|robert\s+lustig|andy\s+galpin|brad\s+schoenfeld|mike\s+israetel|justin\s+sonnenburg|chris\s+kresser)\b/gi, "")
    .replace(EMOJI_REGEX, "")
    .replace(/\bclients\b/gi, "profils")
    .replace(/\bclient\b/gi, "profil")
    .replace(/\bnous\b/gi, "je")
    .replace(/\bnotre\b/gi, "mon")
    .replace(/\bon\b/gi, "je")
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

function validatePeptidesSection(sectionType: string, content: string): void {
  const trimmed = content.trim();
  const minChars = MIN_SECTION_CHARS[sectionType] || 900;
  const minWords = MIN_SECTION_WORDS[sectionType] || 220;
  const textLineCount = trimmed.split(/\n+/).filter((line) => line.trim()).length;
  const paragraphCount = (trimmed.match(/<p>/g) || []).length;
  const lineCount = Math.max(textLineCount, paragraphCount);
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const lower = trimmed.toLowerCase();
  const hasClient = /\bclient\b/.test(lower);
  const hasNous = /\bnous\b/.test(lower) || /\bnotre\b/.test(lower) || /\bon\b/.test(lower);
  const hasSources = SOURCE_MARKERS.some((marker) => lower.includes(marker)) || lower.includes("sources:");

  if (trimmed.length < minChars || lineCount < MIN_SECTION_LINES || wordCount < minWords) {
    throw new Error(`PEPTIDES_SECTION_TOO_SHORT:${sectionType}`);
  }
  if (hasClient || hasNous || hasSources) {
    throw new Error(`PEPTIDES_SECTION_FORBIDDEN_WORDS:${sectionType}`);
  }
}

function padPeptidesContent(sectionType: string, content: string): string {
  const minChars = MIN_SECTION_CHARS[sectionType] || 900;
  const minWords = MIN_SECTION_WORDS[sectionType] || 220;
  const filler = [
    "<p>Le plan doit rester executable. Tant que tu ne tiens pas la base (sommeil stable, proteines suffisantes, stress mieux gere), le protocole n'exprime que 50% de son potentiel.</p>",
    "<p>Je prefere une strategie claire et suivie a 90% plutot qu'un plan parfait execute a 20%. On verrouille l'essentiel, puis on affine.</p>",
  ].join("\n");

  let padded = content.trim();
  while (padded.length < minChars || padded.split(/\s+/).filter(Boolean).length < minWords) {
    padded = `${padded}\n${filler}`;
  }
  return padded;
}

function buildFallbackPeptidesSection(sectionType: string, data: {
  clientName: string;
  profile: PeptidesReportData["profile"];
  metrics: PeptidesReportData["metrics"];
  globalScore: number;
}): string {
  const name = data.clientName || "Profil";
  const priority = data.metrics.filter((m) => m.value <= 6).map((m) => m.label);

  if (sectionType === "intro") {
    const content = [
      `<p>${name}, ton profil montre un potentiel solide mais des blocages nets sur certains axes. L'objectif est de concentrer l'effort sur les leviers a impact rapide.</p>`,
      `<p>Score global ${data.globalScore}/100. Ce score n'est pas une note, c'est une photo de ton niveau d'optimisation actuel. Il reste une marge claire a debloquer.</p>`,
      "<p>Tu vas recevoir un protocole peptides clair, mais il sera efficace uniquement si la base est stable: sommeil, nutrition, recuperation.</p>",
    ].join("\n");
    return padPeptidesContent(sectionType, content);
  }

  if (sectionType === "diagnostic") {
    const content = [
      `<p>Priorites detectees: ${priority.join(", ") || "Aucun axe critique"}. Ce sont les points qui limitent ta progression actuelle.</p>`,
      "<p>La logique est simple: si un axe bloque, tous les autres plafonnent. Je cible d'abord les freins, puis j'optimise.</p>",
      "<p>Le plan va donc prioriser la recuperation, la stabilite hormonale et la qualite du sommeil avant d'augmenter l'intensite.</p>",
    ].join("\n");
    return padPeptidesContent(sectionType, content);
  }

  if (sectionType === "peptides") {
    const content = [
      "<p>Je privilegie un stack court, coherent, avec des peptides a fort impact et un timing facile a appliquer.</p>",
      "<p>Tu auras des recommandations par objectif: recuperation, composition, tissus conjonctifs, cognition. Chaque choix est justifie par son effet physiologique.</p>",
      "<p>Je limite volontairement le nombre de peptides pour assurer la lisibilite et la securite du protocole.</p>",
    ].join("\n");
    return padPeptidesContent(sectionType, content);
  }

  if (sectionType === "protocoles") {
    const content = [
      "<p>Le protocole est decoupe par phases. Phase 1: reset et stabilisation. Phase 2: optimisation progressive. Phase 3: consolidation.</p>",
      "<p>Chaque peptide est associe a un dosage et un timing. L'objectif est d'eviter les effets aleatoires et de mesurer ce qui fonctionne.</p>",
      "<p>Je te donne aussi les marqueurs a suivre pour ajuster sans perdre de temps.</p>",
    ].join("\n");
    return padPeptidesContent(sectionType, content);
  }

  if (sectionType === "stack") {
    const content = [
      "<p>Le stack supplements est la couche de support: magnesium, omega-3, creatine, adaptogenes si necessaire.</p>",
      "<p>Je precise les doses et le timing pour que tout reste simple. Pas de poudre inutile.</p>",
    ].join("\n");
    return padPeptidesContent(sectionType, content);
  }

  if (sectionType === "execution") {
    const content = [
      "<p>Plan 12 semaines: checkpoints a 4, 8 et 12 semaines. A chaque phase, un objectif mesurable.</p>",
      "<p>Si tu veux aller plus vite, il faut un suivi et des ajustements en temps reel.</p>",
    ].join("\n");
    return padPeptidesContent(sectionType, content);
  }

  const content = [
    "<p>Si tu veux que je pilote l'execution, le montant de Peptides Engine est deduit a 100% du coaching. Tu ne paies pas deux fois.</p>",
    "<p>Je peux ajuster en direct selon tes retours, tes bilans et ton adherence.</p>",
  ].join("\n");
  return padPeptidesContent(sectionType, content);
}

const resolveValue = (value: ResponseValue): string => {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
};

const toList = (value: ResponseValue): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (!value) return [];
  return [String(value)];
};

const mapLabel = (value: ResponseValue, map: Record<string, string>): string => {
  const key = resolveValue(value);
  return map[key] || key;
};

function buildPeptidesProfile(responses: PeptidesResponse, email: string): PeptidesReportData["profile"] {
  const objectifMap: Record<string, string> = {
    prise_masse: "Prise de muscle",
    recomposition: "Recomposition",
    performance: "Performance",
    perte_gras: "Perte de gras",
    recuperation: "Recuperation",
  };
  const experienceMap: Record<string, string> = {
    jamais: "Jamais",
    occasionnel: "1-2 fois",
    regulier: "Regulier",
  };
  const toleranceMap: Record<string, string> = {
    ok: "OK injectables",
    oral: "Preferer oral/topique",
    eviter: "A eviter",
  };
  const budgetMap: Record<string, string> = {
    "<100": "<100€/mois",
    "100-200": "100-200€/mois",
    "200-400": "200-400€/mois",
    "400+": "400€+/mois",
  };

  return {
    primaryGoal: mapLabel(responses.objectif_principal, objectifMap),
    secondaryGoals: toList(responses.objectifs_secondaires).map((value) => {
      const map: Record<string, string> = {
        sommeil: "Sommeil",
        focus: "Focus",
        libido: "Libido",
        energie: "Energie",
        peau: "Peau/Collagene",
        blessures: "Blessures",
      };
      return map[value] || value;
    }),
    experience: mapLabel(responses.experience_peptides, experienceMap),
    tolerance: mapLabel(responses.tolerance_injection, toleranceMap),
    budget: mapLabel(responses.budget, budgetMap),
    timeline: resolveValue(responses.timeline) || resolveValue(responses.delai),
  };
}

function computeMetrics(responses: PeptidesResponse): PeptidesReportData["metrics"] {
  const objectifPeptides = new Set(toList(responses.objectifs_peptides));
  const objectifsSecondaires = new Set(toList(responses.objectifs_secondaires));
  const baseScore = 7;

  const score = (value: number): number => Math.max(1, Math.min(10, value));

  const sommeilQualite = resolveValue(responses.sommeil_qualite);
  const recuperation = resolveValue(responses.recuperation);
  const plateau = resolveValue(responses.plateau);
  const masseGrasse = resolveValue(responses.masse_grasse);
  const douleurs = resolveValue(responses.douleurs_articulaires);
  const blessures = resolveValue(responses.blessures);
  const energie = resolveValue(responses.energie_journee);

  const metrics = PEPTIDES_METRICS.map((metric) => {
    let value = baseScore;

    if (metric.key === "recovery") {
      if (recuperation === "mauvaise") value -= 3;
      if (recuperation === "moyenne") value -= 1;
      if (energie === "fatigue") value -= 2;
      if (objectifPeptides.has("gh") || objectifPeptides.has("immunite")) value -= 2;
    }

    if (metric.key === "sommeil") {
      if (sommeilQualite === "moins5") value -= 3;
      if (sommeilQualite === "5-6") value -= 2;
      if (sommeilQualite === "6-7") value -= 1;
      if (objectifPeptides.has("sommeil") || objectifsSecondaires.has("sommeil")) value -= 2;
    }

    if (metric.key === "cognition") {
      if (objectifPeptides.has("cognition") || objectifsSecondaires.has("focus")) value -= 2;
      if (energie === "chute") value -= 1;
    }

    if (metric.key === "libido") {
      if (objectifPeptides.has("libido") || objectifsSecondaires.has("libido")) value -= 2;
    }

    if (metric.key === "performance") {
      if (plateau === "oui") value -= 2;
      if (objectifPeptides.has("gh") || resolveValue(responses.objectif_principal) === "performance") value -= 1;
    }

    if (metric.key === "composition") {
      if (resolveValue(responses.objectif_principal) === "perte_gras") value -= 2;
      if (objectifPeptides.has("perte_gras")) value -= 2;
      if (["20-25", ">25"].includes(masseGrasse)) value -= 2;
    }

    if (metric.key === "tendons") {
      if (objectifPeptides.has("tendons")) value -= 2;
      if (douleurs === "souvent") value -= 2;
      if (typeof blessures === "string" && blessures.trim().length > 0) value -= 1;
    }

    if (metric.key === "skin") {
      if (objectifPeptides.has("peau")) value -= 2;
    }

    return {
      key: metric.key,
      label: metric.label,
      value: score(value),
      max: 10,
      description: metric.description,
    };
  });

  return metrics;
}

const buildKeywords = (responses: PeptidesResponse): string[] => {
  const keywords = ["peptides", "gh", "igf-1", "recovery", "collagen", "sleep", "protocol"];
  const objectifs = toList(responses.objectifs_peptides);

  if (objectifs.includes("gh")) keywords.push("growth hormone", "cjc-1295", "ipamorelin");
  if (objectifs.includes("tendons")) keywords.push("bpc-157", "tb-500", "tendon");
  if (objectifs.includes("sommeil")) keywords.push("sleep", "circadian", "melatonin");
  if (objectifs.includes("cognition")) keywords.push("cognition", "focus", "bdnf");
  if (objectifs.includes("libido")) keywords.push("libido", "testosterone", "hormone");
  if (objectifs.includes("peau")) keywords.push("collagen", "skin", "ghk-cu");
  if (objectifs.includes("perte_gras")) keywords.push("glp-1", "insulin", "appetite");
  if (objectifs.includes("immunite")) keywords.push("immunity", "inflammation");

  return keywords;
};

async function getPeptidesKnowledge(responses: PeptidesResponse): Promise<string> {
  try {
    const keywords = buildKeywords(responses);
    let articles = await searchArticles(keywords, 6, ALLOWED_SOURCES as unknown as string[]);
    if (articles.length === 0) {
      const fallbackQuery = keywords.slice(0, 6).join(" ");
      const ft = await searchFullText(fallbackQuery, 6);
      articles = ft.filter(a => (ALLOWED_SOURCES as unknown as string[]).includes(a.source as string));
    }
    if (articles.length === 0) return "";

    return articles.map(a =>
      `SOURCE: ${a.source}\nTITRE: ${a.title}\nCONTENU: ${a.content.substring(0, 800)}`
    ).join("\n\n---\n\n");
  } catch (error) {
    console.error("[Peptides] Knowledge search error:", error);
    return "";
  }
}

async function generatePeptidesSection(
  sectionType: string,
  data: {
    clientName: string;
    globalScore: number;
    metrics: PeptidesReportData["metrics"];
    profile: PeptidesReportData["profile"];
    responsesSnapshot: string;
    knowledgeContext: string;
  }
): Promise<string> {
  const client = getAnthropicClient();
  const knowledgeContext =
    data.knowledgeContext && data.knowledgeContext.length >= MIN_KNOWLEDGE_CONTEXT_CHARS
      ? data.knowledgeContext
      : FALLBACK_PEPTIDES_CONTEXT;

  const priorityMetrics = data.metrics.filter((m) => m.value <= 6).map((m) => m.label);

  const antiAIRules = `
RÈGLES ANTI-IA (CRITIQUES - TON TEXTE DOIT ÊTRE 100% INDÉTECTABLE):
INTERDITS ABSOLUS:
- "Bonjour [Prénom]" ou salutations
- "J'espère que", "N'hésite pas", "Je t'encourage"
- "Il est important de noter", "Il convient de souligner"
- "En conclusion", "Pour résumer"
- Ton robotique ou structure trop prévisible
- Emoji
- Mots "client", "nous", "notre" ou "on"
- Citations de sources, auteurs, etudes

STYLE REQUIS:
- Commence directement par l'analyse
- Phrases courtes percutantes + paragraphes denses
- Observations concretes qui prouvent que tu as lu ses réponses
- Ton direct, expert, sans blabla
- Tutoiement obligatoire
- Pas de listes generiques ou vagues
`;

  const prompts: Record<string, string> = {
    intro: `Tu es Achzod, expert peptides. Tu analyses ${data.clientName}.

${antiAIRules}

DONNEES:
- Score global: ${data.globalScore}/100
- Priorites: ${priorityMetrics.join(", ") || "Aucune"}
- Profil: ${JSON.stringify(data.profile)}

CONTEXTE SCIENTIFIQUE (A INTEGRER SANS CITATION):
${knowledgeContext}

Ecris 3 paragraphes:
1) Diagnostic global direct
2) Ce que dit le score et pourquoi ca bloque
3) Pourquoi agir maintenant avec un protocole clair

Format: HTML simple (<p>, <strong>).` ,

    diagnostic: `Tu es Achzod, expert peptides. Diagnostic detaille.

${antiAIRules}

SCORES:
${data.metrics.map(m => `- ${m.label}: ${m.value}/10`).join("\n")}

REPONSES:
${data.responsesSnapshot}

CONTEXTE SCIENTIFIQUE:
${knowledgeContext}

Analyse les axes faibles et leur impact. Explique les interconnexions. Pas de generalites.
Format: HTML (<p>, <strong>). 4-5 paragraphes consistants.`,

    peptides: `Tu es Achzod, expert peptides. Propose les peptides adaptes.

${antiAIRules}

REPONSES:
${data.responsesSnapshot}

CONTEXTE SCIENTIFIQUE:
${knowledgeContext}

Propose 3 a 5 peptides max. Pour chaque peptide:
- Pourquoi il est logique pour ce profil
- Mecanisme d'action
- Resultat attendu et timing
- Precautions a prendre

Pas de liste generique. Ecris en HTML (<p>, <strong>).`,

    protocoles: `Tu es Achzod, expert peptides. Ecris le protocole detaille.

${antiAIRules}

REPONSES:
${data.responsesSnapshot}

CONTEXTE SCIENTIFIQUE:
${knowledgeContext}

Structure en 3 phases:
1) Semaines 1-2: mise en route + securite
2) Semaines 3-6: optimisation
3) Semaines 7-12: consolidation

Donne les dosages, timing, jours on/off. Explique le pourquoi.
Format: HTML (<p>, <strong>).`,

    stack: `Tu es Achzod, expert peptides. Stack supplements + lifestyle.

${antiAIRules}

REPONSES:
${data.responsesSnapshot}

CONTEXTE SCIENTIFIQUE:
${knowledgeContext}

Explique la logique de la stack: supplements, sommeil, nutrition, entrainement. Precise doses et timing.
Format: HTML (<p>, <strong>).`,

    execution: `Tu es Achzod, coach. Plan d'execution.

${antiAIRules}

REPONSES:
${data.responsesSnapshot}

CONTEXTE SCIENTIFIQUE:
${knowledgeContext}

Ecris un plan 12 semaines avec checkpoints, indicateurs a suivre et signaux d'ajustement.
Format: HTML (<p>, <strong>).`,

    cta: `Tu es Achzod. CTA coaching.

${antiAIRules}

Explique que Peptides Engine est deduit a 100% du coaching. Invite a me contacter.
Format: HTML (<p>, <strong>).`,
  };

  const minChars = MIN_SECTION_CHARS[sectionType] || 900;
  const minWords = MIN_SECTION_WORDS[sectionType] || 220;
  const retryNote = `\n\nIMPORTANT: tu dois produire au moins ${minChars} caracteres et ${minWords} mots, sans citer de sources.`;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await client.messages.create({
        model: ANTHROPIC_CONFIG.ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_CONFIG.ANTHROPIC_MAX_TOKENS,
        temperature: ANTHROPIC_CONFIG.ANTHROPIC_TEMPERATURE,
        messages: [{ role: "user", content: `${prompts[sectionType] || prompts.intro}${retryNote}` }],
      });

      const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
      if (!raw.trim()) throw new Error("EMPTY_CLAUDE_RESPONSE");

      let cleaned = sanitizePeptidesContent(raw);
      cleaned = normalizeSingleVoice(cleaned);
      validatePeptidesSection(sectionType, cleaned);
      return cleaned;
    } catch (error) {
      lastError = error;
      console.error(`[Peptides] Claude error for ${sectionType} (attempt ${attempt}):`, error);
      if (attempt === 3) break;
    }
  }

  if (openai) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await openai.chat.completions.create({
          model: OPENAI_CONFIG.OPENAI_MODEL,
          messages: [
            { role: "system", content: "Ecris en francais, ton direct, aucun emoji, aucune source." },
            { role: "user", content: `${prompts[sectionType] || prompts.intro}${retryNote}` },
          ],
          temperature: OPENAI_CONFIG.OPENAI_TEMPERATURE,
          max_tokens: OPENAI_CONFIG.OPENAI_MAX_TOKENS,
        });
        const raw = response.choices[0]?.message?.content || "";
        if (!raw.trim()) continue;
        let cleaned = sanitizePeptidesContent(raw);
        cleaned = normalizeSingleVoice(cleaned);
        validatePeptidesSection(sectionType, cleaned);
        return cleaned;
      } catch (fallbackError) {
        lastError = fallbackError;
        console.error(`[Peptides] OpenAI error for ${sectionType} (attempt ${attempt}):`, fallbackError);
      }
    }
  }

  console.error(`[Peptides] Fallback section used for ${sectionType}:`, lastError);
  let fallback = buildFallbackPeptidesSection(sectionType, {
    clientName: data.clientName,
    profile: data.profile,
    metrics: data.metrics,
    globalScore: data.globalScore,
  });
  fallback = normalizeSingleVoice(fallback);
  try {
    validatePeptidesSection(sectionType, fallback);
  } catch (err) {
    console.error(`[Peptides] Fallback validation failed for ${sectionType}:`, err);
  }
  return fallback;
}

function buildResponsesSnapshot(responses: PeptidesResponse): string {
  const entries = Object.entries(responses)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${resolveValue(value)}`);
  return entries.slice(0, 30).join("\n");
}

function generatePeptidesCTA(deductionAmount: number): string {
  return [
    `<p>Si tu veux que je pilote l'execution, le montant du Peptides Engine (${formatEuro(deductionAmount)}) est deduit a 100% du coaching. Tu ne paies pas deux fois.</p>`,
    "<p>Je corrige en direct selon tes retours, tes bilans et ton adherence. Objectif: resultat net, sans improvisation.</p>",
    "<p>Ebook offert: <a href=\"https://www.achzodcoaching.com/product/anabolic-code-la-science-interdite-de-lhgh-de-ligf-1-et-des-peptides-au-service-de-ta-mutation-corporelle\">Anabolic Code</a></p>",
    renderCoachingOffersTable(deductionAmount),
    "<p>Email: coaching@achzodcoaching.com<br/>Site: achzodcoaching.com</p>",
  ].join("\n");
}

async function analyzePeptides(responses: PeptidesResponse, email: string): Promise<PeptidesReportData> {
  const clientName = (resolveValue(responses.prenom) || email.split("@")[0] || "Profil").toString();
  const metrics = computeMetrics(responses);
  const avg = metrics.reduce((acc, m) => acc + m.value, 0) / metrics.length;
  const globalScore = Math.round(avg * 10);
  const profile = buildPeptidesProfile(responses, email);

  let knowledgeContext = await getPeptidesKnowledge(responses);
  if (!knowledgeContext || knowledgeContext.length < MIN_KNOWLEDGE_CONTEXT_CHARS) {
    console.warn("[Peptides] Knowledge context too short, using fallback.");
    knowledgeContext = FALLBACK_PEPTIDES_CONTEXT;
  }

  const responsesSnapshot = buildResponsesSnapshot(responses);

  console.log(`[Peptides] Generating sections for ${email}, score=${globalScore}`);

  const sectionData = {
    clientName,
    globalScore,
    metrics,
    profile,
    responsesSnapshot,
    knowledgeContext,
  };

  const [introContent, diagnosticContent, peptidesContent, protocolesContent, stackContent, executionContent] = await Promise.all([
    generatePeptidesSection("intro", sectionData),
    generatePeptidesSection("diagnostic", sectionData),
    generatePeptidesSection("peptides", sectionData),
    generatePeptidesSection("protocoles", sectionData),
    generatePeptidesSection("stack", sectionData),
    generatePeptidesSection("execution", sectionData),
  ]);

  const sections = [
    {
      id: "intro",
      title: "Lecture globale",
      subtitle: "Analyse peptides",
      chips: ["Peptides Engine", `Score ${globalScore}/100`],
      content: introContent,
    },
    {
      id: "diagnostic",
      title: "Priorites biologiques",
      subtitle: "Ce qui bloque vraiment",
      chips: metrics.filter((m) => m.value <= 6).map((m) => m.label),
      content: diagnosticContent,
    },
    {
      id: "peptides",
      title: "Peptides recommandes",
      subtitle: "Selection adaptee a ton profil",
      chips: ["Recuperation", "Composition", "Tissus"],
      content: peptidesContent,
    },
    {
      id: "protocoles",
      title: "Protocoles & dosages",
      subtitle: "Plan structure",
      chips: ["Semaines 1-12"],
      content: protocolesContent,
    },
    {
      id: "stack",
      title: "Stack & lifestyle",
      subtitle: "Support quotidien",
      chips: ["Supplements", "Sommeil", "Nutrition"],
      content: stackContent,
    },
    {
      id: "execution",
      title: "Plan d'execution",
      subtitle: "Checkpoints clairs",
      chips: ["4-8-12 semaines"],
      content: executionContent,
    },
    {
      id: "cta",
      title: "Aller plus loin",
      subtitle: "Accompagnement Achzod",
      chips: ["Coaching"],
      content: generatePeptidesCTA(99),
    },
  ];

  return {
    globalScore,
    clientName,
    generatedAt: new Date().toISOString(),
    metrics,
    sections,
    profile,
  };
}

export function registerPeptidesRoutes(app: Express): void {
  app.post("/api/peptides-engine/create-checkout-session", async (req, res) => {
    try {
      const { responses, email } = req.body;

      if (!responses || Object.keys(responses).length === 0) {
        res.status(400).json({ error: "Aucune reponse fournie" });
        return;
      }

      if (!email || !email.includes("@")) {
        res.status(400).json({ error: "Email invalide" });
        return;
      }

      if (!PEPTIDES_PRICE_ID) {
        res.status(503).json({
          error: "Paiement indisponible",
          message: "STRIPE_PEPTIDES_PRICE_ID non configure",
        });
        return;
      }

      await storage.savePeptidesProgress({
        email,
        currentSection: 5,
        totalSections: 6,
        responses,
      });

      const stripe = await getUncachableStripeClient();
      const baseUrl = getBaseUrl();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: PEPTIDES_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/peptides-engine?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/peptides-engine?cancelled=true`,
        customer_email: email,
        metadata: {
          email,
          planType: "PEPTIDES",
        },
      });

      res.json({ success: true, sessionId: session.id, url: session.url });
    } catch (error) {
      console.error("[Peptides] Stripe checkout error:", error);
      res.status(500).json({ error: "Erreur creation session" });
    }
  });

  app.post("/api/peptides-engine/confirm-session", async (req, res) => {
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

      if (!session || session.payment_status !== "paid") {
        res.status(402).json({ error: "Paiement non valide" });
        return;
      }

      const email = session.customer_details?.email || session.metadata?.email;
      if (!email) {
        res.status(400).json({ error: "Email manquant" });
        return;
      }

      const progress = await storage.getPeptidesProgress(email);
      const responses = (progress?.responses || {}) as PeptidesResponse;

      const result = await analyzePeptides(responses, email);
      const record = await storage.createPeptidesReport({
        email,
        responses,
        report: result,
      });

      try {
        const baseUrl = getBaseUrl();
        await sendReportReadyEmail(email, record.id, "PEPTIDES", baseUrl);
        await sendAdminEmailNewAudit(email, result.clientName || email.split("@")[0], "PEPTIDES", record.id);
      } catch (err) {
        console.error("[Peptides] Email send failed:", err);
      }

      res.json({ success: true, id: record.id, url: `/peptides/${record.id}` });
    } catch (error) {
      console.error("[Peptides] Stripe confirmation error:", error);
      res.status(500).json({ error: "Erreur confirmation paiement" });
    }
  });

  app.post("/api/peptides-engine/analyze", async (req, res) => {
    try {
      const { responses, email } = req.body;

      if (!responses || Object.keys(responses).length === 0) {
        res.status(400).json({ error: "Aucune reponse fournie" });
        return;
      }

      if (!email || !email.includes("@")) {
        res.status(400).json({ error: "Email invalide" });
        return;
      }

      const result = await analyzePeptides(responses, email);
      const record = await storage.createPeptidesReport({
        email,
        responses,
        report: result,
      });

      try {
        const baseUrl = getBaseUrl();
        await sendReportReadyEmail(email, record.id, "PEPTIDES", baseUrl);
        await sendAdminEmailNewAudit(email, result.clientName || email.split("@")[0], "PEPTIDES", record.id);
      } catch (err) {
        console.error("[Peptides] Email send failed:", err);
      }

      res.json({ success: true, id: record.id, url: `/peptides/${record.id}`, report: result });
    } catch (error) {
      console.error("[Peptides] Analysis error:", error);
      res.status(500).json({ error: "Erreur analyse peptides" });
    }
  });

  app.get("/api/peptides-engine/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const record = await storage.getPeptidesReport(id);
      if (!record) {
        res.status(404).json({ error: "Rapport introuvable" });
        return;
      }
      const report = record.report as PeptidesReportData;
      res.json({ ...report, email: record.email });
    } catch (error) {
      console.error("[Peptides] Fetch error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/peptides-engine/:id/regenerate", async (req, res) => {
    try {
      const { id } = req.params;
      const record = await storage.getPeptidesReport(id);
      if (!record) {
        res.status(404).json({ error: "Rapport introuvable" });
        return;
      }

      res.status(202).json({ success: true, status: "regenerating" });

      setTimeout(async () => {
        try {
          const responses = (record.responses || {}) as PeptidesResponse;
          const result = await analyzePeptides(responses, record.email);
          await storage.updatePeptidesReport(record.id, result);
        } catch (error) {
          console.error("[Peptides] Regenerate background error:", error);
        }
      }, 1000);
    } catch (error) {
      console.error("[Peptides] Regenerate error:", error);
      res.status(500).json({ error: "Erreur regeneration peptides" });
    }
  });

  app.post("/api/peptides-engine/create-test", async (_req, res) => {
    try {
      const testResponses: PeptidesResponse = {
        prenom: "Test",
        objectif_principal: "recomposition",
        objectifs_peptides: ["gh", "tendons", "sommeil"],
        experience_peptides: "jamais",
        tolerance_injection: "ok",
        budget: "100-200",
        sommeil_qualite: "6-7",
        recuperation: "moyenne",
        plateau: "oui",
        douleurs_articulaires: "parfois",
      };
      const result = await analyzePeptides(testResponses, "test@example.com");
      const record = await storage.createPeptidesReport({
        email: "test@example.com",
        responses: testResponses,
        report: result,
      });
      res.json({ success: true, id: record.id, url: `/peptides/${record.id}` });
    } catch (error) {
      console.error("[Peptides] Create test error:", error);
      res.status(500).json({ error: "Erreur creation test" });
    }
  });

  app.post("/api/peptides-engine/save-progress", async (req, res) => {
    try {
      const { email, currentSection, totalSections, responses } = req.body;
      if (!email || !email.includes("@")) {
        res.status(400).json({ success: false, error: "Email invalide" });
        return;
      }
      const progress = await storage.savePeptidesProgress({
        email,
        currentSection: Number(currentSection) || 0,
        totalSections: Number(totalSections) || 6,
        responses: responses || {},
      });
      res.json({ success: true, progress });
    } catch (error) {
      console.error("[Peptides] Save progress error:", error);
      res.status(500).json({ success: false, error: "Erreur sauvegarde" });
    }
  });

  app.get("/api/peptides-engine/progress/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const progress = await storage.getPeptidesProgress(email);
      res.json({ success: true, progress });
    } catch (error) {
      console.error("[Peptides] Fetch progress error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });
}
