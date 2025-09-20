import { pool } from "../libs/database.js";

// Fetch dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const totalUsersRes = await pool.query(`SELECT COUNT(*) FROM tbluser`);
    const totalCafeteriasRes = await pool.query(`SELECT COUNT(*) FROM tblcafeteria`);
    const totalConcessionsRes = await pool.query(`SELECT COUNT(*) FROM tblconcession`);
    const totalMenuItemsRes = await pool.query(`SELECT COUNT(*) FROM tblmenuitem`);
    
    const ordersRes = await pool.query(`
      SELECT order_status AS status, COUNT(*) AS count
      FROM tblorder
      GROUP BY order_status
    `);

    res.json({
      totalUsers: Number(totalUsersRes.rows[0].count),
      totalCafeterias: Number(totalCafeteriasRes.rows[0].count),
      totalConcessions: Number(totalConcessionsRes.rows[0].count),
      totalMenuItems: Number(totalMenuItemsRes.rows[0].count),
      ordersByStatus: ordersRes.rows.map(r => ({
        status: r.status,
        count: Number(r.count)
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
