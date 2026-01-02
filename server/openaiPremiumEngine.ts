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
// Réutiliser les sections et instructions de Gemini (exportées)
import { SECTIONS, SECTION_INSTRUCTIONS, PROMPT_SECTION } from './geminiPremiumEngine';

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
const OPENAI_MAX_TOKENS = OPENAI_CONFIG.OPENAI_MAX_TOKENS;
const OPENAI_MAX_RETRIES = OPENAI_CONFIG.OPENAI_MAX_RETRIES;
const OPENAI_SLEEP_BETWEEN = OPENAI_CONFIG.OPENAI_SLEEP_BETWEEN;
const OPENAI_SECTION_CONCURRENCY =
  (OPENAI_CONFIG as any).OPENAI_SECTION_CONCURRENCY ?? 3;

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

async function callOpenAI(
  prompt: string,
  opts?: { maxCompletionTokens?: number }
): Promise<string> {
  let fallbackDelayMs = Math.max(250, OPENAI_SLEEP_BETWEEN * 1000);

  for (let attempt = 1; attempt <= OPENAI_MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: OPENAI_TEMPERATURE,
        // GPT-5.2 utilise max_completion_tokens au lieu de max_tokens
        max_completion_tokens: opts?.maxCompletionTokens ?? OPENAI_MAX_TOKENS,
      });

      const text = response.choices[0]?.message?.content || "";
      if (!text.trim()) {
        // Certaines réponses peuvent arriver vides (transient). On traite ça comme retryable.
        throw new Error("OpenAI returned an empty response");
      }
      return text;
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      const headers = error?.headers ?? error?.response?.headers;

      // 429: sleep "exact reset" si possible (tokens ou requests) + jitter
      if (status === 429) {
        const resetTokens = getHeader(headers, "x-ratelimit-reset-tokens");
        const resetReqs = getHeader(headers, "x-ratelimit-reset-requests");
        const resetMs = parseResetToMs(resetTokens || resetReqs || undefined);
        const jitter = Math.floor(Math.random() * 250);

        console.log(
          `[OpenAI] 429 Rate limit (tentative ${attempt}/${OPENAI_MAX_RETRIES}) resetTokens=${resetTokens} resetReqs=${resetReqs}`
        );

        if (attempt < OPENAI_MAX_RETRIES) {
          if (resetMs != null) {
            await sleep(resetMs + jitter);
          } else {
            await sleep(fallbackDelayMs + jitter);
            fallbackDelayMs = Math.min(fallbackDelayMs * 2, 60_000);
          }
          continue;
        }
      }

      console.log(
        `[OpenAI] Erreur tentative ${attempt}/${OPENAI_MAX_RETRIES}: ${error?.message || error}`
      );

      if (attempt < OPENAI_MAX_RETRIES) {
        const jitter = Math.floor(Math.random() * 250);
        // Si la réponse est vide, on ne backoff pas trop (sinon ça rallonge artificiellement la génération)
        const msg = String(error?.message || "");
        const isEmpty = msg.includes("empty response");
        const delay = isEmpty ? Math.min(1000, fallbackDelayMs) : fallbackDelayMs;
        await sleep(delay + jitter);
        fallbackDelayMs = Math.min(fallbackDelayMs * 2, 60_000);
      }
    }
  }

  console.log("[OpenAI] Echec apres toutes les tentatives");
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

  const firstName = clientData['prenom'] || clientData['age'] || 'Client';
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
        if (s.startsWith("data:image/") || s.length > MAX_VALUE_CHARS) continue;
        out[k] = s;
        continue;
      }

      // Arrays/objects: stringify mais cap
      try {
        const str = Array.isArray(v) || typeof v === "object" ? JSON.stringify(v) : String(v);
        if (!str || str.length > MAX_VALUE_CHARS) continue;
        out[k] = Array.isArray(v) || typeof v === "object" ? v : str;
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
    : 'Aucune analyse photo disponible.';

  const fullDataStr = `
DONNEES CLIENT:
${dataStr}

ANALYSE PHOTO POSTURALE:
${photoAnalysisStr}
`;

  let fullAuditTxt = '';
  let newSectionsGenerated = 0;

  const results = await mapWithConcurrency(
    SECTIONS,
    Number(OPENAI_SECTION_CONCURRENCY) || 3,
    async (section) => {
      if (cachedSections[section]) {
        console.log(`[OpenAI] Section "${section}" chargee du cache.`);
        return { section, text: cachedSections[section], fromCache: true };
      }

      console.log(`[OpenAI] Generation de la section "${section}"...`);
      const specificInstructions = SECTION_INSTRUCTIONS[section] || "";

      const prompt = PROMPT_SECTION.replace("{section}", section)
        .replace("{section_specific_instructions}", specificInstructions)
        .replace("{data}", fullDataStr);

      // Cap par section (évite de “réserver” 8000 tokens * N sections en parallèle)
      const sectionText = await callOpenAI(prompt, {
        maxCompletionTokens: OPENAI_MAX_TOKENS,
      });

      if (!sectionText) {
        return { section, text: "", fromCache: false };
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
  SECTIONS.forEach((section) => {
    const res = results.find((r) => r.section === section);
    if (res && res.text) {
      fullAuditTxt += `\n\n${section}\n\n${res.text}`;
    }
  });

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

  const firstName = clientData['prenom'] || clientData['age'] || 'Client';
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
      sectionsGenerated: SECTIONS.length,
      modelUsed: OPENAI_CONFIG.OPENAI_MODEL,
    },
  };
}
