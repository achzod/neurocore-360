/**
 * NEUROCORE 360 - Module de generation d'audits avec Claude Opus 4.5
 * Remplace openaiPremiumEngine pour une generation plus personnalisee et detaillee
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { ClientData, PhotoAnalysis, AuditResult, SectionName, AuditTier } from './types';
import { formatPhotoAnalysisForReport } from './photoAnalysisAI';
import { ANTHROPIC_CONFIG, validateAnthropicConfig, SECTION_TOKEN_LIMITS } from './anthropicConfig';
import { getCTADebut, getCTAFin, PRICING } from './cta';
import { calculateScoresFromResponses } from "./analysisEngine";
import { generateSupplementsSectionText, generateEnhancedSupplementsHTML } from "./supplementEngine";
import { SECTIONS, SECTION_INSTRUCTIONS, PROMPT_SECTION, getSectionsForTier, getSectionInstructionsForTier } from './geminiPremiumEngine';
import { generateKnowledgeContext, searchForSection } from './knowledge';
import { normalizeSingleVoice, hasEnglishMarkers, stripEnglishLines } from './textNormalization';

function getFirstNameForReport(clientData: ClientData): string {
  const direct =
    (clientData as any)?.prenom ??
    (clientData as any)?.firstName ??
    (clientData as any)?.firstname ??
    (clientData as any)?.name;
  if (typeof direct === "string" && direct.trim()) return direct.trim().split(/\s+/)[0];

  const email = (clientData as any)?.email;
  if (typeof email === "string" && email.includes("@")) return email.split("@")[0].trim();

  return "Profil";
}

// Cache system
const CACHE_DIR = path.join(process.cwd(), '.cache-anthropic');

interface CacheData {
  auditId: string;
  clientData: ClientData;
  photoAnalysis?: PhotoAnalysis | null;
  tier: AuditTier;
  sections: { [key: string]: string };
  startedAt: string;
  lastUpdated: string;
}

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCachePath(auditId: string): string {
  return path.join(CACHE_DIR, `audit-anthropic-${auditId}.json`);
}

function saveToCache(auditId: string, data: CacheData): void {
  ensureCacheDir();
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(getCachePath(auditId), JSON.stringify(data, null, 2));
}

function loadFromCache(auditId: string): CacheData | null {
  const cachePath = getCachePath(auditId);
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

export function deleteAnthropicCache(auditId: string): void {
  const cachePath = getCachePath(auditId);
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }
}

function generateAuditId(): string {
  return `anthropic-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const MIN_KNOWLEDGE_CONTEXT_CHARS = 200;
const KNOWN_SOURCES = [
  "Huberman",
  "Peter Attia",
  "Attia",
  "Applied Metabolics",
  "Stronger By Science",
  "SBS",
  "Examine",
  "Renaissance Periodization",
  "MPMD",
  "Newsletter",
  "ACHZOD",
];

const SOURCE_NAME_REGEX = new RegExp(
  "\\b(huberman|peter attia|attia|applied metabolics|stronger by science|sbs|examine|renaissance periodization|mpmd|newsletter|achzod)\\b",
  "gi"
);

const FORBIDDEN_PATTERNS = [
  /\bclient\b/i,
  /\bnous\b/i,
  /\bnotre\b/i,
  /\bon\b/i,
];

function extractSourceMentions(context: string): string[] {
  const lower = context.toLowerCase();
  const matches = KNOWN_SOURCES.filter((source) => lower.includes(source.toLowerCase()));
  return Array.from(new Set(matches));
}

function sanitizePremiumText(text: string): string {
  let cleaned = text
    .replace(/^\s*(Sources?|References?|Références?)\s*:.*$/gmi, "")
    .replace(/Sources?\s*:.*$/gmi, "")
    .replace(/^.*\b(Sources?|References?|Références?)\b\s*[:\-–—].*$/gmi, "")
    .replace(/^\s*[-=]{3,}\s*$/gm, "")
    .replace(SOURCE_NAME_REGEX, "")
    .replace(/\bclients\b/gi, "profils")
    .replace(/\bclient\b/gi, "profil")
    .replace(/\*\*/g, "")
    .replace(/##/g, "")
    .replace(/__/g, "")
    .replace(/\*/g, "")
    .trim();
  if (hasEnglishMarkers(cleaned, 6)) {
    cleaned = stripEnglishLines(cleaned);
  }
  cleaned = normalizeSingleVoice(cleaned);
  return cleaned;
}

