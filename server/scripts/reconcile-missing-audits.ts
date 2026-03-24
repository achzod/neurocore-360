// server/scripts/reconcile-missing-audits.ts
import "dotenv/config";
import { storage } from "../storage";

// Helper to check if responses have 3 photos (required for ELITE)
function hasThreePhotos(responses: Record<string, unknown>): boolean {
  const photos = [responses.photoFace, responses.photoProfile, responses.photoBack];
  return photos.filter(p => typeof p === "string" && p.length > 10).length >= 3;
}

async function reconcileMissingAudits() {
  const { pool } = await import("../db.js");

  console.log("🔍 Recherche commandes payées sans audit...");

  const result = await pool.query(`
    SELECT o.id, o.email, o.product_type, o.created_at
    FROM orders o
    WHERE o.status = 'paid'
      AND o.audit_id IS NULL
      AND o.product_type IN ('GRATUIT', 'PREMIUM', 'ELITE')
      AND o.created_at > NOW() - INTERVAL '90 days'
    ORDER BY o.created_at ASC
  `);

  console.log(`📊 Trouvé ${result.rows.length} commandes sans audit`);

  let created = 0;
  let failed = 0;
  let noData = 0;
  let needPhotos = 0;

  for (const row of result.rows) {
    const progress = await storage.getProgress(row.email);

    let responses = progress?.responses as Record<string, unknown> | string | undefined;
    if (typeof responses === "string") {
      try { responses = JSON.parse(responses); } catch { responses = undefined; }
    }

    if (!responses || Object.keys(responses).length === 0) {
      console.warn(`⚠️  Pas de données questionnaire pour ${row.email}`);
      noData++;
      continue;
    }

    // Check for 3 photos if ELITE
    if (row.product_type === "ELITE" && !hasThreePhotos(responses as Record<string, unknown>)) {
      console.warn(`⚠️  3 photos obligatoires pour Ultimate Scan: ${row.email}`);
      needPhotos++;
      continue;
    }

    try {
      // Create audit
      const audit = await storage.createAudit({
        userId: "",
        type: row.product_type,
        email: row.email,
        responses: responses as Record<string, unknown>,
      });

      // Link order to audit
      await storage.claimOrderForAudit(row.id, audit.id);

      // Clean up questionnaire progress
      await storage.deleteProgress(row.email).catch(() => {});

      console.log(`✅ Audit ${audit.id} créé pour commande ${row.id} (${row.email})`);
      created++;

    } catch (err) {
      console.error(`❌ Erreur pour commande ${row.id}:`, err);
      failed++;
    }

    // Rate limit to avoid overload
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n📈 RÉSUMÉ:`);
  console.log(`   ✅ Créés: ${created}`);
  console.log(`   ❌ Échoués: ${failed}`);
  console.log(`   ⚠️  Sans données: ${noData}`);
  console.log(`   📸 Photos manquantes (ELITE): ${needPhotos}`);
  console.log(`   📦 Total analysé: ${result.rows.length}`);
}

reconcileMissingAudits()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("ERREUR FATALE:", err);
    process.exit(1);
  });
