/**
 * APEXLABS - Génération des audits PREMIUM et ELITE avec GPT-5.6 Sol.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ClientData, PhotoAnalysis, AuditResult, SectionName, AuditTier } from './types';
import { formatPhotoAnalysisForReport } from './photoAnalysisAI';
import { OPENAI_REPORT_MODEL, openAIProfileMetadata, runOpenAIText } from './openaiResponses';
import { getCTADebut, getCTAFin, PRICING } from './cta';
import { calculateScoresFromResponses } from "./analysisEngine";
import { generateSupplementsSectionText } from "./supplementEngine";
// Réutiliser les sections et instructions de Gemini (exportées)
import { SECTIONS, SECTION_INSTRUCTIONS, PROMPT_SECTION, getSectionsForTier } from './geminiPremiumEngine';
import { normalizeSingleVoice, hasEnglishMarkers, stripEnglishLines, stripInlineHtml } from './textNormalization';

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

export function deleteOpenAICache(auditId: string): void {
  const cachePath = getCachePath(auditId);
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }
}

function generateAuditId(): string {
  return `openai-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

const SOURCE_NAME_REGEX = new RegExp(
  "\\b(huberman|peter attia|attia|applied metabolics|stronger by science|sbs|examine|renaissance periodization|mpmd|newsletter)\\b",
  "gi"
);

const OPENAI_SECTION_CONCURRENCY =
  Number(process.env.OPENAI_SECTION_CONCURRENCY || "2");

function getCapForSection(section: SectionName): number {
  const s = section.toLowerCase();
  const shortCap = Number(process.env.OPENAI_MAX_COMPLETION_TOKENS_SHORT ?? "750");
  const defaultCap = Number(process.env.OPENAI_MAX_COMPLETION_TOKENS_DEFAULT ?? "1000");
  const longCap = Number(process.env.OPENAI_MAX_COMPLETION_TOKENS_LONG ?? "1000");
  if (s.includes("executive summary") || s.includes("synthese")) return shortCap;
  if (s.includes("plan") || s.includes("kpi")) return longCap;
  return defaultCap;
}

async function callOpenAI(
  prompt: string,
  opts?: { maxCompletionTokens?: number; label?: string; safetyId?: string }
): Promise<string> {
  const result = await runOpenAIText({
    profile: "premium",
    instructions:
      "Tu écris un rapport APEXLABS en français, en tutoyant, avec une voix humaine, précise et directe. Tu suis toutes les consignes fournies, tu n'inventes aucune donnée, tu ne mentionnes jamais l'IA et tu n'utilises aucun tiret long Unicode.",
    input: prompt,
    safetyId: opts?.safetyId || "premium-report",
    label: opts?.label,
    // Le budget inclut le raisonnement. On refuse les anciens caps trop courts.
    maxOutputTokens: Math.max(18_000, Number(opts?.maxCompletionTokens || 0)),
  });
  return result.text;
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

  const includePhotoSection = tier === "ELITE";
  const photoAnalysisStr = includePhotoSection
    ? photoAnalysis
      ? formatPhotoAnalysisForReport(photoAnalysis)
      : 'Analyse photo indisponible (incident vision).'
    : '';

  const fullDataStr = includePhotoSection
    ? `
DONNEES PROFIL:
${dataStr}

ANALYSE PHOTO POSTURALE:
${photoAnalysisStr}
`
    : `
DONNEES PROFIL:
${dataStr}
`;

  const auditParts: string[] = [];
  const ctaDebut = getCTADebut(tier, PRICING.PREMIUM);
  auditParts.push(ctaDebut);
  auditParts.push(`\n AUDIT COMPLET APEXLABS - ${fullName.toUpperCase()} \n`);
  auditParts.push(`Genere le ${new Date().toLocaleString('fr-FR')}\n`);

  let newSectionsGenerated = 0;
  const sectionsToGenerate = getSectionsForTier(tier);

  const concurrencyNow = Math.max(1, Math.min(3, Number(OPENAI_SECTION_CONCURRENCY) || 2));

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
        safetyId: String((clientData as any)?.email || auditId),
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
          const subText = await callOpenAI(subPrompt, {
            maxCompletionTokens: 850,
            label: `${section}-${sub}`,
            safetyId: String((clientData as any)?.email || auditId),
          });
          if (subText.trim()) subTexts.push(subText);
        }
        sectionText = subTexts.join("\n\n");
      }

      if (!sectionText) {
        throw new Error(`OpenAI n'a produit aucun contenu pour la section ${section}`);
      }

      let cleanedText = stripInlineHtml(sectionText)
        .replace(/^\s*(Sources?|References?|Références?)\s*:.*$/gmi, "")
        .replace(/Sources?\s*:.*$/gmi, "")
        .replace(/^\s*(rappel coaching|infos importantes|coaching apexlabs|prochaines etapes|prochaine etape|tu as les cl(?:e|\u00e9)s).*$/gmi, "")
        .replace(SOURCE_NAME_REGEX, "")
        .replace(/\bclients\b/gi, "profils")
        .replace(/\bclient\b/gi, "profil")
        .replace(/\*\*/g, "")
        .replace(/##/g, "")
        .replace(/__/g, "")
        .replace(/\*/g, "");
      if (hasEnglishMarkers(cleanedText, 6)) {
        cleanedText = stripEnglishLines(cleanedText);
      }
      cleanedText = normalizeSingleVoice(cleanedText);

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
  console.log(`[OpenAI] Generation audit ${tier} avec ${OPENAI_REPORT_MODEL} pour ${clientName}...`);

  const txtContent = await generateAuditTxtWithOpenAI(clientData, photoAnalysis, tier, resumeAuditId);
  if (!txtContent) {
    console.log(`[OpenAI] Echec generation TXT pour ${clientName}`);
    return {
      success: false,
      error: 'Echec generation avec OpenAI',
    };
  }

  console.log(`[OpenAI] Audit TXT genere (${txtContent.length} caracteres)`);

  if (txtContent.length < 10_000) {
    return {
      success: false,
      error: `Rapport OpenAI trop court (${txtContent.length} caracteres)`,
    };
  }

  const generationTime = Date.now() - startTime;

  return {
    success: true,
    txt: txtContent,
    clientName: clientName,
    metadata: {
      generationTimeMs: generationTime,
      sectionsGenerated: getSectionsForTier(tier).length,
      modelUsed: OPENAI_REPORT_MODEL,
      ...openAIProfileMetadata("premium"),
    },
  };
}
