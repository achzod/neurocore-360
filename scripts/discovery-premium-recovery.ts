/**
 * Deliberately staged Discovery recovery tool.
 *
 * Read-only classifier (default):
 *   tsx scripts/discovery-premium-recovery.ts --dry-run [--expected-id UUID]
 *
 * Generation and delivery are separate, explicit operations. Delivery calls
 * the canonical authenticated server endpoint; this script is never an email
 * writer and cannot bypass its gate, kill switch, CAS or tracking dedup.
 */
import { pool } from "../server/db";
import {
  evaluateCanonicalDiscoveryArtifacts,
  resolveCanonicalDiscoveryArtifacts,
} from "../server/discoveryDeliveryGate";

const args = new Set(process.argv.slice(2));
const valueAfter = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const expectedId = valueAfter("--expected-id");
const generateOnly = args.has("--generate-only");
const deliverOnly = args.has("--deliver-only");
const requirePremium = args.has("--require-premium");
const baseUrl = String(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
const adminKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY;

if (generateOnly && deliverOnly) throw new Error("Choose exactly one staged operation");
if ((generateOnly || deliverOnly) && !expectedId) throw new Error("--expected-id is mandatory for writes");

async function classify(id?: string) {
  const result = await pool.query(
    `SELECT id, email, type, report_delivery_status, report_sent_at,
            narrative_report, report_txt, report_html
       FROM audits
      WHERE type = 'GRATUIT'
        AND ($1::text IS NULL OR id::text = $1)
      ORDER BY created_at DESC
      LIMIT 500`,
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
      sentAt: row.report_sent_at,
      premium: gate.ok,
      errors: gate.errors,
      txtChars: canonical.txt.length,
      htmlChars: canonical.html.length,
    };
  });
}

async function canonicalPost(path: string) {
  if (!baseUrl || !adminKey) throw new Error("APP_URL/RENDER_EXTERNAL_URL and ADMIN_SECRET/ADMIN_KEY are required");
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-key": adminKey },
    body: JSON.stringify(expectedId ? { auditId: expectedId } : {}),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Canonical endpoint ${response.status}: ${body.slice(0, 1000)}`);
  console.log(body);
}

try {
  if (!generateOnly && !deliverOnly) {
    console.log(JSON.stringify(await classify(expectedId), null, 2));
  } else if (generateOnly) {
    const rows = await classify(expectedId);
    const candidate = rows[0];
    if (!candidate || candidate.id !== expectedId) throw new Error("Expected audit not found");
    if (candidate.sentAt || candidate.status === "SENT") {
      throw new Error("Generation-only refuses an audit that was already delivered");
    }
    await canonicalPost(`/api/audit/${encodeURIComponent(expectedId!)}/regenerate`);
  } else {
    if (!requirePremium) throw new Error("--deliver-only requires --require-premium");
    const rows = await classify(expectedId);
    const candidate = rows[0];
    if (!candidate || candidate.id !== expectedId || !candidate.premium) {
      throw new Error(`Expected audit is absent or not premium: ${JSON.stringify(candidate || null)}`);
    }
    if (candidate.sentAt || candidate.status === "SENT") {
      console.log(JSON.stringify({ id: expectedId, skipped: "already_sent" }));
    } else if (!['READY', 'SCHEDULED'].includes(candidate.status)) {
      throw new Error(`Expected audit is not deliverable from status ${candidate.status}`);
    } else {
      await canonicalPost("/api/admin/force-send-email");
    }
  }
} finally {
  await pool.end();
}
