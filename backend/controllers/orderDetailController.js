import { pool } from "../libs/database.js";

// ==========================
// Get order details by order ID
// ==========================
export const getOrderDetailsById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT od.*, mi.item_name, mi.image,
              json_agg(json_build_object('variation_id', iv.id, 'variation_name', iv.variation_name, 'additional_price', iv.additional_price)) AS variations
       FROM tblorderdetail od
       JOIN tblmenuitem mi ON od.item_id = mi.id
       LEFT JOIN tblorderitemvariation oiv ON od.id = oiv.order_detail_id
       LEFT JOIN tblitemvariation iv ON oiv.variation_id = iv.id
       WHERE od.order_id = $1
       GROUP BY od.id, mi.item_name, mi.image`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching order details:", err);
    res.status(500).json({ error: "Failed to fetch order details" });
  }
};

// ==========================
// Add order detail
// ==========================
export const addOrderDetail = async (req, res) => {
  const { order_id, item_id, quantity, item_price, total_price } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tblorderdetail (order_id, item_id, quantity, item_price, total_price)
      VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [order_id, item_id, quantity, item_price, total_price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding order detail:", err);
    res.status(500).json({ error: "Failed to add order detail" });
  }
};

// ==========================
// Update order detail
// ==========================
export const updateOrderDetail = async (req, res) => {
  const { id } = req.params;
  const { quantity, item_price, total_price } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tblorderdetail
       SET quantity = $1, item_price = $2, total_price = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [quantity, item_price, total_price, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Order detail not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating order detail:", err);
    res.status(500).json({ error: "Failed to update order detail" });
  }
};

// ==========================
// Delete order detail
// ==========================
export const deleteOrderDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM tblorderdetail WHERE id = $1 RETURNING *`, [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Order detail not found" });
    res.json({ message: "Order detail deleted successfully" });
  } catch (err) {
    console.error("Error deleting order detail:", err);
    res.status(500).json({ error: "Failed to delete order detail" });
  }
};
