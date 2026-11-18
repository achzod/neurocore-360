/**
 * Discovery v3 : mail "ton rapport a été mis à jour" (sendDiscoveryUpdatedEmail).
 *
 *   npx tsx scripts/send-discovery-updated.ts --ids <fichier.txt>             # DRY-RUN (défaut) : liste, exclusions, hash
 *   npx tsx scripts/send-discovery-updated.ts --ids <fichier.txt> --preview   # DRY-RUN + aperçu HTML réel du 1er destinataire (gzip+base64)
 *   DISCOVERY_UPDATED_SEND_CONFIRM=<hash> \
 *   npx tsx scripts/send-discovery-updated.ts --ids <fichier.txt> --send [--max 10]
 *
 * <fichier.txt> : un auditId par ligne, UNIQUEMENT les audits régénérés ET validés
 * (statut regenerated_validated dans regen_100.csv).
 *
 * Garde-fous :
 *  - DRY-RUN par défaut : aucun mail, aucune écriture.
 *  - --send exige DISCOVERY_UPDATED_SEND_CONFIRM = hash exact de la liste finale
 *    affichée par le dry-run (lie l'approbation à une liste précise).
 *  - Éligible seulement si : GRATUIT, SENT avec report_sent_at, rapport v3 coach_ai,
 *    gate canonique OK, id présent dans le fichier.
 *  - Exclut : désinscrits (email_unsubscribes), hard bounces et refus "Unsubscribed"
 *    du fournisseur (hard_fail dans email_tracking), adresses de test, doublons
 *    d'adresse (un seul mail par adresse : audit le plus récent), et toute adresse ou
 *    audit ayant déjà une ligne sendDiscoveryUpdatedEmail.
 *  - Idempotence : réservation par ligne email_tracking (id = trackingId) sous verrou
 *    consultatif + index unique partiel sur lower(recipient_email) pour ce type.
 *    Une réservation sans envoi confirmé n'est JAMAIS relancée automatiquement
 *    (au plus un envoi par adresse).
 *  - Date de l'offre : min(envoi + 7 jours, date imprimée dans le rapport v3) ; le mail ne
 *    promet jamais plus que le rapport. Offre du rapport déjà expirée => exclu (offre_rapport_expiree).
 *  - Un destinataire par mail, pas de BCC admin. Ne touche ni report_delivery_status,
 *    ni report_sent_at, ni aux séquences J3/J5/J7/J14/J30.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { pool } from "../server/db";
import {
  evaluateCanonicalDiscoveryArtifacts,
  resolveCanonicalDiscoveryArtifacts,
} from "../server/discoveryDeliveryGate";
import { isBlockedDiscoveryTestEmail } from "../server/discoveryBatchControl";
import { DISCOVERY_UPDATED_EMAIL_TYPE, prepareDiscoveryUpdatedEmail, sendDiscoveryUpdatedEmail } from "../server/emailService";
import { extractReportOfferUntil, parisDateIso } from "../server/discoveryOfferWindow";
import { gzipSync } from "node:zlib";

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const valueAfter = (name: string) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const idsFile = valueAfter("--ids");
const SEND = flag("--send");
const PREVIEW = flag("--preview");
const MAX = Number(valueAfter("--max") || 1000);
const BASE_URL = String(process.env.PUBLIC_BASE_URL || "https://apexlabs.achzodcoaching.com").replace(/\/$/, "");

if (!idsFile) throw new Error("--ids <fichier> obligatoire");
const allowedIds = new Set(readFileSync(idsFile, "utf8").split(/\s+/).map((s) => s.trim()).filter((s) => /^[0-9a-f-]{36}$/i.test(s)));

function parisDatePlus(days: number): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function firstNameOf(row: any): string {
  const raw = String(row.narrative_report?.clientName || row.responses?.prenom || row.responses?.firstName || "").trim();
  if (!raw || raw.length < 2 || /^profil$/i.test(raw)) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** min(envoi + 7 jours, date imprimée dans le rapport) ; null si l'offre du rapport est expirée. */
function offerUntil(report: unknown): string | null {
  const sendPlus7 = parisDatePlus(7);
  const printed = extractReportOfferUntil(report);
  const until = printed && printed < sendPlus7 ? printed : sendPlus7;
  return until >= parisDateIso() ? until : null;
}

