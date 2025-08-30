import { pool } from "../libs/database.js";

// Get orders for a specific concessionaire
export const getOrdersByConcessionaire = async (req, res) => {
  try {
    const concessionaireId = req.user.id; // from JWT middleware

    const query = `
      SELECT 
        o.id,
        o.status,
        o.created_at,
        o.quantity,
        o.total_amount,
        u.first_name,
        u.last_name,
        mi.item_name,
        c.concession_name
      FROM tblorder o
      JOIN tbluser u ON o.customer_id = u.id
      JOIN tblmenuitem mi ON o.menu_item_id = mi.id
      JOIN tblconcession c ON o.concession_id = c.id
      WHERE o.concessionaire_id = $1
      ORDER BY o.created_at DESC;
    `;

    const result = await pool.query(query, [concessionaireId]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Server error" });
  }
};
