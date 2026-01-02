/**
 * NEUROCORE 360 - Configuration OpenAI
 *
 * Modèle principal : GPT-4.1 (stable, haute qualité, bon suivi d'instructions)
 * Fallback : GPT-4o (rapide, économique)
 *
 * GPT-4.1 est le meilleur choix pour :
 * - Génération de contenu long et structuré
 * - Analyse d'images (vision)
 * - Ton expert personnalisé
 * - Stabilité (pas d'empty responses comme GPT-5.2)
 */
export const OPENAI_CONFIG = {
  // ⚠️ Ne jamais commit une clé API en dur : utiliser les variables d'environnement sur Render
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",

  // Modèle principal : GPT-4.1 (meilleur rapport qualité/stabilité)
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4.1",

  // Fallback si rate limit ou erreur : GPT-4o (rapide et stable)
  OPENAI_FALLBACK_MODEL: process.env.OPENAI_FALLBACK_MODEL || "gpt-4o",

  // Température : 0.75 = créatif mais cohérent (expert humain)
  OPENAI_TEMPERATURE: Number(process.env.OPENAI_TEMPERATURE ?? "0.75"),

  // Tokens par section (GPT-4.1 gère bien les longs outputs)
  OPENAI_MAX_TOKENS: Number(process.env.OPENAI_MAX_TOKENS ?? "2500"),

  // Retry robuste
  OPENAI_MAX_RETRIES: Number(process.env.OPENAI_MAX_RETRIES ?? "5"),
  OPENAI_SLEEP_BETWEEN: Number(process.env.OPENAI_SLEEP_BETWEEN ?? "0.5"),

  // Concurrency : GPT-4.1 gère mieux, on peut monter à 4
  OPENAI_SECTION_CONCURRENCY: Number(process.env.OPENAI_SECTION_CONCURRENCY ?? "4"),
};
