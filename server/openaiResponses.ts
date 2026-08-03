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
    // max_output_tokens includes hidden reasoning tokens. At effort=max,
    // 20k can be exhausted before the structured report is emitted.
    maxOutputTokens: 48_000,
    // Complex structured reports regularly outlive 15 minutes in background
    // mode. Keep one candidate alive instead of cancelling useful work and
    // paying for a second full regeneration.
    timeoutMs: 30 * 60 * 1000,
    verbosity: "high",
  },
};

const PRICING = {
  openaiGpt56Sol: {
    uncachedInputPerMillion: 5,
    cachedInputPerMillion: 0.5,
    cacheWritePerMillion: 6.25,
    outputPerMillion: 30,
    longContextThresholdTokens: 272_000,
    longContextInputMultiplier: 2,
    longContextOutputMultiplier: 1.5,
    source: "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
  },
  sonnet46Equivalent: {
    uncachedInputPerMillion: 3,
    cachedInputPerMillion: 0.3,
    cacheWritePerMillion: 3.75,
    outputPerMillion: 15,
    source: "https://platform.claude.com/docs/en/about-claude/pricing",
  },
} as const;

export interface AIUsageTokens {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
}

export interface AIUsageCostEstimate {
  openaiGpt56SolUsd: number;
  sonnet46EquivalentUsd: number;
  differenceUsd: number;
  sonnet46EquivalentSavingsPercent: number;
  openaiLongContextMultiplierApplied: boolean;
}

export interface AIUsageTelemetry {
  tokens: AIUsageTokens;
  costs: AIUsageCostEstimate;
}

function nonNegativeInteger(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function roundUsd(value: number): number {
  return Math.round(value * 100_000_000) / 100_000_000;
}

export function estimateAIUsageCosts(tokens: AIUsageTokens): AIUsageCostEstimate {
  const inputTokens = nonNegativeInteger(tokens.inputTokens);
  const cachedInputTokens = Math.min(inputTokens, nonNegativeInteger(tokens.cachedInputTokens));
  const cacheWriteTokens = Math.min(
    Math.max(0, inputTokens - cachedInputTokens),
    nonNegativeInteger(tokens.cacheWriteTokens),
  );
  const uncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens - cacheWriteTokens);
  const outputTokens = nonNegativeInteger(tokens.outputTokens);
  const longContext = inputTokens > PRICING.openaiGpt56Sol.longContextThresholdTokens;
  const openaiInputMultiplier = longContext
    ? PRICING.openaiGpt56Sol.longContextInputMultiplier
    : 1;
  const openaiOutputMultiplier = longContext
    ? PRICING.openaiGpt56Sol.longContextOutputMultiplier
    : 1;

  const openaiGpt56SolUsd =
    ((uncachedInputTokens * PRICING.openaiGpt56Sol.uncachedInputPerMillion +
      cachedInputTokens * PRICING.openaiGpt56Sol.cachedInputPerMillion +
      cacheWriteTokens * PRICING.openaiGpt56Sol.cacheWritePerMillion) /
      1_000_000) *
      openaiInputMultiplier +
    (outputTokens * PRICING.openaiGpt56Sol.outputPerMillion * openaiOutputMultiplier) /
      1_000_000;

  const sonnet46EquivalentUsd =
    (uncachedInputTokens * PRICING.sonnet46Equivalent.uncachedInputPerMillion +
      cachedInputTokens * PRICING.sonnet46Equivalent.cachedInputPerMillion +
      cacheWriteTokens * PRICING.sonnet46Equivalent.cacheWritePerMillion +
      outputTokens * PRICING.sonnet46Equivalent.outputPerMillion) /
    1_000_000;
  const differenceUsd = openaiGpt56SolUsd - sonnet46EquivalentUsd;
  const sonnetSavings = openaiGpt56SolUsd > 0
    ? (differenceUsd / openaiGpt56SolUsd) * 100
    : 0;

  return {
    openaiGpt56SolUsd: roundUsd(openaiGpt56SolUsd),
    sonnet46EquivalentUsd: roundUsd(sonnet46EquivalentUsd),
    differenceUsd: roundUsd(differenceUsd),
    sonnet46EquivalentSavingsPercent: Math.round(sonnetSavings * 100) / 100,
    openaiLongContextMultiplierApplied: longContext,
  };
}

