/**
 * NEUROCORE 360 - Module de génération d'audits avec OpenAI GPT-5.2-2025-12-11
 * Adapté de geminiPremiumEngine.ts - Réutilise les mêmes sections et prompts
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { ClientData, PhotoAnalysis, AuditResult, SectionName, AuditTier } from './types';
import { formatPhotoAnalysisForReport } from './photoAnalysisAI';
import { OPENAI_CONFIG } from './openaiConfig';
import { getCTADebut, getCTAFin, PRICING } from './cta';
import { calculateScoresFromResponses } from "./analysisEngine";
import { generateSupplementsSectionText } from "./supplementEngine";
// Réutiliser les sections et instructions de Gemini (exportées)
import { SECTIONS, SECTION_INSTRUCTIONS, PROMPT_SECTION, getSectionsForTier } from './geminiPremiumEngine';

function getFirstNameForReport(clientData: ClientData): string {
  const direct =
    (clientData as any)?.prenom ??
    (clientData as any)?.firstName ??
    (clientData as any)?.firstname ??
    (clientData as any)?.name;
  if (typeof direct === "string" && direct.trim()) return direct.trim().split(/\s+/)[0];

  const email = (clientData as any)?.email;
  if (typeof email === "string" && email.includes("@")) return email.split("@")[0].trim();

  return "Client";
}

// Cache system (identique à Gemini)
const CACHE_DIR = path.join(process.cwd(), '.cache-openai');

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
  return path.join(CACHE_DIR, `audit-openai-${auditId}.json`);
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

function generateAuditId(): string {
  return `openai-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// OpenAI Initialization
const openai = new OpenAI({
  apiKey: OPENAI_CONFIG.OPENAI_API_KEY,
});

const OPENAI_MODEL = OPENAI_CONFIG.OPENAI_MODEL;
const OPENAI_TEMPERATURE = OPENAI_CONFIG.OPENAI_TEMPERATURE;
// ⚠️ Important: caps serrés pour limiter TPM et éviter les réponses vides.
const OPENAI_MAX_COMPLETION_TOKENS_PER_SECTION =
  Number((OPENAI_CONFIG as any).OPENAI_MAX_TOKENS_PER_SECTION) ||
  Number(OPENAI_CONFIG.OPENAI_MAX_TOKENS) ||
  1000;
const OPENAI_MAX_RETRIES = OPENAI_CONFIG.OPENAI_MAX_RETRIES;
const OPENAI_SLEEP_BETWEEN = OPENAI_CONFIG.OPENAI_SLEEP_BETWEEN;
const OPENAI_SECTION_CONCURRENCY =
  (OPENAI_CONFIG as any).OPENAI_SECTION_CONCURRENCY ?? (OPENAI_CONFIG as any).OPENAI_CONCURRENCY_LIMIT ?? 2;

// Suivi des bursts de réponses vides pour baisser la concurrence quelques minutes.
let reduceConcurrencyUntil = 0;
const emptyTimestamps: number[] = [];

function noteEmptyResponse() {
  const now = Date.now();
  emptyTimestamps.push(now);
  // garder seulement les 10 dernières
  while (emptyTimestamps.length > 10) emptyTimestamps.shift();
  // si >=2 empties sur les 5 dernières, on passe en mode "concurrency 2" pendant 3 minutes
  if (emptyTimestamps.length >= 2) {
    const recent = emptyTimestamps.slice(-5);
    if (recent.length >= 2 && recent[recent.length - 1] - recent[0] < 90_000) {
      reduceConcurrencyUntil = Math.max(reduceConcurrencyUntil, now + 180_000); // 3 minutes
      console.log("[OpenAI] Burst de réponses vides: réduction concurrence à 2 pendant 3 minutes");
    }
  }
}

function getCapForSection(section: SectionName): number {
  const s = section.toLowerCase();
  const shortCap = Number(process.env.OPENAI_MAX_COMPLETION_TOKENS_SHORT ?? "750");
  const defaultCap = Number(process.env.OPENAI_MAX_COMPLETION_TOKENS_DEFAULT ?? "1000");
  const longCap = Number(process.env.OPENAI_MAX_COMPLETION_TOKENS_LONG ?? "1000");
  if (s.includes("executive summary") || s.includes("synthese")) return shortCap;
  if (s.includes("plan") || s.includes("kpi")) return longCap;
  return defaultCap;
}

function parseResetToMs(v?: string): number | null {
  if (!v) return null;
  // Formats observés: "1s", "6m0s"
  const m = v.match(/(?:(\d+)m)?(?:(\d+)s)?/);
  if (!m) return null;
  const mins = m[1] ? Number(m[1]) : 0;
  const secs = m[2] ? Number(m[2]) : 0;
  const total = (mins * 60 + secs) * 1000;
  return Number.isFinite(total) && total > 0 ? total : null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getHeader(headers: any, name: string): string | undefined {
  if (!headers) return undefined;
  const key = name.toLowerCase();
  // Headers() (fetch style)
  if (typeof headers.get === "function") {
    return headers.get(name) ?? headers.get(key) ?? undefined;
  }
  // plain object
  const direct = headers[name] ?? headers[key];
  return typeof direct === "string" ? direct : undefined;
}

function parseRetryAfterToMs(v?: string): number | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  // Retry-After peut être en secondes ("5") ou une date HTTP.
  const asSeconds = Number(s);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.min(10 * 60 * 1000, Math.floor(asSeconds * 1000));
  }
  const asDate = Date.parse(s);
  if (!Number.isNaN(asDate)) {
    const delta = asDate - Date.now();
    if (delta > 0) return Math.min(10 * 60 * 1000, delta);
  }
  return null;
}

function isRetryableStatus(status: unknown): boolean {
  const s = typeof status === "number" ? status : Number(status);
  if (!Number.isFinite(s)) return false;
  // 408/409/429/5xx : transient
  return s === 408 || s === 409 || s === 429 || s >= 500;
}

function getMaxCompletionTokensForSection(section: SectionName, tier: AuditTier): number {
  // Objectif: réduire le TPM "réservé" (OpenAI estime les quotas sur max_completion_tokens).
  // Valeurs volontairement serrées; ajustables via env.
  const defaultCap = Number(process.env.OPENAI_MAX_COMPLETION_TOKENS_DEFAULT ?? "1100");
  const longCap = Number(process.env.OPENAI_MAX_COMPLETION_TOKENS_LONG ?? "1400");
  const shortCap = Number(process.env.OPENAI_MAX_COMPLETION_TOKENS_SHORT ?? "850");

  if (tier === "GRATUIT") {
    return Number(process.env.OPENAI_MAX_COMPLETION_TOKENS_GRATUIT ?? "900");
  }

  const s = String(section).toLowerCase();
  if (s.includes("executive summary")) return shortCap;
  if (s.startsWith("protocole")) return defaultCap;
  if (s.startsWith("plan ")) return longCap;
  if (s.includes("kpi")) return defaultCap;
  if (s.includes("synthese")) return shortCap;
  return defaultCap;
}

function degradedSectionText(section: SectionName): string {
  return [
    `${String(section).toUpperCase()}`,
    ``,
    `NOTE (TECHNIQUE)`,
    `Je n’ai pas pu finaliser cette section à cause d’un incident temporaire.`,
    `Je la régénère dès que le service est stable (sans impacter le reste de ton rapport).`,
  ].join("\n");
}

// Fallback model (GPT-4o) si le modèle principal a des problèmes
const FALLBACK_MODEL = (OPENAI_CONFIG as any).OPENAI_FALLBACK_MODEL || process.env.OPENAI_FALLBACK_MODEL || "gpt-4o";

async function callOpenAIWithModel(
  prompt: string,
  model: string,
  opts?: { maxCompletionTokens?: number; label?: string; useFallbackParams?: boolean }
): Promise<string> {
  const label = opts?.label ? ` (${opts.label})` : "";
  const maxTokens = opts?.maxCompletionTokens ?? 1500;

  // Pour le fallback model (gpt-4.1), on utilise max_tokens au lieu de max_completion_tokens
  const isFallbackModel = model !== OPENAI_MODEL;

  try {
    const requestParams: any = {
      model: model,
      messages: [{ role: "user", content: prompt }],
      temperature: isFallbackModel ? 0.7 : OPENAI_TEMPERATURE,
    };

    // GPT-5.2 utilise max_completion_tokens, GPT-4.1/4o utilisent max_tokens
    if (isFallbackModel) {
      requestParams.max_tokens = maxTokens;
    } else {
      requestParams.max_completion_tokens = maxTokens;
    }

    const response = await openai.chat.completions.create(requestParams);
    const text = response.choices[0]?.message?.content || "";

    if (!text.trim()) {
      throw new Error("OpenAI returned an empty response");
    }

    return text;
  } catch (error: any) {
    console.log(`[OpenAI] Erreur avec ${model}${label}: ${error?.message || error}`);
    throw error;
  }
}

async function callOpenAI(
  prompt: string,
  opts?: { maxCompletionTokens?: number; label?: string }
): Promise<string> {
  let fallbackDelayMs = Math.max(250, OPENAI_SLEEP_BETWEEN * 1000);
  let emptyStreak = 0;
  const maxEmptyRetries = Number(process.env.OPENAI_MAX_EMPTY_RETRIES ?? "2");
  const label = opts?.label ? ` (${opts.label})` : "";

  // Adaptatif: quand on voit des 429 / réponses vides, baisser progressivement le plafond
  let adaptiveMaxTokens = Math.max(
    400,
    Number(opts?.maxCompletionTokens ?? OPENAI_MAX_COMPLETION_TOKENS_PER_SECTION)
  );

  // D'abord essayer avec le modèle principal (GPT-5.2)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const text = await callOpenAIWithModel(prompt, OPENAI_MODEL, {
        maxCompletionTokens: adaptiveMaxTokens,
        label: opts?.label,
      });
      if (text.trim()) {
        console.log(`[OpenAI] Section${label} OK avec ${OPENAI_MODEL}`);
        return text;
      }
      throw new Error("OpenAI returned an empty response");
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      const headers = error?.headers ?? error?.response?.headers;
      const msg = String(error?.message || error || "");

      if (msg.toLowerCase().includes("empty response")) {
        emptyStreak++;
        noteEmptyResponse();
        console.log(
          `[OpenAI] Empty response${label} (streak ${emptyStreak}) tentative ${attempt}/3 avec ${OPENAI_MODEL}`
        );
        adaptiveMaxTokens = Math.max(400, Math.floor(adaptiveMaxTokens * 0.85));

        // Après 2 empty responses, on passe au fallback
        if (emptyStreak >= maxEmptyRetries) {
          console.log(`[OpenAI] ${OPENAI_MODEL} instable${label}, passage au fallback ${FALLBACK_MODEL}`);
          break;
        }
      }

      // 429: attendre et réessayer
      if (status === 429) {
        const retryAfter = getHeader(headers, "retry-after");
        const retryAfterMs = parseRetryAfterToMs(retryAfter);
        const resetTokens = getHeader(headers, "x-ratelimit-reset-tokens");
        const resetReqs = getHeader(headers, "x-ratelimit-reset-requests");
        const resetMs = parseResetToMs(resetTokens || resetReqs || undefined);
        const jitter = Math.floor(Math.random() * 250);

        console.log(
          `[OpenAI] 429 Rate limit${label} tentative ${attempt}/3`
        );
        adaptiveMaxTokens = Math.max(400, Math.floor(adaptiveMaxTokens * 0.8));

        if (retryAfterMs != null) {
          await sleep(retryAfterMs + jitter);
        } else if (resetMs != null) {
          await sleep(resetMs + jitter);
        } else {
          await sleep(fallbackDelayMs + jitter);
          fallbackDelayMs = Math.min(fallbackDelayMs * 2, 30_000);
        }
        continue;
      }

      // 5xx: attendre et réessayer
      if (isRetryableStatus(status)) {
        const jitter = Math.floor(Math.random() * 250);
        console.log(`[OpenAI] Transient ${status}${label} tentative ${attempt}/3`);
        await sleep(fallbackDelayMs + jitter);
        fallbackDelayMs = Math.min(fallbackDelayMs * 2, 30_000);
        continue;
      }

      // Autre erreur: court délai et retry
      if (attempt < 3) {
        const jitter = Math.floor(Math.random() * 250);
        await sleep(1500 + jitter);
      }
    }
  }

  // FALLBACK: essayer avec GPT-4.1 (plus stable)
  console.log(`[OpenAI] Tentative avec fallback ${FALLBACK_MODEL}${label}`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const text = await callOpenAIWithModel(prompt, FALLBACK_MODEL, {
        maxCompletionTokens: 1800, // GPT-4.1 plus stable, on peut augmenter
        label: opts?.label,
        useFallbackParams: true,
      });
      if (text.trim()) {
        console.log(`[OpenAI] Section${label} OK avec fallback ${FALLBACK_MODEL}`);
        return text;
      }
      throw new Error("Fallback returned an empty response");
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      const headers = error?.headers ?? error?.response?.headers;

      console.log(`[OpenAI] Fallback${label} tentative ${attempt}/3 erreur: ${error?.message || error}`);

      if (status === 429) {
        const retryAfter = getHeader(headers, "retry-after");
        const retryAfterMs = parseRetryAfterToMs(retryAfter);
        const jitter = Math.floor(Math.random() * 250);
        await sleep(retryAfterMs ?? 5000 + jitter);
        continue;
      }

      if (attempt < 3) {
        const jitter = Math.floor(Math.random() * 250);
        await sleep(2000 + jitter);
      }
    }
  }

  console.log(`[OpenAI] Echec total${label} - tous les modèles ont échoué`);
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

export async function generateAuditTxtWithOpenAI(
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
        `[Cache OpenAI] Reprise audit ${resumeAuditId} - ${sectionsFromCache} sections deja generees`
      );
    }
  }

  console.log(`[Cache OpenAI] ID Audit: ${auditId} (utilise cet ID pour reprendre si crash)`);

  // ⚠️ IMPORTANT: Ne jamais injecter les photos base64 (ou autres blobs) dans le prompt.
  // Les réponses du questionnaire peuvent contenir photoFront/photoSide/photoBack en data URL,
  // ce qui explose la limite de tokens d'entrée (272k).
  const truncateMiddle = (s: string, max: number): string => {
    if (s.length <= max) return s;
    const head = Math.max(200, Math.floor(max * 0.7));
    const tail = Math.max(80, max - head - 20);
    return `${s.slice(0, head)} ...[tronque]... ${s.slice(-tail)}`;
  };

  const sanitizeClientDataForPrompt = (data: ClientData): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    const MAX_VALUE_CHARS = Number(process.env.OPENAI_MAX_VALUE_CHARS ?? "2000");

    for (const [k, v] of Object.entries(data || {})) {
      if (v == null) continue;

      const key = String(k).toLowerCase();
      // Champs photo / blobs
      if (
        key.includes("photo") ||
        key.includes("image") ||
        key === "photos" ||
        key === "photoFront".toLowerCase() ||
        key === "photoSide".toLowerCase() ||
        key === "photoBack".toLowerCase()
      ) {
        continue;
      }

      // Si c'est une string data URL ou trop longue -> skip
      if (typeof v === "string") {
        const s = v.trim();
        if (!s) continue;
        // data URL => on skip (trop lourd)
        if (s.startsWith("data:image/")) continue;
        // Trop long => on TRONQUE (on ne drop pas, sinon on "zappe" des réponses)
        out[k] = s.length > MAX_VALUE_CHARS ? truncateMiddle(s, MAX_VALUE_CHARS) : s;
        continue;
      }

      // Arrays/objects: stringify mais cap
      try {
        const str = Array.isArray(v) || typeof v === "object" ? JSON.stringify(v) : String(v);
        if (!str) continue;
        if (str.length > MAX_VALUE_CHARS) {
          out[k] = truncateMiddle(str, MAX_VALUE_CHARS);
        } else {
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
    : 'Analyse photo indisponible (incident vision).';

  const fullDataStr = `
DONNEES CLIENT:
${dataStr}

ANALYSE PHOTO POSTURALE:
${photoAnalysisStr}
`;

  const auditParts: string[] = [];
  const ctaDebut = getCTADebut(tier, PRICING.PREMIUM);
  auditParts.push(ctaDebut);
  auditParts.push(`\n AUDIT COMPLET APEXLABS - ${fullName.toUpperCase()} \n`);
  auditParts.push(`Genere le ${new Date().toLocaleString('fr-FR')}\n`);

  let newSectionsGenerated = 0;
  const sectionsToGenerate = getSectionsForTier(tier);

  const concurrencyNow =
    Date.now() < reduceConcurrencyUntil ? Math.max(2, Number(OPENAI_SECTION_CONCURRENCY) || 2) : Number(OPENAI_SECTION_CONCURRENCY) || 3;

  const results = await mapWithConcurrency(
    sectionsToGenerate,
    concurrencyNow,
    async (section) => {
      if (cachedSections[section]) {
        console.log(`[OpenAI] Section "${section}" chargee du cache.`);
        return { section, text: cachedSections[section], fromCache: true };
      }

      // ✅ Stack supplements : générée depuis la bibliothèque (pas via OpenAI)
      if (section === "Stack Supplements Optimise" && tier !== "GRATUIT") {
        const scores = calculateScoresFromResponses(clientData as any);
        const generated = generateSupplementsSectionText({
          responses: clientData as any,
          globalScore: typeof scores?.global === "number" ? scores.global : undefined,
          firstName,
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

      console.log(`[OpenAI] Generation de la section "${section}"... (cap=${getCapForSection(section as SectionName)}, conc=${concurrencyNow})`);
      const specificInstructions = SECTION_INSTRUCTIONS[section] || "";

      const prompt = PROMPT_SECTION.replace("{section}", section)
        .replace("{section_specific_instructions}", specificInstructions)
        .replace("{data}", fullDataStr);

      // Cap par section (évite de “réserver” trop de TPM)
      const maxTokensForThisSection = getCapForSection(section as SectionName);

      const t0 = Date.now();
      let sectionText = await callOpenAI(prompt, {
        maxCompletionTokens: maxTokensForThisSection,
        label: String(section),
      });
      const dt = Date.now() - t0;
      console.log(
        `[OpenAI] Section "${section}" terminee en ${(dt / 1000).toFixed(1)}s (cap=${maxTokensForThisSection})`
      );

      // Split auto si section longue + réponse vide
      const isLong =
        section.toLowerCase().includes("kpi") ||
        section.toLowerCase().includes("plan") ||
        section.toLowerCase().includes("synthese");
      if (!sectionText.trim() && isLong) {
        console.log(`[OpenAI] Split auto de "${section}" en 2 sous-parties (cap 850).`);
        const subparts = ["(Partie A)", "(Partie B)"];
        const subTexts: string[] = [];
        for (const sub of subparts) {
          const subPrompt = `${prompt}\n\n[Split] ${sub} - reste concis, 3 constats + 3 actions + 1 bloc "à approfondir".`;
          const subText = await callOpenAI(subPrompt, { maxCompletionTokens: 850, label: `${section}-${sub}` });
          if (subText.trim()) subTexts.push(subText);
        }
        sectionText = subTexts.join("\n\n");
      }

      if (!sectionText) {
        // Mode dégradé: on garde un placeholder pour éviter de bloquer tout le job
        noteEmptyResponse();
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

      const cleanedText = sectionText
        .replace(/\*\*/g, "")
        .replace(/##/g, "")
        .replace(/__/g, "")
        .replace(/\*/g, "");

      // Sauvegarde immédiate dans le cache
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
    console.error('[OpenAI] Aucune section n\'a été générée (réponses vides). Audit annulé.');
    return null;
  }

  // Assemblage dans l'ordre original
  sectionsToGenerate.forEach((section) => {
    const res = results.find((r) => r.section === section);
    if (res && res.text) {
      auditParts.push(`\n${section.toUpperCase()}\n`);
      auditParts.push(res.text);
    }
  });

  const ctaFin = getCTAFin(tier, PRICING.PREMIUM);
  auditParts.push('\n\n' + ctaFin);

  const fullAuditTxt = auditParts.join('\n');

  const generationTime = Date.now() - startTime;
  console.log(
    `[OpenAI] Audit genere en ${(generationTime / 1000).toFixed(1)}s (${newSectionsGenerated} nouvelles sections, ${sectionsFromCache} du cache)`
  );

  return fullAuditTxt;
}

