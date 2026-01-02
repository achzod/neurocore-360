/**
 * Anthropic Claude API Configuration
 * Uses Claude Opus 4.5 as primary model for premium health analysis
 */

export const ANTHROPIC_CONFIG = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || "claude-opus-4-5-20251101",
  ANTHROPIC_FALLBACK_MODEL: process.env.ANTHROPIC_FALLBACK_MODEL || "claude-sonnet-4-20250514",
  ANTHROPIC_TEMPERATURE: Number(process.env.ANTHROPIC_TEMPERATURE ?? "0.7"),
  ANTHROPIC_MAX_TOKENS: Number(process.env.ANTHROPIC_MAX_TOKENS ?? "4096"),
  ANTHROPIC_MAX_RETRIES: Number(process.env.ANTHROPIC_MAX_RETRIES ?? "3"),
  ANTHROPIC_SECTION_CONCURRENCY: Number(process.env.ANTHROPIC_SECTION_CONCURRENCY ?? "3"),
};

export function validateAnthropicConfig(): boolean {
  if (!ANTHROPIC_CONFIG.ANTHROPIC_API_KEY) {
    console.warn("[ANTHROPIC] No API key configured - falling back to OpenAI");
    return false;
  }
  return true;
}