function extractUsageTelemetry(response: any): AIUsageTelemetry | null {
  const usage = response?.usage;
  if (!usage || typeof usage !== "object") return null;

  const inputTokens = nonNegativeInteger(usage.input_tokens);
  const outputTokens = nonNegativeInteger(usage.output_tokens);
  const cachedInputTokens = nonNegativeInteger(
    usage.input_tokens_details?.cached_tokens ?? usage.cached_input_tokens,
  );
  const cacheWriteTokens = nonNegativeInteger(
    usage.input_tokens_details?.cache_write_tokens ??
      usage.input_tokens_details?.cache_creation_tokens ??
      usage.cache_creation_input_tokens,
  );
  const reasoningTokens = nonNegativeInteger(
    usage.output_tokens_details?.reasoning_tokens ?? usage.reasoning_tokens,
  );
  const totalTokens = nonNegativeInteger(usage.total_tokens) || inputTokens + outputTokens;
  if (inputTokens === 0 && outputTokens === 0 && totalTokens === 0) return null;

  const tokens: AIUsageTokens = {
    inputTokens,
    cachedInputTokens: Math.min(inputTokens, cachedInputTokens),
    cacheWriteTokens: Math.min(inputTokens, cacheWriteTokens),
    outputTokens,
    reasoningTokens: Math.min(outputTokens, reasoningTokens),
    totalTokens,
  };
  return { tokens, costs: estimateAIUsageCosts(tokens) };
}

let aiUsageTablePromise: Promise<void> | null = null;

