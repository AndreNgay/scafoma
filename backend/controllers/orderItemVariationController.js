import { pool } from "../libs/database.js";

// ==========================
// Get variations by order detail id
// ==========================
export const getOrderItemVariationsById = async (req, res) => {
  const { orderDetailId } = req.params;
  try {
    const result = await pool.query(
      `SELECT oiv.id, oiv.order_detail_id, oiv.variation_id,
              iv.variation_name, iv.additional_price
       FROM tblorderitemvariation oiv
       JOIN tblitemvariation iv ON oiv.variation_id = iv.id
       WHERE oiv.order_detail_id = $1`,
      [orderDetailId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching order item variations:", err);
    res.status(500).json({ error: "Failed to fetch order item variations" });
  }
};

// ==========================
// Add variation to order detail
// ==========================
export const addOrderItemVariation = async (req, res) => {
  const { order_detail_id, variation_id } = req.body;
  if (!order_detail_id || !variation_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tblorderitemvariation (order_detail_id, variation_id)
       VALUES ($1, $2)
       RETURNING *`,
      [order_detail_id, variation_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding order item variation:", err);
    res.status(500).json({ error: "Failed to add order item variation" });
  }
};

// ==========================
// Update variation
// ==========================
export const updateOrderItemVariation = async (req, res) => {
  const { id } = req.params;
  const { variation_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tblorderitemvariation
       SET variation_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [variation_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order item variation not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating order item variation:", err);
    res.status(500).json({ error: "Failed to update order item variation" });
  }
};

// ==========================
// Delete variation
// ==========================
export const deleteOrderItemVariation = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM tblorderitemvariation
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order item variation not found" });
    }

    res.json({ message: "Order item variation deleted", deleted: result.rows[0] });
  } catch (err) {
    console.error("Error deleting order item variation:", err);
    res.status(500).json({ error: "Failed to delete order item variation" });
  }
};
