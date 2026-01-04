/**
 * Anthropic Claude API Configuration
 * Primary: Claude Sonnet 4.5 - Best balance intelligence/speed/cost ($3/$15 MTok)
 * Fallback: Claude Opus 4.5 - Most powerful model ($5/$25 MTok)
 * Both: 200K context, 64K max output, extended thinking support
 */

export const ANTHROPIC_CONFIG = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
  ANTHROPIC_FALLBACK_MODEL: process.env.ANTHROPIC_FALLBACK_MODEL || "claude-opus-4-5-20251101",
  ANTHROPIC_TEMPERATURE: Number(process.env.ANTHROPIC_TEMPERATURE ?? "0.7"),
  // Max tokens par section - augmenté pour 40-50 pages PREMIUM
  ANTHROPIC_MAX_TOKENS: Number(process.env.ANTHROPIC_MAX_TOKENS ?? "8000"),
  ANTHROPIC_MAX_RETRIES: Number(process.env.ANTHROPIC_MAX_RETRIES ?? "3"),
  // Concurrency réduit à 2 pour éviter rate limits avec tokens élevés
  ANTHROPIC_SECTION_CONCURRENCY: Number(process.env.ANTHROPIC_SECTION_CONCURRENCY ?? "2"),
};

// Limites de tokens par type de section pour atteindre 40-50 pages (PREMIUM)
// Calcul: 45 pages × 2800 chars/page = 126,000 chars / 18 sections = 7000 chars/section = ~1750 tokens
// On vise plus haut car Claude génère du contenu dense
export const SECTION_TOKEN_LIMITS = {
  EXECUTIVE_SUMMARY: 5000,      // ~20,000 chars - page clé, dense
  ANALYSIS: 6500,               // ~26,000 chars - analyses profondes
  PROTOCOL: 7000,               // ~28,000 chars - protocoles détaillés
  PLAN: 7500,                   // ~30,000 chars - plans semaine par semaine
  KPI: 5500,                    // ~22,000 chars - tableaux et métriques
  SUPPLEMENTS: 5000,            // géré par supplementEngine, pas Claude
  SYNTHESIS: 5000,              // ~20,000 chars - conclusion
  DEFAULT: 6000,
  // Version GRATUIT (5-7 pages avec 4 sections) - Discovery Scan
  GRATUIT_EXECUTIVE: 3000,      // ~3500-4500 chars = court et percutant
  GRATUIT_ANALYSIS: 4000,       // ~4000-5000 chars par section
  GRATUIT_SYNTHESIS: 4000,      // Inclut les sections cadenas
};

export function validateAnthropicConfig(): boolean {
  if (!ANTHROPIC_CONFIG.ANTHROPIC_API_KEY) {
    console.warn("[ANTHROPIC] No API key configured - falling back to OpenAI");
    return false;
  }
  return true;
}
