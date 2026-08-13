/** Zero-inference replacement of one already-linked Peptides report under HOLD. */
import { Pool } from "pg";
import { retrieveStoredOpenAIResponseText } from "../server/openaiResponses";
import { refreshPeptauraPricingForDelivery, type PeptidesReport } from "../server/peptidesEngine";
import { buildStoredPeptidesRecoveryCandidate, loadStoredPeptidesRecoveryOrder } from "../server/peptidesStoredRecovery";

function arg(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? process.argv[i + 1] : "";
  if (!value || value.startsWith("--")) throw new Error(`Missing ${name}`);
  return value;
}

async function main(): Promise<void> {
  const orderId = arg("--order-id");
  const email = arg("--email").trim().toLowerCase();
  const responseId = arg("--response-id");
  const reportId = arg("--report-id");
  if (arg("--confirm") !== "REPLACE_LINKED_PEPTIDES_REPORT") throw new Error("CONFIRMATION_REQUIRED");
  const connectionString = process.env.DATABASE_URL || "";
  if (!/^postgres(?:ql)?:\/\//.test(connectionString)) throw new Error("DATABASE_URL_REQUIRED");
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 1 });
  try {
    const order = await loadStoredPeptidesRecoveryOrder(pool, orderId);
    const metadata = order.metadata || {};
    if (order.email.trim().toLowerCase() !== email) throw new Error("EMAIL_MISMATCH");
    if (order.productType !== "PEPTIDES_ENGINE" || order.status !== "paid") throw new Error("ORDER_INVALID");
    if (String(metadata.peptidesReportId || "") !== reportId) throw new Error("REPORT_LINK_MISMATCH");
    if (!(metadata.peptidesEmailHold === true || String(metadata.peptidesEmailHold).toLowerCase() === "true")) throw new Error("HOLD_REQUIRED");
    const responses = metadata.peptidesResponses as Record<string, unknown> | undefined;
    if (!responses || Object.keys(responses).length < 20) throw new Error("QUESTIONNAIRE_INCOMPLETE");
    const tier = String(metadata.peptidesTier || "coached") as "solo" | "coached" | "tracked";
    const stored = await retrieveStoredOpenAIResponseText(responseId);
    const candidate = await buildStoredPeptidesRecoveryCandidate({
      raw: stored.text,
      responseId,
      responses,
      tier,
      refreshOfficialPricing: (report: PeptidesReport, sourceResponses, sourceTier) =>
        refreshPeptauraPricingForDelivery(report, sourceResponses, sourceTier),
    });
    console.log(JSON.stringify({ ready: candidate.ready, errors: candidate.validation.errors, warnings: candidate.validation.warnings, safetyErrors: candidate.safetyErrors, sectionCount: candidate.report.sections?.length || 0, providerInferenceUsed: false, emailSent: false }, null, 2));
    if (!candidate.ready) throw new Error("DELIVERY_GATE_BLOCKED");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query(`SELECT metadata FROM orders WHERE id=$1 AND lower(email)=lower($2) AND product_type='PEPTIDES_ENGINE' AND status='paid' FOR UPDATE`, [orderId, email]);
      const live = locked.rows[0]?.metadata || {};
      if (String(live.peptidesReportId || "") !== reportId || String(live.peptidesEmailHold).toLowerCase() !== "true") throw new Error("LIVE_GUARD_FAILED");
      const updated = await client.query(`UPDATE burnout_reports SET report=$1::jsonb, responses=$2::jsonb WHERE id=$3 AND email=$4 RETURNING id`, [JSON.stringify(candidate.report), JSON.stringify(responses), reportId, `peptides::${email}`]);
      if ((updated.rowCount || 0) !== 1) throw new Error("REPORT_UPDATE_CAS_FAILED");
      await client.query(`UPDATE orders SET metadata=metadata || jsonb_build_object('peptidesGenerationState','SUCCEEDED','peptidesRecoveredFromResponseId',$1::text,'peptidesRecoveryFingerprint',$2::text,'peptidesRecoveryAppliedAt',NOW()::text,'peptidesEmailHold',true), updated_at=NOW() WHERE id=$3`, [responseId, candidate.fingerprint, orderId]);
      await client.query("COMMIT");
      console.log(JSON.stringify({ applied: true, reportId, holdRetained: true, providerInferenceUsed: false, emailSent: false }));
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  } finally { await pool.end(); }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