async function buildList() {
  const res = await pool.query(
    `SELECT a.id, lower(trim(a.email)) AS email, a.created_at, a.report_delivery_status, a.report_sent_at,
            a.narrative_report, a.report_txt, a.report_html, a.responses,
            EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email) = lower(trim(a.email))) AS unsub,
            EXISTS (SELECT 1 FROM email_tracking e WHERE lower(e.recipient_email) = lower(trim(a.email))
                     AND ((coalesce(e.sendpulse_error,'') || coalesce(e.metadata::text,'')) ILIKE '%hard_fail%'
                          OR ((coalesce(e.sendpulse_error,'') || coalesce(e.metadata::text,'')) ILIKE '%555%'
                              AND (coalesce(e.sendpulse_error,'') || coalesce(e.metadata::text,'')) ILIKE '%unsubscri%'))) AS hard_bounce,
            EXISTS (SELECT 1 FROM email_tracking e WHERE e.email_type = $2
                     AND (e.audit_id = a.id OR lower(e.recipient_email) = lower(trim(a.email)))) AS already
       FROM audits a
      WHERE a.type = 'GRATUIT' AND a.id = ANY($1::text[])
      ORDER BY a.created_at DESC`,
    [[...allowedIds], DISCOVERY_UPDATED_EMAIL_TYPE],
  );
  const eligible: any[] = [];
  const excluded: Array<{ id: string; email: string; reason: string }> = [];
  const seen = new Set<string>();
  for (const row of res.rows) {
    const gq = row.narrative_report?.generationQuality;
    const gate = evaluateCanonicalDiscoveryArtifacts(resolveCanonicalDiscoveryArtifacts({
      narrativeReport: row.narrative_report, reportTxt: row.report_txt, reportHtml: row.report_html,
    }));
    const reason =
      row.report_delivery_status !== "SENT" || !row.report_sent_at ? "pas_SENT"
      : !(gq?.version === 3 && gq?.mode === "coach_ai") ? "pas_v3"
      : !gate.ok ? `gate_ko:${gate.errors.slice(0, 3).join(",")}`
      : row.unsub ? "desinscrit"
      : row.hard_bounce ? "hard_bounce_ou_refus_fournisseur"
      : isBlockedDiscoveryTestEmail(row.email) ? "adresse_test"
      : row.already ? "deja_envoye"
      : seen.has(row.email) ? "doublon_adresse"
      : "";
    const until = offerUntil(row.narrative_report);
    const finalReason = reason || (!until ? "offre_rapport_expiree" : "");
    if (finalReason) { excluded.push({ id: row.id, email: row.email, reason: finalReason }); continue; }
    seen.add(row.email);
    eligible.push({ id: row.id, email: row.email, firstName: firstNameOf(row), until });
  }
  const missing = [...allowedIds].filter((id) => !res.rows.some((r) => r.id === id));
  for (const id of missing) excluded.push({ id, email: "", reason: "audit_introuvable_ou_non_GRATUIT" });
  const listHash = createHash("sha256").update(eligible.map((e) => `${e.id}:${e.email}:${e.until}`).sort().join("\n")).digest("hex");
  return { eligible, excluded, listHash };
}

async function claim(auditId: string, email: string, until: string): Promise<string | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`discovery-updated:${email}`]);
    const dup = await client.query(
      `SELECT 1 FROM email_tracking WHERE email_type = $1 AND (audit_id = $2 OR lower(recipient_email) = $3) LIMIT 1`,
      [DISCOVERY_UPDATED_EMAIL_TYPE, auditId, email],
    );
    if ((dup.rowCount ?? 0) > 0) { await client.query("ROLLBACK"); return null; }
    const id = randomUUID();
    await client.query(
      `INSERT INTO email_tracking (id, email_type, recipient_email, audit_id, audit_type, subject, sendpulse_status, metadata, created_at, sent_at)
       VALUES ($1, $2, $3, $4, 'GRATUIT', 'claim', 'pending', $5::jsonb, NOW(), NULL)`,
      [id, DISCOVERY_UPDATED_EMAIL_TYPE, email, auditId, JSON.stringify({ trackingId: id, claim: true, until })],
    );
    await client.query("COMMIT");
    return id;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function main() {
  const { eligible, excluded, listHash } = await buildList();
  const byReason = excluded.reduce<Record<string, number>>((m, e) => { m[e.reason] = (m[e.reason] || 0) + 1; return m; }, {});
  console.log(JSON.stringify({ mode: SEND ? "SEND" : "DRY_RUN", eligible: eligible.length, excluded: excluded.length, byReason, listHash }, null, 2));
  for (const e of eligible) console.log(`ELIGIBLE ${e.id} ${e.email} ${e.firstName || "(sans prénom)"} until=${e.until}`);
  for (const e of excluded) console.log(`EXCLU ${e.id} ${e.email} ${e.reason}`);
  if (PREVIEW && eligible[0]) {
    const e = eligible[0];
    const preview = prepareDiscoveryUpdatedEmail({
      email: e.email, firstName: e.firstName, auditId: e.id, baseUrl: BASE_URL, trackingId: "preview-not-sent", until: e.until,
    });
    console.log(`PREVIEW_META ${JSON.stringify({ auditId: e.id, subject: preview.subject, until: e.until })}`);
    const encoded = gzipSync(Buffer.from(preview.html, "utf8")).toString("base64");
    const chunks = encoded.match(/.{1,3500}/g) || [];
    chunks.forEach((chunk, i) => console.log(`@@PREVIEW_HTML:${i}:${chunks.length}:${chunk}`));
  }
  if (!SEND) { console.log("DRY-RUN : aucun mail envoyé."); return; }

  if (process.env.DISCOVERY_UPDATED_SEND_CONFIRM !== listHash) {
    throw new Error("DISCOVERY_UPDATED_SEND_CONFIRM ne correspond pas au hash de la liste : envoi refusé");
  }
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uniq_email_tracking_discovery_updated
       ON email_tracking (lower(recipient_email)) WHERE email_type = '${DISCOVERY_UPDATED_EMAIL_TYPE}'`,
  );
  let sent = 0;
  for (const e of eligible.slice(0, MAX)) {
    const until = e.until;
    const trackingId = await claim(e.id, e.email, until).catch((err) => { console.log(`SKIP ${e.email} claim_error ${err.message}`); return null; });
    if (!trackingId) { console.log(`SKIP ${e.email} deja_reserve`); continue; }
    const result = await sendDiscoveryUpdatedEmail({ email: e.email, firstName: e.firstName, auditId: e.id, baseUrl: BASE_URL, trackingId, until });
    console.log(`${result.result ? "SENT" : "FAILED"} ${e.id} ${e.email} tracking=${trackingId}`);
    if (result.result) sent += 1;
    await new Promise((r) => setTimeout(r, 2500)); // limite fournisseur (30 req/min)
  }
  console.log(JSON.stringify({ sent }));
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end().catch(() => {}));