function hasForbiddenPhrases(text: string): boolean {
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(text));
}

// Initialize Anthropic client
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    if (!validateAnthropicConfig()) {
      throw new Error("Anthropic API key not configured");
    }
    anthropicClient = new Anthropic({
      apiKey: ANTHROPIC_CONFIG.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

const CLAUDE_MODEL = ANTHROPIC_CONFIG.ANTHROPIC_MODEL;
const CLAUDE_FALLBACK_MODEL = ANTHROPIC_CONFIG.ANTHROPIC_FALLBACK_MODEL;
const CLAUDE_TEMPERATURE = ANTHROPIC_CONFIG.ANTHROPIC_TEMPERATURE;
const CLAUDE_MAX_TOKENS = ANTHROPIC_CONFIG.ANTHROPIC_MAX_TOKENS;
const CLAUDE_MAX_RETRIES = ANTHROPIC_CONFIG.ANTHROPIC_MAX_RETRIES;
const CLAUDE_SECTION_CONCURRENCY = ANTHROPIC_CONFIG.ANTHROPIC_SECTION_CONCURRENCY;

function getMaxTokensForSection(section: SectionName, tier: AuditTier = 'PREMIUM'): number {
  const s = String(section).toLowerCase();

  // Version GRATUIT : moins de sections donc plus de tokens chacune
  if (tier === 'GRATUIT') {
    if (s.includes("executive summary")) return SECTION_TOKEN_LIMITS.GRATUIT_EXECUTIVE;
    if (s.includes("synthese") || s.includes("prochaines etapes")) return SECTION_TOKEN_LIMITS.GRATUIT_SYNTHESIS;
    return SECTION_TOKEN_LIMITS.GRATUIT_ANALYSIS; // Analyses longues pour compenser
  }

  // Version PREMIUM : 18 sections, objectif 40-50 pages
  if (s.includes("executive summary")) return SECTION_TOKEN_LIMITS.EXECUTIVE_SUMMARY;
  if (s.includes("synthese") || s.includes("prochaines etapes")) return SECTION_TOKEN_LIMITS.SYNTHESIS;
  if (s.includes("supplements") || s.includes("stack")) return SECTION_TOKEN_LIMITS.SUPPLEMENTS;
  if (s.includes("kpi") || s.includes("tableau")) return SECTION_TOKEN_LIMITS.KPI;
  if (s.includes("plan") && (s.includes("30") || s.includes("60") || s.includes("90"))) return SECTION_TOKEN_LIMITS.PLAN;
  if (s.includes("protocole")) return SECTION_TOKEN_LIMITS.PROTOCOL;
  if (s.includes("analyse")) return SECTION_TOKEN_LIMITS.ANALYSIS;

  return SECTION_TOKEN_LIMITS.DEFAULT;
}

function getMinCharsForSection(section: SectionName, tier: AuditTier = 'PREMIUM'): number {
  const s = String(section).toLowerCase();
  if (tier === 'GRATUIT') {
    if (s.includes("executive summary")) return 3400;
    if (s.includes("synthese") || s.includes("prochaines etapes")) return 3400;
    return 3800;
  }
  if (s.includes("executive summary")) return 3600;
  if (s.includes("kpi") || s.includes("tableau")) return 3200;
  if (s.includes("stack") || s.includes("supplements")) return 3000;
  if (s.includes("synthese") || s.includes("prochaines etapes")) return 3600;
  if (s.includes("plan") && (s.includes("30") || s.includes("60") || s.includes("90"))) return 4500;
  if (s.includes("protocole")) return 6000;
  if (s.includes("analyse")) return 5200;
  return 4200;
}

function degradedSectionText(section: SectionName): string {
  return [
    `${String(section).toUpperCase()}`,
    ``,
    `NOTE (TECHNIQUE)`,
    `Je n'ai pas pu finaliser cette section a cause d'un incident temporaire.`,
    `Je la regenere des que le service est stable (sans impacter le reste de ton rapport).`,
  ].join("\n");
}

async function callClaudeWithModel(
  prompt: string,
  model: string,
  opts?: { maxTokens?: number; label?: string }
): Promise<string> {
  const label = opts?.label ? ` (${opts.label})` : "";
  const maxTokens = opts?.maxTokens ?? CLAUDE_MAX_TOKENS;
  const client = getAnthropicClient();

  try {
    const response = await client.messages.create({
      model: model,
      max_tokens: maxTokens,
      temperature: CLAUDE_TEMPERATURE,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c: { type: string }) => c.type === 'text');
    const text = textContent?.type === 'text' ? (textContent as { type: 'text'; text: string }).text : "";

    if (!text.trim()) {
      throw new Error("Claude returned an empty response");
    }

    return text;
  } catch (error: any) {
    console.log(`[Claude] Erreur avec ${model}${label}: ${error?.message || error}`);
    throw error;
  }
}

async function callClaude(
  prompt: string,
  opts?: { maxTokens?: number; label?: string }
): Promise<string> {
  const label = opts?.label ? ` (${opts.label})` : "";
  const maxTokens = opts?.maxTokens ?? CLAUDE_MAX_TOKENS;

  // Try with primary model first
  for (let attempt = 1; attempt <= CLAUDE_MAX_RETRIES; attempt++) {
    try {
      const text = await callClaudeWithModel(prompt, CLAUDE_MODEL, {
        maxTokens,
        label: opts?.label,
      });
      if (text.trim()) {
        console.log(`[Claude] Section${label} OK avec ${CLAUDE_MODEL}`);
        return text;
      }
      throw new Error("Claude returned an empty response");
    } catch (error: any) {
      const status = error?.status;
      const msg = String(error?.message || error || "");

      console.log(`[Claude] Erreur${label} tentative ${attempt}/${CLAUDE_MAX_RETRIES}: ${msg}`);

      // Rate limit - wait and retry
      if (status === 429) {
        const retryAfter = error?.headers?.['retry-after'];
        const waitMs = retryAfter ? Number(retryAfter) * 1000 : 5000;
        console.log(`[Claude] Rate limit${label}, attente ${waitMs}ms...`);
        await sleep(waitMs + Math.random() * 500);
        continue;
      }

      // Overloaded - wait longer
      if (status === 529 || msg.includes('overloaded')) {
        console.log(`[Claude] Serveur surchargé${label}, attente 10s...`);
        await sleep(10000 + Math.random() * 2000);
        continue;
      }

      // Other retryable errors
      if (attempt < CLAUDE_MAX_RETRIES) {
        await sleep(2000 + Math.random() * 1000);
      }
    }
  }

  // Fallback to Sonnet
  console.log(`[Claude] Passage au fallback ${CLAUDE_FALLBACK_MODEL}${label}`);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await callClaudeWithModel(prompt, CLAUDE_FALLBACK_MODEL, {
        maxTokens,
        label: opts?.label,
      });
      if (text.trim()) {
        console.log(`[Claude] Section${label} OK avec fallback ${CLAUDE_FALLBACK_MODEL}`);
        return text;
      }
    } catch (error: any) {
      console.log(`[Claude] Fallback${label} tentative ${attempt}/2 erreur: ${error?.message || error}`);
      if (attempt < 2) {
        await sleep(3000 + Math.random() * 1000);
      }
    }
  }

  console.log(`[Claude] Echec total${label} - tous les modeles ont echoue`);
  return "";
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function generateAuditTxtWithClaude(
  clientData: ClientData,
  photoAnalysis?: PhotoAnalysis | null,
  tier: AuditTier = 'PREMIUM',
  resumeAuditId?: string
): Promise<string | null> {
  const startTime = Date.now();

  const firstName = getFirstNameForReport(clientData);
  const lastName = clientData['nom'] || '';
  const fullName = `${firstName} ${lastName}`.trim();

  const auditId = resumeAuditId || generateAuditId();
  let cachedSections: { [key: string]: string } = {};
  let sectionsFromCache = 0;

  if (resumeAuditId) {
    const cached = loadFromCache(resumeAuditId);
    if (cached) {
      cachedSections = cached.sections || {};
      sectionsFromCache = Object.keys(cachedSections).length;
      console.log(
        `[Cache Claude] Reprise audit ${resumeAuditId} - ${sectionsFromCache} sections deja generees`
      );
    }
  }

  console.log(`[Cache Claude] ID Audit: ${auditId}`);

  // Sanitize client data (remove photos)
  const sanitizeClientDataForPrompt = (data: ClientData): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    const MAX_VALUE_CHARS = 2000;

    for (const [k, v] of Object.entries(data || {})) {
      if (v == null) continue;

      const key = String(k).toLowerCase();
      if (
        key.includes("photo") ||
        key.includes("image") ||
        key === "photos"
      ) {
        continue;
      }

      if (typeof v === "string") {
        const s = v.trim();
        if (!s || s.startsWith("data:image/")) continue;
        out[k] = s.length > MAX_VALUE_CHARS ? s.slice(0, MAX_VALUE_CHARS) + "..." : s;
        continue;
      }

      try {
        const str = Array.isArray(v) || typeof v === "object" ? JSON.stringify(v) : String(v);
        if (str && str.length <= MAX_VALUE_CHARS) {
          out[k] = Array.isArray(v) || typeof v === "object" ? v : str;
        }
      } catch {
        // ignore
      }
    }
    return out;
  };

  const safeClientData = sanitizeClientDataForPrompt(clientData);
  const dataStr = Object.entries(safeClientData)
    .filter(([_, v]) => v !== undefined && v !== null && String(v).trim().length > 0)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n");

  const photoAnalysisStr = photoAnalysis
    ? formatPhotoAnalysisForReport(photoAnalysis)
    : 'Analyse photo indisponible.';

  const fullDataStr = `
DONNEES PROFIL:
${dataStr}

ANALYSE PHOTO POSTURALE:
${photoAnalysisStr}
`;

  const auditParts: string[] = [];
  const ctaAmount = tier === "ELITE" ? PRICING.ELITE : PRICING.PREMIUM;
  const ctaDebut = getCTADebut(tier, ctaAmount);
  auditParts.push(ctaDebut);
  auditParts.push(`\n AUDIT COMPLET APEXLABS - ${fullName.toUpperCase()} \n`);
  auditParts.push(`Genere le ${new Date().toLocaleString('fr-FR')}\n`);

  let newSectionsGenerated = 0;
  const sectionsToGenerate = getSectionsForTier(tier);

  const results = await mapWithConcurrency(
    sectionsToGenerate,
    CLAUDE_SECTION_CONCURRENCY,
    async (section) => {
      if (cachedSections[section]) {
        console.log(`[Claude] Section "${section}" chargee du cache.`);
        return { section, text: cachedSections[section], fromCache: true };
      }

      // Stack supplements: generated from library (not via AI)
      if (section === "Stack Supplements Optimise" && tier !== "GRATUIT") {
        const scores = calculateScoresFromResponses(clientData as any);
        const generated = generateSupplementsSectionText({
          responses: clientData as any,
          globalScore: typeof scores?.global === "number" ? scores.global : undefined,
        });

        cachedSections[section] = generated;
        saveToCache(auditId, {
          auditId,
          clientData,
          photoAnalysis,
          tier,
          sections: cachedSections,
          startedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        });
        newSectionsGenerated++;

        return { section, text: generated, fromCache: false };
      }

      console.log(`[Claude] Generation de la section "${section}" (tier: ${tier})...`);
      // Utilise les instructions spécifiques au tier (GRATUIT a ses propres prompts)
      const specificInstructions = getSectionInstructionsForTier(section as SectionName, tier);
      const maxTokensForThisSection = getMaxTokensForSection(section as SectionName, tier);

      // Mapping sections → types pour la recherche knowledge base
      const sectionTypeMapping: Record<string, string> = {
        "Executive Summary": "executive-summary",
        "Sommeil & Recuperation": "sommeil-recuperation",
        "Analyse Hormonale": "hormones",
        "Metabolisme & Nutrition": "metabolisme-nutrition",
        "Protocole d'Entrainement": "entrainement",
        "Cardiovasculaire & Endurance": "cardiovasculaire",
        "Digestion & Microbiote": "digestion-microbiote",
        "Stack Supplements Optimise": "supplements",
        "Gestion du Stress & Mental": "stress-mental",
        "Optimisation Lifestyle": "lifestyle",
      };

      // Récupérer le contexte knowledge base pertinent pour cette section
      let knowledgeContext = "";
      const sectionType = sectionTypeMapping[section] || "";
      if (sectionType) {
        try {
          knowledgeContext = await generateKnowledgeContext(clientData as Record<string, any>, sectionType);
          if (knowledgeContext) {
            console.log(`[Claude] Knowledge context loaded for section "${section}" (${knowledgeContext.length} chars)`);
          }
        } catch (kbError) {
          console.log(`[Claude] Knowledge context unavailable for "${section}": ${kbError}`);
        }
      }

      if (!knowledgeContext || knowledgeContext.length < MIN_KNOWLEDGE_CONTEXT_CHARS) {
        try {
          knowledgeContext = await generateKnowledgeContext(clientData as Record<string, any>);
          if (knowledgeContext) {
            console.log(`[Claude] Knowledge context fallback loaded for section "${section}" (${knowledgeContext.length} chars)`);
          }
        } catch (kbError) {
          console.log(`[Claude] Knowledge context fallback unavailable for "${section}": ${kbError}`);
        }
      }

      if (!knowledgeContext || knowledgeContext.length < MIN_KNOWLEDGE_CONTEXT_CHARS) {
        throw new Error(`KNOWLEDGE_CONTEXT_EMPTY:${section}`);
      }

      // Calcul de la longueur cible basé sur le tier
      const targetChars = tier === 'GRATUIT'
        ? '3500-5000 caracteres (environ 90-130 lignes)' // Discovery Scan: 5-7 pages total
        : '5000-7000 caracteres (environ 120-175 lignes)'; // 18 sections -> 40-50 pages

      // Claude-specific prompt with enhanced instructions + length requirements + knowledge context
      const claudePrompt = `Tu es un expert en sante integrative, biohacking et coaching performance.
Tu analyses les donnees de ${firstName} pour lui fournir un audit personnalise de haute qualite.

INSTRUCTIONS IMPORTANTES:
- Sois direct, concret et actionnable
- Utilise un ton expert mais accessible
- Personnalise chaque recommandation aux donnees du profil
- Evite les generalites - sois specifique
- Paragraphes uniquement (pas de listes, pas de puces)
- Si une consigne de section propose un format liste, transforme-la en narration fluide
- N'utilise pas de markdown (pas de ** ou ##)
- Integre la knowledge base sans citer de sources ni noms propres
- Ne dis jamais "client", "nous", "notre" ou "on"

LONGUEUR OBLIGATOIRE (CRITIQUE):
- Cette section doit contenir ${targetChars}
- Developpe en profondeur chaque point avec des explications detaillees
- Ne fais pas de liste courte - developpe chaque element en paragraphes complets
- Inclus des mecanismes biologiques, des exemples concrets, des protocoles detailles
- Si c'est une analyse: explique le POURQUOI, les MECANISMES, les CONSEQUENCES, les SOLUTIONS
- Si c'est un protocole: detaille chaque etape minute par minute avec variantes
- Interdiction de citer des sources, auteurs, etudes, ou noms propres

${knowledgeContext}
${PROMPT_SECTION.replace("{section}", section)
  .replace("{section_specific_instructions}", specificInstructions)
  .replace("{data}", fullDataStr)}`;

      const t0 = Date.now();
      const minChars = getMinCharsForSection(section as SectionName, tier);
      let cleanedText = "";
      const needsScoreLine = (value: string) => {
        const lower = String(section).toLowerCase();
        if (!lower.includes("analyse")) return false;
        return !/Score\s*:?\s*\d{1,3}\s*\/\s*100/i.test(value);
      };

      for (let attempt = 1; attempt <= 2; attempt++) {
        const retryNote =
          attempt === 1
            ? ""
            : `\nATTENTION: Ta reponse etait trop courte, sans ligne Score, ou contenait des mots interdits. Tu dois fournir un texte plus long (min ${minChars} caracteres), sans "client", "nous", "notre", "on" ni sources. Termine par "Score : NN/100".\n`;
        const prompt = `${claudePrompt}\n${retryNote}`;

        const sectionText = await callClaude(prompt, {
          maxTokens: maxTokensForThisSection,
          label: `${String(section)}#${attempt}`,
        });

        if (!sectionText) continue;

        const candidate = sanitizePremiumText(sectionText);
        const forbidden = hasForbiddenPhrases(sectionText) || hasForbiddenPhrases(candidate);
        const missingScore = needsScoreLine(candidate);

        if (!forbidden && !missingScore && candidate.length >= minChars) {
          cleanedText = candidate;
          break;
        }

        if (!cleanedText || candidate.length > cleanedText.length) {
          cleanedText = candidate;
        }
      }

      const dt = Date.now() - t0;
      console.log(`[Claude] Section "${section}" terminee en ${(dt / 1000).toFixed(1)}s`);

      if (!cleanedText || cleanedText.length < minChars || hasForbiddenPhrases(cleanedText) || needsScoreLine(cleanedText)) {
        const degraded = degradedSectionText(section as SectionName);
        cachedSections[section] = degraded;
        saveToCache(auditId, {
          auditId,
          clientData,
          photoAnalysis,
          tier,
          sections: cachedSections,
          startedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        });
        newSectionsGenerated++;
        return { section, text: degraded, fromCache: false };
      }

      cachedSections[section] = cleanedText;
      saveToCache(auditId, {
        auditId,
        clientData,
        photoAnalysis,
        tier,
        sections: cachedSections,
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      });
      newSectionsGenerated++;

      return { section, text: cleanedText, fromCache: false };
    }
  );

  const nonEmptySections = results.filter((r) => (r.text || '').trim().length > 0).length;
  if (nonEmptySections === 0) {
    console.error('[Claude] Aucune section n\'a ete generee. Audit annule.');
    return null;
  }

  // Assemble in original order
  sectionsToGenerate.forEach((section) => {
    const res = results.find((r) => r.section === section);
    if (res && res.text) {
      auditParts.push(`\n${section.toUpperCase()}\n`);
      auditParts.push(res.text);
    }
  });

  const hasGlobalScore = /SCORE\s+GLOBAL\s*:?\s*\d{1,3}\s*\/\s*100/i.test(auditParts.join("\n"));
  const calcScores = calculateScoresFromResponses(clientData as any);
  const globalScore = typeof calcScores?.global === "number" ? calcScores.global : 76;
  if (!hasGlobalScore) {
    auditParts.push(`\nSCORE GLOBAL : ${globalScore}/100\n`);
  }

  const ctaFin = getCTAFin(tier, ctaAmount);
  auditParts.push('\n\n' + ctaFin);

  const fullAuditTxt = auditParts.join('\n');

  const generationTime = Date.now() - startTime;
  console.log(
    `[Claude] Audit genere en ${(generationTime / 1000).toFixed(1)}s (${newSectionsGenerated} nouvelles sections, ${sectionsFromCache} du cache)`
  );

  return fullAuditTxt;
}

