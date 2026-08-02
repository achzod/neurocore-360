import { OPENAI_REPORT_MODEL } from "./openaiResponses";

/**
 * Configuration OpenAI commune à tous les moteurs de rapports.
 * Les appels modernes passent par l'API Responses dans openaiResponses.ts.
 */

export const OPENAI_CONFIG = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: OPENAI_REPORT_MODEL,
  OPENAI_MAX_TOKENS: 18000,
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
