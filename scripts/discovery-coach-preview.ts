/**
 * Discovery v3 dry-run preview.
 *
 *   npx tsx scripts/discovery-coach-preview.ts <auditId>
 *
 * Reads the audit responses (SELECT only), generates a v3 coach report with
 * the exact production prompt, schema, validation and single corrective
 * retry, and prints the HTML/TXT preview between markers (gzip + base64).
 *
 * It NEVER writes to the database, NEVER updates the audit, NEVER sends an
 * email and does not touch the generation claim or the budget ledger (the
 * provider is called directly, outside the transactional Discovery path).
 */
import { gzipSync } from "node:zlib";
import { pool } from "../server/db";
import {
  buildDiscoveryReportAssets,
  generateDiscoveryCoachNarrative,
  validateDiscoveryCoachCandidateForDelivery,
  type DiscoveryCoachProvider,
} from "../server/discovery-scan";
import {
  DISCOVERY_REASONING_EFFORT,
  OPENAI_REPORT_MODEL,
  estimateAIUsageCosts,
  getOpenAIClient,
} from "../server/openaiResponses";

function emit(label: string, content: string): void {
  const encoded = gzipSync(Buffer.from(content, "utf8")).toString("base64");
  const chunks = encoded.match(/.{1,3500}/g) || [];
  chunks.forEach((chunk, index) => console.log(`@@${label}:${index}:${chunks.length}:${chunk}`));
}

async function main(): Promise<void> {
  const auditId = String(process.argv[2] || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(auditId)) throw new Error("usage: discovery-coach-preview.ts <auditId>");
  const row = await pool.query(`SELECT responses FROM audits WHERE id = $1 AND type = 'GRATUIT'`, [auditId]);
  if (row.rowCount !== 1) throw new Error("audit not found");
  const responses = row.rows[0].responses;

  const client = getOpenAIClient();
  const provider: DiscoveryCoachProvider = async (request) => {
    const startedAt = Date.now();
    let response: any = await client.responses.create({
      model: OPENAI_REPORT_MODEL,
      instructions: request.instructions,
      input: request.input,
      max_output_tokens: request.maxOutputTokens,
      reasoning: { effort: DISCOVERY_REASONING_EFFORT },
      text: {
        verbosity: "medium",
        format: { type: "json_schema", name: request.schemaName, strict: true, schema: request.schema },
      },
      store: false,
    } as any);
    while (response?.status === "queued" || response?.status === "in_progress") {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      response = await client.responses.retrieve(response.id);
    }
    const usage = response?.usage || {};
    const tokens = {
      inputTokens: Number(usage.input_tokens || 0),
      cachedInputTokens: Number(usage.input_tokens_details?.cached_tokens || 0),
      cacheWriteTokens: 0,
      outputTokens: Number(usage.output_tokens || 0),
      reasoningTokens: Number(usage.output_tokens_details?.reasoning_tokens || 0),
      totalTokens: Number(usage.total_tokens || 0),
    };
    const costs = estimateAIUsageCosts(tokens);
    const text = typeof response?.output_text === "string" && response.output_text
      ? response.output_text
      : (response?.output || []).flatMap((item: any) => item?.content || [])
        .filter((item: any) => item?.type === "output_text").map((item: any) => item.text).join("");
    console.log(`PREVIEW_ATTEMPT ${JSON.stringify({
      attempt: request.attempt, status: response?.status, model: response?.model, ms: Date.now() - startedAt,
      inputChars: request.instructions.length + request.input.length, tokens, costUsd: costs.openaiGpt56SolUsd,
    })}`);
    return {
      text,
      responseId: String(response?.id || ""),
      model: String(response?.model || OPENAI_REPORT_MODEL),
      inputTokens: tokens.inputTokens,
      outputTokens: tokens.outputTokens,
      totalTokens: tokens.totalTokens,
      actualCostUsd: costs.openaiGpt56SolUsd,
    };
  };

  const generatedAt = new Date().toISOString();
  try {
    const outcome = await generateDiscoveryCoachNarrative(responses, provider, { generatedAt });
    const assembled = validateDiscoveryCoachCandidateForDelivery(
      responses, outcome.coachNarrative, outcome.coachProvenance, generatedAt,
    );
    if (!assembled.report || assembled.errors.length > 0) {
      throw new Error(`assembly_failed:${assembled.errors.join("|")}`);
    }
    const assets = buildDiscoveryReportAssets(assembled.report);
    console.log(`PREVIEW_RESULT ${JSON.stringify({
      ok: true,
      words: outcome.wordCount,
      attempts: outcome.attempts,
      totalCostUsd: outcome.attempts.reduce((sum, item) => sum + item.actualCostUsd, 0),
      sections: assembled.report.sections.map((section) => section.id),
    })}`);
    emit("HTML", assets.html);
    emit("TXT", assets.txt);
    emit("JSON", JSON.stringify(assembled.report));
  } catch (error: any) {
    console.log(`PREVIEW_RESULT ${JSON.stringify({ ok: false, error: String(error?.message || error).slice(0, 4000) })}`);
    if (error?.payload?.providerRaw) emit("RAW", JSON.stringify(error.payload.providerRaw));
    process.exitCode = 2;
  } finally {
    await pool.end().catch(() => {});
  }
}

void main();
