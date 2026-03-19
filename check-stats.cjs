const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://apexlabs_user:2qxEKBpe8afjZaWPEUOQIR5idjrNOLQi@dpg-d6ip5hlm5p6s73ab2p4g-a.frankfurt-postgres.render.com:5432/apexlabs_db',
  ssl: { rejectUnauthorized: false }
});

async function getStats() {
  try {
    // Orders stats
    const ordersStats = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
        MAX(created_at) as last_order_date,
        MIN(created_at) as first_order_date
      FROM orders
    `);

    console.log('=== COMMANDES ===');
    console.log(ordersStats.rows[0]);
    console.log('');

    // Recent orders
    const recentOrders = await pool.query(`
      SELECT
        email,
        type,
        status,
        amount,
        created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('=== 10 DERNIÈRES COMMANDES ===');
    console.table(recentOrders.rows);
    console.log('');

    // Audits stats
    const auditsStats = await pool.query(`
      SELECT
        COUNT(*) as total_audits,
        COUNT(CASE WHEN type = 'ANABOLIC' THEN 1 END) as anabolic_audits,
        COUNT(CASE WHEN type = 'ULTIMATE' THEN 1 END) as ultimate_audits,
        COUNT(CASE WHEN report_delivery_status = 'SENT' THEN 1 END) as sent_reports,
        COUNT(CASE WHEN report_delivery_status = 'SCHEDULED' THEN 1 END) as scheduled_reports,
        MAX(created_at) as last_audit_date
      FROM audits
    `);

    console.log('=== AUDITS ===');
    console.log(auditsStats.rows[0]);
    console.log('');

    // Blood reports stats
    const bloodStats = await pool.query(`
      SELECT
        COUNT(*) as total_blood_reports,
        COUNT(CASE WHEN delivery_status = 'SENT' THEN 1 END) as sent_reports,
        COUNT(CASE WHEN delivery_status = 'SCHEDULED' THEN 1 END) as scheduled_reports,
        COUNT(CASE WHEN delivery_status = 'PROCESSING' THEN 1 END) as processing_reports,
        MAX(created_at) as last_report_date
      FROM blood_reports
    `);

    console.log('=== BLOOD REPORTS ===');
    console.log(bloodStats.rows[0]);
    console.log('');

    // Products breakdown
    const productsStats = await pool.query(`
      SELECT
        type,
        COUNT(*) as count,
        SUM(amount) as revenue
      FROM orders
      WHERE status = 'completed'
      GROUP BY type
      ORDER BY count DESC
    `);

    console.log('=== RÉPARTITION PRODUITS ===');
    console.table(productsStats.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

getStats();
