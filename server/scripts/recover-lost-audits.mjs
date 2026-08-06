import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://apexlabs_user:2qxEKBpe8afjZaWPEUOQIR5idjrNOLQi@dpg-d6ip5hlm5p6s73ab2p4g-a.oregon-postgres.render.com/apexlabs_db',
  ssl: { rejectUnauthorized: false }
});

async function recoverLostAudits() {
  console.log('🔍 RÉCUPÉRATION DES 146 AUDITS PERDUS...\n');

  // Get all orders with audit_id but no audit in audits table
  const ordersResult = await pool.query(`
    SELECT
      o.id as order_id,
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
    ORDER BY o.created_at ASC
  `);

  const missingOrders = ordersResult.rows;
  console.log(`📊 Total commandes avec audits manquants: ${missingOrders.length}\n`);

  if (missingOrders.length === 0) {
    console.log('✅ Aucun audit manquant !');
    await pool.end();
    return;
  }

  let recovered = 0;
  let noData = 0;
  let needPhotos = 0;
  let errors = [];

  for (const order of missingOrders) {
    // Check if questionnaire data still exists
    const progressResult = await pool.query(
      `SELECT responses FROM questionnaire_progress WHERE LOWER(email) = LOWER($1)`,
      [order.email]
    );

    if (progressResult.rows.length === 0) {
      console.log(`⚠️  ${order.email} - Pas de données questionnaire`);
      noData++;
      errors.push({
        email: order.email,
        orderId: order.order_id,
        reason: 'NO_QUESTIONNAIRE_DATA'
      });
      continue;
    }

    let responses = progressResult.rows[0].responses;
    if (typeof responses === 'string') {
      try { responses = JSON.parse(responses); } catch { responses = null; }
    }

    if (!responses || Object.keys(responses).length === 0) {
      console.log(`⚠️  ${order.email} - Données questionnaire vides`);
      noData++;
      errors.push({
        email: order.email,
        orderId: order.order_id,
        reason: 'EMPTY_QUESTIONNAIRE_DATA'
      });
      continue;
    }

    // Check for 3 photos if ELITE
    if (order.product_type === 'ELITE') {
      const photoVariants = [
        ['photoFront', 'photo-front', 'photoFace'],
        ['photoSide', 'photo-side', 'photoProfile'],
        ['photoBack', 'photo-back'],
      ];
      const hasPhotos = photoVariants
        .map((keys) => keys.map((key) => responses[key]).find((value) => typeof value === 'string' && value.length > 10))
        .filter((value) => typeof value === 'string').length >= 3;

      if (!hasPhotos) {
        console.log(`📸 ${order.email} - Photos manquantes (Ultimate Scan)`);
        needPhotos++;
        errors.push({
          email: order.email,
          orderId: order.order_id,
          reason: 'NEED_3_PHOTOS'
        });
        continue;
      }
    }

    try {
      // Recreate the audit with the ORIGINAL audit_id from the order!
      const insertResult = await pool.query(`
        INSERT INTO audits (id, user_id, type, email, responses, created_at, updated_at, report_delivery_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `, [
        order.audit_id, // Use the original audit_id!
        '',
        order.product_type,
        order.email,
        JSON.stringify(responses),
        order.created_at,
        new Date(),
        'PENDING'
      ]);

      if (insertResult.rows.length > 0) {
        console.log(`✅ ${order.email} - Audit ${order.audit_id} recréé !`);
        recovered++;

        // Clean up questionnaire_progress
        await pool.query(`DELETE FROM questionnaire_progress WHERE LOWER(email) = LOWER($1)`, [order.email]);
      } else {
        console.log(`⚠️  ${order.email} - Audit ${order.audit_id} déjà existant (skip)`);
      }

    } catch (err) {
      console.error(`❌ ${order.email} - Erreur:`, err.message);
      errors.push({
        email: order.email,
        orderId: order.order_id,
        reason: err.message
      });
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 RÉSULTAT FINAL:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Récupérés: ${recovered}`);
  console.log(`⚠️  Sans données: ${noData}`);
  console.log(`📸 Photos manquantes: ${needPhotos}`);
  console.log(`❌ Erreurs: ${errors.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (errors.length > 0) {
    console.log('Détails erreurs (10 premiers):');
    errors.slice(0, 10).forEach(e => {
      console.log(`  - ${e.email}: ${e.reason}`);
    });
  }

  await pool.end();
}

recoverLostAudits().catch(err => {
  console.error('ERREUR FATALE:', err);
  process.exit(1);
});
