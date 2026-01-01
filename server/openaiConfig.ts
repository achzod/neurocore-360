/**
 * NEUROCORE 360 - Configuration OpenAI
 * Utilise GPT-5.2-2025-12-11 (modèle avancé pour génération d'audits premium)
 */
export const OPENAI_CONFIG = {
  // ⚠️ Ne jamais commit une clé API en dur : utiliser les variables d'environnement sur Render
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-5.2-2025-12-11",
  OPENAI_TEMPERATURE: Number(process.env.OPENAI_TEMPERATURE ?? "0.85"),

  // Cap par section (réduit fortement le TPM vs 8000)
  OPENAI_MAX_TOKENS: Number(process.env.OPENAI_MAX_TOKENS ?? "2200"),

  // Retry plus robuste pour 429 (rate limit)
  OPENAI_MAX_RETRIES: Number(process.env.OPENAI_MAX_RETRIES ?? "8"),
  OPENAI_SLEEP_BETWEEN: Number(process.env.OPENAI_SLEEP_BETWEEN ?? "1"),

  // Concurrency des sections (évite le burst de TPM)
  OPENAI_SECTION_CONCURRENCY: Number(process.env.OPENAI_SECTION_CONCURRENCY ?? "3"),
};
