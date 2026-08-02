import { createHash } from "crypto";
import OpenAI from "openai";

export const OPENAI_REPORT_MODEL =
  process.env.OPENAI_REPORT_MODEL || "gpt-5.6-sol";

export type OpenAIReportProfile =
  | "discovery"
  | "premium"
  | "blood"
  | "vision"
  | "extraction"
  | "peptides";

type ReasoningEffort = "low" | "medium" | "high" | "xhigh" | "max";

interface ProfileConfig {
  effort: ReasoningEffort;
  mode?: "pro";
  maxOutputTokens: number;
  timeoutMs: number;
  verbosity: "low" | "medium" | "high";
}

const PROFILE_CONFIG: Record<OpenAIReportProfile, ProfileConfig> = {
  discovery: {
    effort: "high",
    maxOutputTokens: 10_000,
    timeoutMs: 6 * 60 * 1000,
    verbosity: "high",
  },
  premium: {
    effort: "xhigh",
    mode: "pro",
    maxOutputTokens: 18_000,
    timeoutMs: 12 * 60 * 1000,
    verbosity: "high",
  },
  blood: {
    effort: "max",
    mode: "pro",
    maxOutputTokens: 48_000,
    timeoutMs: 15 * 60 * 1000,
    verbosity: "high",
  },
  vision: {
    effort: "high",
    maxOutputTokens: 10_000,
    timeoutMs: 8 * 60 * 1000,
    verbosity: "high",
  },
  extraction: {
    effort: "high",
    maxOutputTokens: 8_000,
    timeoutMs: 6 * 60 * 1000,
    verbosity: "low",
  },
  peptides: {
    effort: "max",
    mode: "pro",
    maxOutputTokens: 64_000,
    timeoutMs: 15 * 60 * 1000,
    verbosity: "high",
  },
};

let openAIClient: OpenAI | null = null;

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }
  if (!openAIClient) {
    openAIClient = new OpenAI({
      apiKey,
      maxRetries: 2,
      timeout: 15 * 60 * 1000,
    });
  }
  return openAIClient;
}

function responseText(response: any): string {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }
  return (response?.output || [])
    .flatMap((item: any) => item?.content || [])
    .filter((item: any) => item?.type === "output_text" && typeof item?.text === "string")
    .map((item: any) => item.text)
    .join("");
}

function safeIdentifier(value: string, profile: OpenAIReportProfile): string {
  const digest = createHash("sha256")
    .update(String(value || "anonymous").trim().toLowerCase())
    .digest("hex")
    .slice(0, 24);
  return `apexlabs_${profile}_${digest}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: any): boolean {
  const status = Number(error?.status || error?.response?.status || 0);
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

export interface OpenAITextRequest {
  profile: OpenAIReportProfile;
  instructions: string;
  input: string | any[];
  safetyId?: string;
  maxOutputTokens?: number;
  schema?: Record<string, unknown>;
  schemaName?: string;
  background?: boolean;
  retries?: number;
  label?: string;
}

export interface OpenAITextResult {
  text: string;
  responseId: string;
  model: string;
  profile: OpenAIReportProfile;
  reasoningEffort: ReasoningEffort;
  reasoningMode: "pro" | "standard";
}

export async function runOpenAIText(request: OpenAITextRequest): Promise<OpenAITextResult> {
  const client = getOpenAIClient();
  const profile = PROFILE_CONFIG[request.profile];
  const model = OPENAI_REPORT_MODEL;
  const background = request.background ?? Boolean(profile.mode === "pro");
  const attempts = Math.max(1, request.retries ?? 3);
  const label = request.label ? ` ${request.label}` : "";
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      console.log(
        `[OpenAIResponses] Starting${label}: ${request.profile}/${model}, effort=${profile.effort}, mode=${profile.mode || "standard"}, attempt=${attempt}/${attempts}`
      );

      const textConfig: Record<string, unknown> = { verbosity: profile.verbosity };
      if (request.schema) {
        textConfig.format = {
          type: "json_schema",
          name: request.schemaName || `${request.profile}_result`,
          strict: true,
          schema: request.schema,
        };
      }

      let response: any = await client.responses.create({
        model,
        background,
        store: background,
        instructions: request.instructions,
        input: request.input,
        max_output_tokens: request.maxOutputTokens || profile.maxOutputTokens,
        reasoning: {
          effort: profile.effort,
          ...(profile.mode ? { mode: profile.mode } : {}),
        },
        text: textConfig,
        safety_identifier: safeIdentifier(request.safetyId || request.label || "anonymous", request.profile),
      } as any);

      const deadline = Date.now() + profile.timeoutMs;
      while (response?.status === "queued" || response?.status === "in_progress") {
        if (Date.now() >= deadline) {
          try {
            await client.responses.cancel(response.id);
          } catch {
            // Best effort. No incomplete response is returned to a client.
          }
          throw new Error(`OpenAI response timeout (${response?.id || "unknown"})`);
        }
        await sleep(2500);
        response = await client.responses.retrieve(response.id);
      }

      if (response?.status !== "completed") {
        const detail =
          response?.error?.message ||
          response?.incomplete_details?.reason ||
          response?.status ||
          "unknown";
        throw new Error(`OpenAI response incomplete: ${detail}`);
      }

      const text = responseText(response).trim();
      if (!text) {
        throw new Error("OpenAI returned an empty response");
      }

      console.log(
        `[OpenAIResponses] Completed${label}: ${request.profile}/${model}, response=${response.id}, chars=${text.length}`
      );
      return {
        text,
        responseId: response.id,
        model,
        profile: request.profile,
        reasoningEffort: profile.effort,
        reasoningMode: profile.mode || "standard",
      };
    } catch (error: any) {
      lastError = error;
      console.error(
        `[OpenAIResponses] Failed${label}: attempt=${attempt}/${attempts}, ${error?.message || error}`
      );
      if (attempt >= attempts || !isRetryable(error)) break;
      const retryAfter = Number(error?.headers?.["retry-after"] || 0);
      const delayMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(20_000, attempt * 3000);
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError || "OpenAI request failed"));
}

export function openAIProfileMetadata(profile: OpenAIReportProfile): Record<string, string> {
  const config = PROFILE_CONFIG[profile];
  return {
    provider: "openai",
    model: OPENAI_REPORT_MODEL,
    reasoningEffort: config.effort,
    reasoningMode: config.mode || "standard",
  };
}
