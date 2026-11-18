/**
 * In-place v3 regeneration of existing Discovery reports (SENT, NEEDS_REVIEW,
 * DELIVERY_BLOCKED, BATCH_READY). Status and report_sent_at never change and
 * no email or sequence is ever triggered.
 *
 * Read-only classification (default):
 *   npx tsx scripts/regenerate-discovery-in-place.ts --ids <id,id,...>
 * Create a durable run with a total cost ceiling (<= 15 USD):
 *   npx tsx scripts/regenerate-discovery-in-place.ts --create-run --max-total-usd 15
 * Regenerate (side-effect guards mandatory):
 *   REMEDIATION_SIDE_EFFECTS_DISABLED=true AI_COST_ALERTS_ENABLED=false DISCOVERY_REPORT_DELIVERY_ENABLED=false \
 *   npx tsx scripts/regenerate-discovery-in-place.ts --execute --run-id <uuid> --ids <id,...> --concurrency 2
 * Manual rollback of one audit from its backup:
 *   npx tsx scripts/regenerate-discovery-in-place.ts --restore <auditId> --run-id <uuid>
 */
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

import { pool } from "../server/db";
import {
  DISCOVERY_INPLACE_MAX_CONCURRENCY,
  assertInPlaceSideEffectsDisabled,
  classifyDiscoveryInPlaceCandidate,
  createDiscoveryInPlaceRun,
  discoveryInPlaceArtifactHash,
  readDiscoveryInPlaceRunSpend,
  regenerateDiscoveryReportInPlace,
  restoreDiscoveryReportFromBackup,
} from "../server/discoveryInPlaceRegeneration";
import { isDiscoverySupersededTerminal } from "../server/discoverySupersededPolicy";

const MAX_ITEMS_PER_INVOCATION = 25;
/** Worst case for one item: two reserved calls. */
const WORST_CASE_ITEM_USD = 0.5;

const argv = process.argv.slice(2);
const has = (flag: string) => argv.includes(flag);
const valueAfter = (flag: string) => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};

function emit(label: string, content: string): void {
  const encoded = gzipSync(Buffer.from(content, "utf8")).toString("base64");
  const chunks = encoded.match(/.{1,3500}/g) || [];
  chunks.forEach((chunk, index) => console.log(`@@${label}:${index}:${chunks.length}:${chunk}`));
}

function parseIds(): string[] {
  const raw = [valueAfter("--ids") || "", valueAfter("--ids-file") ? readFileSync(valueAfter("--ids-file")!, "utf8") : ""]
    .join(",");
  const ids = [...new Set(raw.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean))];
  for (const id of ids) if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error(`invalid audit id: ${id}`);
  return ids;
}

async function classify(ids: string[]) {
  const result = await pool.query(
    `SELECT id, type, email, responses->>'prenom' AS prenom, report_delivery_status, report_sent_at,
            narrative_report, report_txt, report_html
       FROM audits WHERE id = ANY($1)`,
    [ids],
  );
  const byId = new Map(result.rows.map((row) => [String(row.id), row]));
  return ids.map((id) => {
    const row = byId.get(id);
    if (!row) return { id, eligible: false, reasons: ["not_found"] };
    const reasons = classifyDiscoveryInPlaceCandidate({
      type: row.type,
      status: row.report_delivery_status,
      reportSentAt: row.report_sent_at,
      reportVersion: row.narrative_report?.generationQuality?.version,
      email: row.email,
      firstName: row.prenom,
      supersededTerminal: isDiscoverySupersededTerminal({
        type: row.type,
        reportDeliveryStatus: row.report_delivery_status,
        narrativeReport: row.narrative_report,
      }),
    });
    return {
      id,
      eligible: reasons.length === 0,
      reasons,
      status: row.report_delivery_status,
      reportSentAt: row.report_sent_at,
      version: row.narrative_report?.generationQuality?.version ?? null,
      artifactHash: discoveryInPlaceArtifactHash(row.report_txt, row.report_html),
    };
  });
}

async function main(): Promise<void> {
  if (has("--create-run")) {
    const max = Number(valueAfter("--max-total-usd"));
    const runId = await createDiscoveryInPlaceRun(max, valueAfter("--note") || "discovery v3 in-place regeneration");
    console.log(`RUN_ID ${runId} max_total_usd=${max}`);
    return;
  }
  const runId = valueAfter("--run-id");
  if (has("--restore")) {
    if (!runId) throw new Error("--run-id is mandatory for --restore");
    console.log(`RESTORE ${JSON.stringify(await restoreDiscoveryReportFromBackup({ runId, auditId: valueAfter("--restore")! }))}`);
    return;
  }
  const ids = parseIds();
  if (ids.length === 0) throw new Error("--ids or --ids-file is mandatory");
  const classified = await classify(ids);
  for (const row of classified) console.log(`CLASSIFY ${JSON.stringify(row)}`);
  if (!has("--execute")) return;

  assertInPlaceSideEffectsDisabled();
  if (!runId) throw new Error("--run-id is mandatory for --execute");
  const eligible = classified.filter((row) => row.eligible).map((row) => row.id);
  if (eligible.length > MAX_ITEMS_PER_INVOCATION) throw new Error(`at most ${MAX_ITEMS_PER_INVOCATION} audits per invocation`);
  const concurrency = Math.max(1, Math.min(DISCOVERY_INPLACE_MAX_CONCURRENCY, Number(valueAfter("--concurrency") || 2)));
  console.log(`RUN_SPEND_BEFORE ${JSON.stringify(await readDiscoveryInPlaceRunSpend(runId))}`);

  const queue = [...eligible];
  let stopped = false;
  const worker = async () => {
    while (queue.length > 0 && !stopped) {
      const auditId = queue.shift()!;
      const spend = await readDiscoveryInPlaceRunSpend(runId);
      if (spend.spentUsd + WORST_CASE_ITEM_USD * concurrency > spend.maxTotalUsd) {
        stopped = true;
        console.log(`STOP run budget headroom too low ${JSON.stringify(spend)}`);
        break;
      }
      const startedAt = Date.now();
      let result;
      try {
        result = await regenerateDiscoveryReportInPlace({ runId, auditId });
      } catch (error: any) {
        console.log(`RESULT ${JSON.stringify({ auditId, ok: false, error: String(error?.message || error).slice(0, 2000) })}`);
        continue;
      }
      const { backup, ...summary } = result;
      if (backup) {
        emit(`BACKUP:${auditId}`, JSON.stringify({
          auditId,
          backupId: result.backupId,
          runId,
          reportDeliveryStatus: result.status,
          reportSentAt: result.reportSentAt,
          artifactHash: result.previousArtifactHash,
          narrative_report: backup.narrativeReport,
          report_txt: backup.reportTxt,
          report_html: backup.reportHtml,
          scores: backup.scores,
        }));
      }
      console.log(`RESULT ${JSON.stringify({ ...summary, ms: Date.now() - startedAt })}`);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`RUN_SPEND_AFTER ${JSON.stringify(await readDiscoveryInPlaceRunSpend(runId))}`);
}

main()
  .catch((error) => {
    console.log(`FATAL ${String(error?.message || error).slice(0, 4000)}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end().catch(() => {}));
