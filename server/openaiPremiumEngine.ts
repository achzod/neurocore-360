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

async function callOpenAI(prompt: string): Promise<string> {
  for (let attempt = 0; attempt < OPENAI_MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: OPENAI_TEMPERATURE,
        max_tokens: OPENAI_MAX_TOKENS,
      });

      const text = response.choices[0]?.message?.content || '';
      if (!text.trim()) {
        throw new Error('OpenAI returned an empty response');
      }
      return text;
    } catch (error: any) {
      console.log(
        `[OpenAI] Erreur tentative ${attempt + 1}/${OPENAI_MAX_RETRIES}: ${error.message || error}`
      );
      if (attempt < OPENAI_MAX_RETRIES - 1) {
        const waitTime = OPENAI_SLEEP_BETWEEN * (attempt + 1) * 1000;
        console.log(`[OpenAI] Attente ${waitTime / 1000}s avant nouvelle tentative...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  console.log('[OpenAI] Echec apres toutes les tentatives');
  return '';
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

  const dataStr = Object.entries(clientData)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

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

  const sectionPromises = SECTIONS.map(async (section) => {
    if (cachedSections[section]) {
      console.log(`[OpenAI] Section "${section}" chargee du cache.`);
      return { section, text: cachedSections[section], fromCache: true };
    }

    console.log(`[OpenAI] Generation de la section "${section}"...`);
    const specificInstructions = SECTION_INSTRUCTIONS[section] || '';

    const prompt = PROMPT_SECTION.replace('{section}', section)
      .replace('{section_specific_instructions}', specificInstructions)
      .replace('{data}', fullDataStr);

    const sectionText = await callOpenAI(prompt);

    if (!sectionText) {
      return { section, text: '', fromCache: false };
    }

    const cleanedText = sectionText.replace(/\*\*/g, '').replace(/##/g, '').replace(/__/g, '').replace(/\*/g, '');

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
  });

  const results = await Promise.all(sectionPromises);

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
