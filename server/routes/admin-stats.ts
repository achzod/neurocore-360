import { Router } from "express";
import { pool } from "../db";

const router = Router();

router.get("/admin/stats", async (req, res) => {
  const { key } = req.query;

  // Check admin key
  if (key !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    // Total orders
    const totalOrders = await pool.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM orders;
    `);

    // Orders by product
    const ordersByProduct = await pool.query(`
      SELECT audit_type, COUNT(*) as count, SUM(amount) as revenue
      FROM orders
      WHERE status = 'completed'
      GROUP BY audit_type
      ORDER BY count DESC;
    `);

    // Total revenue
    const totalRevenue = await pool.query(`
      SELECT SUM(amount) as total
      FROM orders
      WHERE status = 'completed';
    `);

    // Real reviews (not hardcoded beta)
    const reviews = await pool.query(`
      SELECT COUNT(*) as total, ROUND(AVG(rating)::numeric, 2) as avg_rating
      FROM reviews
      WHERE approved = true;
    `);

    // Last 7 days
    const last7Days = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM orders
      WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC;
    `);

    res.json({
      success: true,
      orders: {
        total: parseInt(totalOrders.rows[0].total),
        completed: parseInt(totalOrders.rows[0].completed),
        byProduct: ordersByProduct.rows,
      },
      revenue: {
        total: parseFloat(totalRevenue.rows[0].total || 0),
        byProduct: ordersByProduct.rows.map(r => ({
          product: r.audit_type,
          revenue: parseFloat(r.revenue),
        })),
      },
      reviews: {
        total: parseInt(reviews.rows[0].total),
        avgRating: parseFloat(reviews.rows[0].avg_rating || 0),
      },
      last7Days: last7Days.rows,
    });
  } catch (error: any) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
