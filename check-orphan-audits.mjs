import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://apexlabs_user:2qxEKBpe8afjZaWPEUOQIR5idjrNOLQi@dpg-d6ip5hlm5p6s73ab2p4g-a.oregon-postgres.render.com/apexlabs_db',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  console.log('🔍 Vérification audits orphelins...\n');

  // Orders avec audit_id mais audit n'existe pas
  const result = await pool.query(`
    SELECT
      o.id,
      o.email,
      o.product_type,
      o.audit_id,
      o.created_at
    FROM orders o
    LEFT JOIN audits a ON o.audit_id = a.id
    WHERE o.status = 'paid'
      AND o.audit_id IS NOT NULL
      AND a.id IS NULL
      AND o.product_type IN ('GRATUIT', 'PREMIUM', 'ELITE')
      AND o.created_at >= '2026-03-17'
    ORDER BY o.created_at DESC
    LIMIT 10
  `);

  console.log(`🔴 Commandes avec audit_id mais audit supprimé: ${result.rows.length}\n`);

  if (result.rows.length > 0) {
    console.log('Exemples:');
    result.rows.forEach(r => {
      console.log(`  - ${r.email} (${r.product_type}) - audit_id: ${r.audit_id}`);
    });
  }

  await pool.end();
}

check().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
