// Quick script to check REAL missing audits (only clients since launch 2026-03-17)
import "dotenv/config";
import { pool } from "../db.js";

async function checkRealGap() {
  console.log("🔍 Vérification gap RÉEL (clients uniquement, depuis 17 mars 2026)...\n");

  // Total paid orders (real clients only)
  const totalPaid = await pool.query(`
    SELECT COUNT(*) as count
    FROM orders
    WHERE status = 'paid'
      AND product_type IN ('GRATUIT', 'PREMIUM', 'ELITE')
      AND created_at >= '2026-03-17'
  `);

  // Orders WITHOUT audit
  const missing = await pool.query(`
    SELECT COUNT(*) as count
    FROM orders
    WHERE status = 'paid'
      AND audit_id IS NULL
      AND product_type IN ('GRATUIT', 'PREMIUM', 'ELITE')
      AND created_at >= '2026-03-17'
  `);

  // Orders WITH audit
  const withAudit = await pool.query(`
    SELECT COUNT(*) as count
    FROM orders
    WHERE status = 'paid'
      AND audit_id IS NOT NULL
      AND product_type IN ('GRATUIT', 'PREMIUM', 'ELITE')
      AND created_at >= '2026-03-17'
  `);

  // Total audits created since launch
  const totalAudits = await pool.query(`
    SELECT COUNT(*) as count
    FROM audits
    WHERE created_at >= '2026-03-17'
  `);

  // Reports sent
  const sent = await pool.query(`
    SELECT COUNT(*) as count
    FROM audits
    WHERE created_at >= '2026-03-17'
      AND report_delivery_status = 'SENT'
  `);

  const totalPaidCount = parseInt(totalPaid.rows[0].count);
  const missingCount = parseInt(missing.rows[0].count);
  const withAuditCount = parseInt(withAudit.rows[0].count);
  const totalAuditsCount = parseInt(totalAudits.rows[0].count);
  const sentCount = parseInt(sent.rows[0].count);

  console.log("📊 STATISTIQUES RÉELLES (depuis 17 mars 2026):");
  console.log("─".repeat(50));
  console.log(`💳 Total commandes payées:        ${totalPaidCount}`);
  console.log(`✅ Commandes avec audit:          ${withAuditCount}`);
  console.log(`❌ Commandes SANS audit:          ${missingCount}`);
  console.log();
  console.log(`📝 Total audits créés:            ${totalAuditsCount}`);
  console.log(`📧 Rapports envoyés (SENT):       ${sentCount}`);
  console.log();
  console.log(`🔴 GAP (audits manquants):        ${missingCount}`);
  console.log(`📈 Taux de livraison:             ${((sentCount / totalPaidCount) * 100).toFixed(1)}%`);
  console.log(`🎯 Taux création audits:          ${((withAuditCount / totalPaidCount) * 100).toFixed(1)}%`);
  console.log("─".repeat(50));

  if (missingCount > 0) {
    console.log(`\n⚠️  ${missingCount} clients réels attendent leur rapport !`);
    console.log("👉 Lance la réconciliation via /api/admin/reconcile-missing-audits");
  } else {
    console.log("\n✅ Tous les clients ont leur audit ! Nice bro !");
  }

  await pool.end();
}

checkRealGap().catch(err => {
  console.error("ERREUR:", err);
  process.exit(1);
});
