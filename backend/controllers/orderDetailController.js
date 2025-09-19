import { pool } from "../libs/database.js";

// ==========================
// Get order details by order ID
// ==========================
export const getOrderDetailsById = async (req, res) => {
  const { id } = req.params;
  try {
    const orderRes = await pool.query(
      `SELECT * FROM tblorder WHERE id = $1`, [id]
    );
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    const order = orderRes.rows[0];

    const detailsRes = await pool.query(
      `SELECT d.*, m.item_name
       FROM tblorderdetail d
       JOIN tblmenuitem m ON d.item_id = m.id
       WHERE d.order_id = $1`, [id]
    );
    order.items = detailsRes.rows;

    for (const item of order.items) {
      const varsRes = await pool.query(
        `SELECT v.*
         FROM tblorderitemvariation oiv
         JOIN tblitemvariation v ON oiv.variation_id = v.id
         WHERE oiv.order_detail_id = $1`, [item.id]
      );
      item.variations = varsRes.rows;
    }

    res.json(order);
  } catch (err) {
    console.error("Error fetching order details:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// ==========================
// Add order detail
// ==========================
export const addOrderDetail = async (req, res) => {
  const { order_id, item_id, quantity, item_price, total_price, note } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tblorderdetail (order_id, item_id, quantity, item_price, total_price, note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [order_id, item_id, quantity, item_price, total_price, note]
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
