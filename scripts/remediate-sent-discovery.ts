/** Safe two-stage remediation for already delivered fallback Discovery reports.
 * Default mode is read-only. This script never sends email directly. */
import { pool } from "../server/db";
import {
  discoveryArtifactHash,
  regenerateSentDiscoveryInPlace,
} from "../server/discoverySentRemediation";
import {
  evaluateCanonicalDiscoveryArtifacts,
  resolveCanonicalDiscoveryArtifacts,
} from "../server/discoveryDeliveryGate";

const argv = process.argv.slice(2);
const args = new Set(argv);
const valueAfter = (flag: string) => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};
const auditId = valueAfter("--expected-id");
const expectedPreviousFallbackHash = valueAfter("--expected-fallback-hash")?.toLowerCase();
const generateOnly = args.has("--generate-only");
const notifyOnly = args.has("--notify-only");

if (generateOnly && notifyOnly) throw new Error("Choose one stage only");
if ((generateOnly || notifyOnly) && (!auditId || !expectedPreviousFallbackHash)) {
  throw new Error("--expected-id and --expected-fallback-hash are mandatory for staged actions");
}
if (generateOnly) {
  if (String(process.env.REMEDIATION_SIDE_EFFECTS_DISABLED || "").toLowerCase() !== "true") {
    throw new Error("REMEDIATION_SIDE_EFFECTS_DISABLED=true is mandatory for generate-only");
  }
  if (String(process.env.AI_COST_ALERTS_ENABLED || "").toLowerCase() !== "false") {
    throw new Error("AI_COST_ALERTS_ENABLED=false is mandatory for generate-only");
  }
  if (String(process.env.DISCOVERY_REPORT_DELIVERY_ENABLED || "").toLowerCase() === "true") {
    throw new Error("DISCOVERY_REPORT_DELIVERY_ENABLED must not be true for generate-only");
  }
  if (String(process.env.DISCOVERY_REGENERATED_NOTIFICATION_ENABLED || "").toLowerCase() === "true") {
    throw new Error("DISCOVERY_REGENERATED_NOTIFICATION_ENABLED must not be true for generate-only");
  }
}

async function classify(id?: string) {
  const result = await pool.query(
    `SELECT id, email, report_delivery_status, report_sent_at,
            narrative_report, report_txt, report_html
       FROM audits
      WHERE type = 'GRATUIT' AND report_delivery_status = 'SENT' AND report_sent_at IS NOT NULL
        AND ($1::text IS NULL OR id::text = $1)
      ORDER BY report_sent_at DESC LIMIT 500`,
    [id || null],
  );
  return result.rows.map((row) => {
    const canonical = resolveCanonicalDiscoveryArtifacts({
      narrativeReport: row.narrative_report,
      reportTxt: row.report_txt,
      reportHtml: row.report_html,
    });
    const gate = evaluateCanonicalDiscoveryArtifacts(canonical);
    return {
      id: row.id,
      email: row.email,
      status: row.report_delivery_status,
      reportSentAt: row.report_sent_at,
      artifactHash: discoveryArtifactHash(row.report_txt, row.report_html),
      premium: gate.ok,
      errors: gate.errors,
      remediation: row.narrative_report?.remediation || null,
    };
  });
}

async function notifyThroughCanonicalEndpoint() {
  const baseUrl = String(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
  const adminKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY;
  if (!baseUrl || !adminKey) throw new Error("APP_URL/RENDER_EXTERNAL_URL and ADMIN_SECRET/ADMIN_KEY are required");
  const response = await fetch(
    `${baseUrl}/api/admin/discovery/${encodeURIComponent(auditId!)}/notify-regenerated`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ expectedPreviousFallbackHash }),
    },
  );
  const body = await response.text();
  if (!response.ok) throw new Error(`Canonical notification endpoint ${response.status}: ${body.slice(0, 1000)}`);
  console.log(body);
}

try {
  if (!generateOnly && !notifyOnly) {
    console.log(JSON.stringify(await classify(auditId), null, 2));
  } else if (generateOnly) {
    const rows = await classify(auditId);
    if (rows.length !== 1 || rows[0].artifactHash !== expectedPreviousFallbackHash || rows[0].premium) {
      throw new Error(`Expected fallback state mismatch: ${JSON.stringify(rows[0] || null)}`);
    }
    console.log(JSON.stringify(await regenerateSentDiscoveryInPlace({
      auditId: auditId!,
      expectedPreviousFallbackHash: expectedPreviousFallbackHash!,
    }), null, 2));
  } else {
    const rows = await classify(auditId);
    const candidate = rows[0];
    if (
      rows.length !== 1 ||
      !candidate.premium ||
      candidate.remediation?.previousFallbackHash !== expectedPreviousFallbackHash
    ) {
      throw new Error(`Expected remediated premium state mismatch: ${JSON.stringify(candidate || null)}`);
    }
    await notifyThroughCanonicalEndpoint();
  }
} finally {
  await pool.end();
}
