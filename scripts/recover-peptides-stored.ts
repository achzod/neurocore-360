/**
 * Zero-inference Peptides recovery.
 *
 * Dry-run is the default. --apply additionally requires the exact order,
 * email, stored response id, a live official price/source pass, an active
 * delivery HOLD and the explicit confirmation token. This script imports no
 * email service and cannot send a client or admin message.
 */
import { Pool } from "pg";
import { retrieveStoredOpenAIResponseText } from "../server/openaiResponses";
import { refreshPeptauraPricingForDelivery, type PeptidesReport } from "../server/peptidesEngine";
import {
  STORED_PEPTIDES_RECOVERY_CONFIRMATION,
  buildStoredPeptidesRecoveryCandidate,
  loadStoredPeptidesRecoveryOrder,
  persistStoredPeptidesRecoveryUnderHold,
} from "../server/peptidesStoredRecovery";

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : "";
  if (!value || value.startsWith("--")) throw new Error(`Missing ${name}`);
  return value;
}

function databaseUrl(): string {
  const value = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_CONNECTION_STRING;
  if (!value || !/^postgres(?:ql)?:\/\//.test(value)) throw new Error("DATABASE_URL_REQUIRED");
  return value;
}

async function main(): Promise<void> {
  const orderId = argument("--order-id");
  const email = argument("--email").trim().toLowerCase();
  const responseId = argument("--response-id");
  const apply = process.argv.includes("--apply");
  const confirmation = apply ? argument("--confirm") : "";
  if (apply && confirmation !== STORED_PEPTIDES_RECOVERY_CONFIRMATION) {
    throw new Error(`--apply requires --confirm ${STORED_PEPTIDES_RECOVERY_CONFIRMATION}`);
  }

  const url = databaseUrl();
  const pool = new Pool({
    connectionString: url,
    ssl: /render\.com|neon\.tech/.test(url) ? { rejectUnauthorized: false } : false,
    max: 1,
  });
  try {
    const order = await loadStoredPeptidesRecoveryOrder(pool, orderId);
    if (order.email.trim().toLowerCase() !== email) throw new Error("RECOVERY_EMAIL_MISMATCH");
    const responses = order.metadata.peptidesResponses as Record<string, unknown> | undefined;
    if (!responses || Object.keys(responses).length < 20) throw new Error("RECOVERY_QUESTIONNAIRE_INCOMPLETE");
    const tier = String(order.metadata.peptidesTier || "coached");
    if (!/^(solo|coached|tracked)$/.test(tier)) throw new Error(`RECOVERY_TIER_INVALID:${tier}`);

    const stored = await retrieveStoredOpenAIResponseText(responseId);
    const candidate = await buildStoredPeptidesRecoveryCandidate({
      raw: stored.text,
      responseId,
      responses,
      tier: tier as "solo" | "coached" | "tracked",
      refreshOfficialPricing: (
        report: PeptidesReport,
        sourceResponses: Record<string, unknown>,
        sourceTier: string,
      ) => refreshPeptauraPricingForDelivery(report, sourceResponses, sourceTier),
    });
    const audit = {
      mode: apply ? "apply" : "dry-run",
      orderId,
      email,
      responseId,
      providerInferenceUsed: false,
      emailSent: false,
      hold: order.metadata.peptidesEmailHold === true || String(order.metadata.peptidesEmailHold).toLowerCase() === "true",
      ready: candidate.ready,
      validatorErrors: candidate.validation.errors,
      validatorWarnings: candidate.validation.warnings,
      safetyErrors: candidate.safetyErrors,
      peptideNames: (candidate.report.peptides || []).map((peptide) => peptide.name),
      sectionCount: candidate.report.sections?.length || 0,
      fingerprint: candidate.fingerprint,
    };
    console.log(JSON.stringify(audit, null, 2));
    if (!candidate.ready) throw new Error("RECOVERY_BLOCKED_BY_DELIVERY_GATE");
    if (!apply) {
      console.log("DRY_RUN_ONLY=true");
      return;
    }

    const client = await pool.connect();
    try {
      const persisted = await persistStoredPeptidesRecoveryUnderHold({
        client,
        orderId,
        email,
        responseId,
        confirmation,
        candidate,
        responses,
      });
      const baseUrl = String(process.env.PUBLIC_BASE_URL || "https://apexlabs.onrender.com").replace(/\/$/, "");
      console.log(JSON.stringify({
        applied: true,
        reportId: persisted.reportId,
        reportUrl: `${baseUrl}/peptides/${persisted.reportId}`,
        holdRetained: true,
        providerInferenceUsed: false,
        emailSent: false,
      }, null, 2));
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