export async function generateAndConvertAuditWithOpenAI(
  clientData: ClientData,
  photoAnalysis?: PhotoAnalysis | null,
  tier: AuditTier = 'PREMIUM',
  resumeAuditId?: string
): Promise<AuditResult> {
  const startTime = Date.now();

  const firstName = getFirstNameForReport(clientData);
  const lastName = clientData['nom'] || '';
  const clientName = `${firstName} ${lastName}`.trim();

  console.log(`\n[OpenAI] Nouvelle demande d'audit pour ${firstName}`);
  console.log(`[OpenAI] Generation audit PREMIUM avec GPT-5.2-2025-12-11 pour ${clientName}...`);

  const txtContent = await generateAuditTxtWithOpenAI(clientData, photoAnalysis, tier, resumeAuditId);
  if (!txtContent) {
    console.log(`[OpenAI] Echec generation TXT pour ${clientName}`);
    return {
      success: false,
      error: 'Echec generation avec OpenAI',
    };
  }

  console.log(`[OpenAI] Audit TXT genere (${txtContent.length} caracteres)`);

  const generationTime = Date.now() - startTime;

  return {
    success: true,
    txt: txtContent,
    clientName: clientName,
    metadata: {
      generationTimeMs: generationTime,
      sectionsGenerated: getSectionsForTier(tier).length,
      modelUsed: OPENAI_CONFIG.OPENAI_MODEL,
    },
  };
}
