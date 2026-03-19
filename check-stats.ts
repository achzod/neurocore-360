import { Pool } from "pg";

const DATABASE_URL = "postgresql://apexlabs_user:2qxEKBpe8afjZaWPEUOQIR5idjrNOLQi@dpg-d6ip5hlm5p6s73ab2p4g-a.frankfurt-postgres.render.com:5432/apexlabs_db";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 10000,
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

    console.log('\n=== 📊 COMMANDES ===');
    const orders = ordersStats.rows[0];
    console.log(`Total: ${orders.total_orders}`);
    console.log(`Complétées: ${orders.completed_orders}`);
    console.log(`En attente: ${orders.pending_orders}`);
    console.log(`Revenu total: ${orders.total_revenue}€`);
    console.log(`Première commande: ${orders.first_order_date}`);
    console.log(`Dernière commande: ${orders.last_order_date}`);

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

    console.log('\n=== 🛒 10 DERNIÈRES COMMANDES ===');
    recentOrders.rows.forEach((order, i) => {
      console.log(`${i+1}. ${order.email} - ${order.type} - ${order.amount}€ - ${order.status} - ${new Date(order.created_at).toLocaleString('fr-FR')}`);
    });

    // Audits stats
    const auditsStats = await pool.query(`
      SELECT
        COUNT(*) as total_audits,
        COUNT(CASE WHEN type = 'ANABOLIC' THEN 1 END) as anabolic_audits,
        COUNT(CASE WHEN type = 'ULTIMATE' THEN 1 END) as ultimate_audits,
        COUNT(CASE WHEN report_delivery_status = 'SENT' THEN 1 END) as sent_reports,
        COUNT(CASE WHEN report_delivery_status = 'SCHEDULED' THEN 1 END) as scheduled_reports,
        COUNT(CASE WHEN report_delivery_status = 'PROCESSING' THEN 1 END) as processing_reports,
        MAX(created_at) as last_audit_date
      FROM audits
    `);

    console.log('\n=== 📋 AUDITS ===');
    const audits = auditsStats.rows[0];
    console.log(`Total: ${audits.total_audits}`);
    console.log(`Anabolic: ${audits.anabolic_audits}`);
    console.log(`Ultimate: ${audits.ultimate_audits}`);
    console.log(`Rapports envoyés: ${audits.sent_reports}`);
    console.log(`Programmés: ${audits.scheduled_reports}`);
    console.log(`En traitement: ${audits.processing_reports}`);
    console.log(`Dernier audit: ${audits.last_audit_date}`);

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

    console.log('\n=== 🩸 BLOOD REPORTS ===');
    const blood = bloodStats.rows[0];
    console.log(`Total: ${blood.total_blood_reports}`);
    console.log(`Envoyés: ${blood.sent_reports}`);
    console.log(`Programmés: ${blood.scheduled_reports}`);
    console.log(`En traitement: ${blood.processing_reports}`);
    console.log(`Dernier rapport: ${blood.last_report_date}`);

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

    console.log('\n=== 💰 RÉPARTITION PRODUITS (commandes complétées) ===');
    productsStats.rows.forEach(prod => {
      console.log(`${prod.type}: ${prod.count} commandes - ${prod.revenue}€`);
    });

    // Check for recent activity
    const recentActivity = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as orders_count
      FROM orders
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    console.log('\n=== 📅 ACTIVITÉ (30 derniers jours) ===');
    if (recentActivity.rows.length === 0) {
      console.log('Aucune commande dans les 30 derniers jours');
    } else {
      recentActivity.rows.forEach(day => {
        console.log(`${day.date}: ${day.orders_count} commande(s)`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

getStats();