export async function generateAndConvertAuditWithClaude(
  clientData: ClientData,
  photoAnalysis?: PhotoAnalysis | null,
  tier: AuditTier = 'PREMIUM',
  resumeAuditId?: string
): Promise<AuditResult> {
  const startTime = Date.now();

  const firstName = getFirstNameForReport(clientData);
  const lastName = clientData['nom'] || '';
  const clientName = `${firstName} ${lastName}`.trim();

  console.log(`\n[Claude] Nouvelle demande d'audit pour ${firstName}`);
  console.log(`[Claude] Generation audit PREMIUM avec Claude Opus 4.5 pour ${clientName}...`);

  const txtContent = await generateAuditTxtWithClaude(clientData, photoAnalysis, tier, resumeAuditId);
  if (!txtContent) {
    console.log(`[Claude] Echec generation TXT pour ${clientName}`);
    return {
      success: false,
      error: 'Echec generation avec Claude',
    };
  }

  // Validation: minimum 10000 chars for PREMIUM (at least 5-6 pages)
  const minLength = tier === 'GRATUIT' ? 16000 : 10000;
  if (txtContent.length < minLength) {
    console.error(`[Claude] TXT trop court pour ${clientName}: ${txtContent.length} chars (min: ${minLength})`);
    console.error(`[Claude] Première section générée: ${txtContent.substring(0, 500)}...`);
    return {
      success: false,
      error: `Rapport trop court (${txtContent.length} chars). Problème API Claude ou génération incomplète.`,
    };
  }

  console.log(`[Claude] Audit TXT genere (${txtContent.length} caracteres)`);

  const generationTime = Date.now() - startTime;

  return {
    success: true,
    txt: txtContent,
    clientName: clientName,
    metadata: {
      generationTimeMs: generationTime,
      sectionsGenerated: getSectionsForTier(tier).length,
      modelUsed: ANTHROPIC_CONFIG.ANTHROPIC_MODEL,
    },
  };
}

// Check if Anthropic is available
export function isAnthropicAvailable(): boolean {
  return validateAnthropicConfig();
}
