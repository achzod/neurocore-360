/**
 * OpenAI Config - Minimal stub for photoAnalysisAI (GPT-4 Vision)
 * NOTE: Main report generation uses Claude Opus 4.5 (anthropicEngine.ts)
 */

export const OPENAI_CONFIG = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: "gpt-4o",
  OPENAI_TEMPERATURE: 0.3,
  OPENAI_MAX_TOKENS: 4000,
  OPENAI_MAX_RETRIES: Number(process.env.OPENAI_MAX_RETRIES ?? "3"),
  OPENAI_SLEEP_BETWEEN: Number(process.env.OPENAI_SLEEP_BETWEEN ?? "1.5"),
};

export function validateOpenAIConfig(): boolean {
  if (!OPENAI_CONFIG.OPENAI_API_KEY) {
    console.warn("[OpenAI] No API key configured");
    return false;
  }
  return true;
}