async function ensureAIUsageTable(): Promise<void> {
  if (!aiUsageTablePromise) {
    aiUsageTablePromise = (async () => {
      const { pool } = await import("./db");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_usage_events (
          id BIGSERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          provider TEXT NOT NULL DEFAULT 'openai',
          model TEXT NOT NULL,
          profile TEXT NOT NULL,
          label TEXT,
          response_id TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL,
          input_tokens BIGINT NOT NULL,
          cached_input_tokens BIGINT NOT NULL DEFAULT 0,
          cache_write_tokens BIGINT NOT NULL DEFAULT 0,
          output_tokens BIGINT NOT NULL,
          reasoning_tokens BIGINT NOT NULL DEFAULT 0,
          total_tokens BIGINT NOT NULL,
          estimated_openai_cost_usd DOUBLE PRECISION NOT NULL,
          estimated_sonnet46_cost_usd DOUBLE PRECISION NOT NULL
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS ai_usage_events_created_at_idx
        ON ai_usage_events (created_at DESC)
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_usage_cost_alerts (
          alert_key TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          estimated_openai_cost_usd DOUBLE PRECISION NOT NULL,
          estimated_sonnet46_cost_usd DOUBLE PRECISION NOT NULL
        )
      `);
    })().catch((error) => {
      aiUsageTablePromise = null;
      throw error;
    });
  }
  await aiUsageTablePromise;
}

async function recordAIUsageEvent(params: {
  response: any;
  profile: OpenAIReportProfile;
  label?: string;
  status: string;
}): Promise<AIUsageTelemetry | null> {
  const telemetry = extractUsageTelemetry(params.response);
  const responseId = String(params.response?.id || "").trim();
  if (!telemetry || !responseId) return telemetry;

  const { tokens, costs } = telemetry;
  console.log(
    `[AICost] profile=${params.profile} label=${params.label || "none"} status=${params.status} response=${responseId} input=${tokens.inputTokens} cached=${tokens.cachedInputTokens} output=${tokens.outputTokens} reasoning=${tokens.reasoningTokens} openai_usd=${costs.openaiGpt56SolUsd.toFixed(6)} sonnet46_equivalent_usd=${costs.sonnet46EquivalentUsd.toFixed(6)}`,
  );

  try {
    await ensureAIUsageTable();
    const { pool } = await import("./db");
    await pool.query(
      `INSERT INTO ai_usage_events (
        provider, model, profile, label, response_id, status,
        input_tokens, cached_input_tokens, cache_write_tokens,
        output_tokens, reasoning_tokens, total_tokens,
        estimated_openai_cost_usd, estimated_sonnet46_cost_usd
      ) VALUES (
        'openai', $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12, $13
      )
      ON CONFLICT (response_id) DO UPDATE SET
        status = EXCLUDED.status,
        input_tokens = EXCLUDED.input_tokens,
        cached_input_tokens = EXCLUDED.cached_input_tokens,
        cache_write_tokens = EXCLUDED.cache_write_tokens,
        output_tokens = EXCLUDED.output_tokens,
        reasoning_tokens = EXCLUDED.reasoning_tokens,
        total_tokens = EXCLUDED.total_tokens,
        estimated_openai_cost_usd = EXCLUDED.estimated_openai_cost_usd,
        estimated_sonnet46_cost_usd = EXCLUDED.estimated_sonnet46_cost_usd`,
      [
        String(params.response?.model || OPENAI_REPORT_MODEL),
        params.profile,
        params.label || null,
        responseId,
        params.status,
        tokens.inputTokens,
        tokens.cachedInputTokens,
        tokens.cacheWriteTokens,
        tokens.outputTokens,
        tokens.reasoningTokens,
        tokens.totalTokens,
        costs.openaiGpt56SolUsd,
        costs.sonnet46EquivalentUsd,
      ],
    );
    void maybeSendAIUsageCostAlert().catch((alertError: any) => {
      console.error(`[AICost] Alert check failed: ${alertError?.message || alertError}`);
    });
  } catch (error: any) {
    console.error(`[AICost] Persistence failed: ${error?.message || error}`);
  }
  return telemetry;
}

const DAILY_COST_ALERT_LEVELS_USD = [5, 10, 25, 50, 100, 250, 500, 1_000] as const;

async function maybeSendAIUsageCostAlert(): Promise<void> {
  await ensureAIUsageTable();
  const { pool } = await import("./db");
  const spendResult = await pool.query(`
    SELECT
      TO_CHAR(NOW() AT TIME ZONE 'Asia/Dubai', 'YYYY-MM-DD') AS dubai_day,
      COALESCE(SUM(estimated_openai_cost_usd), 0) AS openai_usd,
      COALESCE(SUM(estimated_sonnet46_cost_usd), 0) AS sonnet_usd
    FROM ai_usage_events
    WHERE (created_at AT TIME ZONE 'Asia/Dubai')::date =
          (NOW() AT TIME ZONE 'Asia/Dubai')::date
  `);
  const row = spendResult.rows[0] || {};
  const openaiUsd = numberFromDb(row.openai_usd);
  const sonnetUsd = numberFromDb(row.sonnet_usd);
  const crossedLevel = [...DAILY_COST_ALERT_LEVELS_USD]
    .reverse()
    .find((level) => openaiUsd >= level);
  if (!crossedLevel) return;

  const alertKey = `daily:${row.dubai_day}:${crossedLevel}`;
  const claimed = await pool.query(
    `INSERT INTO ai_usage_cost_alerts (
       alert_key, estimated_openai_cost_usd, estimated_sonnet46_cost_usd
     ) VALUES ($1, $2, $3)
     ON CONFLICT (alert_key) DO NOTHING
     RETURNING alert_key`,
    [alertKey, openaiUsd, sonnetUsd],
  );
  if ((claimed.rowCount ?? 0) === 0) return;

  const alertEmail = process.env.AI_COST_ALERT_EMAIL || "achkou@gmail.com";
  const { sendCTAEmail } = await import("./emailService");
  const difference = openaiUsd - sonnetUsd;
  const sent = await sendCTAEmail(
    alertEmail,
    `[ALERTE COUT API] ${openaiUsd.toFixed(2)} USD aujourd'hui`,
    `Alerte automatique APEXLABS.\n\nLe cout OpenAI estime a atteint ${openaiUsd.toFixed(4)} USD aujourd'hui, heure de Dubai.\nEquivalent Sonnet 4.6 au meme volume de tokens: ${sonnetUsd.toFixed(4)} USD.\nEcart estime: ${difference.toFixed(4)} USD.\n\nSeuil franchi: ${crossedLevel} USD.\n\nDetail protege: /api/admin/ai-usage-costs?days=1`,
  );
  console.log(
    `[AICost] Daily threshold ${crossedLevel} USD alert ${sent ? "sent" : "failed"} to ${alertEmail}`,
  );
  if (!sent) {
    await pool.query("DELETE FROM ai_usage_cost_alerts WHERE alert_key = $1", [alertKey]);
  }
}

export async function checkAIUsageCostAlert(): Promise<void> {
  await maybeSendAIUsageCostAlert();
}

function numberFromDb(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapUsageSummaryRow(row: any): Record<string, unknown> {
  return {
    calls: numberFromDb(row.calls),
    inputTokens: numberFromDb(row.input_tokens),
    cachedInputTokens: numberFromDb(row.cached_input_tokens),
    outputTokens: numberFromDb(row.output_tokens),
    reasoningTokens: numberFromDb(row.reasoning_tokens),
    totalTokens: numberFromDb(row.total_tokens),
    openaiEstimatedUsd: roundUsd(numberFromDb(row.openai_usd)),
    sonnet46EquivalentUsd: roundUsd(numberFromDb(row.sonnet_usd)),
    differenceUsd: roundUsd(numberFromDb(row.openai_usd) - numberFromDb(row.sonnet_usd)),
  };
}

export async function getAIUsageCostSummary(requestedDays = 30): Promise<Record<string, unknown>> {
  const days = Math.min(365, Math.max(1, Math.round(Number(requestedDays) || 30)));
  await ensureAIUsageTable();
  const { pool } = await import("./db");
  const periodSql = "created_at >= NOW() - ($1::int * INTERVAL '1 day')";
  const summaryFields = `
    COUNT(*) AS calls,
    COALESCE(SUM(input_tokens), 0) AS input_tokens,
    COALESCE(SUM(cached_input_tokens), 0) AS cached_input_tokens,
    COALESCE(SUM(output_tokens), 0) AS output_tokens,
    COALESCE(SUM(reasoning_tokens), 0) AS reasoning_tokens,
    COALESCE(SUM(total_tokens), 0) AS total_tokens,
    COALESCE(SUM(estimated_openai_cost_usd), 0) AS openai_usd,
    COALESCE(SUM(estimated_sonnet46_cost_usd), 0) AS sonnet_usd`;
  const [totalResult, profilesResult, dailyResult, statusesResult, recentResult] = await Promise.all([
    pool.query(`SELECT ${summaryFields} FROM ai_usage_events WHERE ${periodSql}`, [days]),
    pool.query(
      `SELECT profile, ${summaryFields}
       FROM ai_usage_events WHERE ${periodSql}
       GROUP BY profile ORDER BY openai_usd DESC`,
      [days],
    ),
    pool.query(
      `SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Dubai', 'YYYY-MM-DD') AS day, ${summaryFields}
       FROM ai_usage_events WHERE ${periodSql}
       GROUP BY day ORDER BY day DESC`,
      [days],
    ),
    pool.query(
      `SELECT status, COUNT(*) AS calls
       FROM ai_usage_events WHERE ${periodSql}
       GROUP BY status ORDER BY status`,
      [days],
    ),
    pool.query(
      `SELECT created_at, model, profile, label, response_id, status,
              input_tokens, cached_input_tokens, output_tokens, reasoning_tokens, total_tokens,
              estimated_openai_cost_usd, estimated_sonnet46_cost_usd
       FROM ai_usage_events WHERE ${periodSql}
       ORDER BY created_at DESC LIMIT 50`,
      [days],
    ),
  ]);

  const mapRecent = (row: any) => ({
    createdAt: row.created_at,
    model: row.model,
    profile: row.profile,
    label: row.label,
    responseId: row.response_id,
    status: row.status,
    inputTokens: numberFromDb(row.input_tokens),
    cachedInputTokens: numberFromDb(row.cached_input_tokens),
    outputTokens: numberFromDb(row.output_tokens),
    reasoningTokens: numberFromDb(row.reasoning_tokens),
    totalTokens: numberFromDb(row.total_tokens),
    openaiEstimatedUsd: roundUsd(numberFromDb(row.estimated_openai_cost_usd)),
    sonnet46EquivalentUsd: roundUsd(numberFromDb(row.estimated_sonnet46_cost_usd)),
  });

  return {
    success: true,
    periodDays: days,
    trackingStartedWhenFirstEventWasRecorded: true,
    generatedAt: new Date().toISOString(),
    currency: "USD",
    comparison: "Theoretical same-token-volume comparison only. No Anthropic API call is made.",
    pricing: PRICING,
    totals: mapUsageSummaryRow(totalResult.rows[0] || {}),
    byProfile: profilesResult.rows.map((row: any) => ({
      profile: row.profile,
      ...mapUsageSummaryRow(row),
    })),
    byDayDubai: dailyResult.rows.map((row: any) => ({
      day: row.day,
      ...mapUsageSummaryRow(row),
    })),
    byStatus: statusesResult.rows.map((row: any) => ({
      status: row.status,
      calls: numberFromDb(row.calls),
    })),
    recent: recentResult.rows.map(mapRecent),
  };
}

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
  usage: AIUsageTelemetry | null;
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

      const deadline = Date.now() + profile.timeoutMs;
      let response: any = await client.responses.create(
        {
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
        } as any,
        {
          maxRetries: 0,
          timeout: profile.timeoutMs,
        } as any,
      );

      while (response?.status === "queued" || response?.status === "in_progress") {
        if (Date.now() >= deadline) {
          try {
            const cancelResult = await Promise.race([
              client.responses.cancel(response.id).then((cancelledResponse) => ({
                completed: true as const,
                cancelledResponse,
              })),
              sleep(10_000).then(() => ({
                completed: false as const,
                cancelledResponse: null,
              })),
            ]);
            if (cancelResult.completed && cancelResult.cancelledResponse) {
              await recordAIUsageEvent({
                response: cancelResult.cancelledResponse,
                profile: request.profile,
                label: request.label,
                status: "cancelled_timeout",
              });
            } else {
              console.warn(
                `[OpenAIResponses] Cancel did not complete within 10s: ${response?.id || "unknown"}`,
              );
            }
          } catch {
            // Best effort. No incomplete response is returned to a client.
          }
          throw new Error(`OpenAI response timeout (${response?.id || "unknown"})`);
        }
        await sleep(2500);
        response = await client.responses.retrieve(response.id);
      }

      if (response?.status !== "completed") {
        await recordAIUsageEvent({
          response,
          profile: request.profile,
          label: request.label,
          status: String(response?.status || "incomplete"),
        });
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
      const usage = await recordAIUsageEvent({
        response,
        profile: request.profile,
        label: request.label,
        status: "completed",
      });
      return {
        text,
        responseId: response.id,
        model,
        profile: request.profile,
        reasoningEffort: profile.effort,
        reasoningMode: profile.mode || "standard",
        usage,
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
