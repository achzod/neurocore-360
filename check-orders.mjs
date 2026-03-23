import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

// Read .env file manually
const envFile = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});
process.env.DATABASE_URL = envVars.DATABASE_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function getStats() {
  try {
    // Total orders
    const totalOrders = await pool.query(`
      SELECT COUNT(*) as total_orders,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders
      FROM orders;
    `);

    // Orders by product
    const ordersByProduct = await pool.query(`
      SELECT audit_type, COUNT(*) as count
      FROM orders
      WHERE status = 'completed'
      GROUP BY audit_type
      ORDER BY count DESC;
    `);

    // Revenue by product
    const revenueByProduct = await pool.query(`
      SELECT audit_type, SUM(amount) as revenue
      FROM orders
      WHERE status = 'completed'
      GROUP BY audit_type
      ORDER BY revenue DESC;
    `);

    // Reviews stats
    const reviewsStats = await pool.query(`
      SELECT COUNT(*) as total_reviews,
             ROUND(AVG(rating)::numeric, 2) as avg_rating
      FROM reviews
      WHERE approved = true;
    `);

    // Last 7 days orders
    const last7Days = await pool.query(`
      SELECT DATE(created_at) as order_date, COUNT(*) as orders_count
      FROM orders
      WHERE status = 'completed'
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY order_date DESC;
    `);

    // Total revenue
    const totalRevenue = await pool.query(`
      SELECT SUM(amount) as total_revenue
      FROM orders
      WHERE status = 'completed';
    `);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 ÉTAT DES LIEUX APEXLABS');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('🛒 COMMANDES:');
    console.log(`   Total commandes: ${totalOrders.rows[0].total_orders}`);
    console.log(`   Commandes complétées: ${totalOrders.rows[0].completed_orders}\n`);

    console.log('💰 REVENUS TOTAUX:');
    console.log(`   ${totalRevenue.rows[0].total_revenue || 0}€\n`);

    console.log('📦 COMMANDES PAR PRODUIT:');
    ordersByProduct.rows.forEach(row => {
      console.log(`   ${row.audit_type}: ${row.count} commandes`);
    });
    console.log('');

    console.log('💵 REVENUS PAR PRODUIT:');
    revenueByProduct.rows.forEach(row => {
      console.log(`   ${row.audit_type}: ${row.revenue}€`);
    });
    console.log('');

    console.log('⭐ AVIS:');
    console.log(`   Avis approuvés: ${reviewsStats.rows[0].total_reviews}`);
    console.log(`   Note moyenne: ${reviewsStats.rows[0].avg_rating}/5\n`);

    console.log('📅 COMMANDES DES 7 DERNIERS JOURS:');
    if (last7Days.rows.length > 0) {
      last7Days.rows.forEach(row => {
        console.log(`   ${row.order_date}: ${row.orders_count} commandes`);
      });
    } else {
      console.log('   Aucune commande dans les 7 derniers jours');
    }
    console.log('\n═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

getStats();
