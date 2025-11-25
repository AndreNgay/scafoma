import { pool } from "../libs/database.js";

// ==========================
// Get variations by order detail id
// ==========================
export const getOrderItemVariationsById = async (req, res) => {
  const { orderDetailId } = req.params;
  try {
    const result = await pool.query(
      `SELECT oiv.id, oiv.order_detail_id, oiv.variation_id, oiv.quantity,
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
  const { order_detail_id, variation_id, quantity } = req.body;
  if (!order_detail_id || !variation_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const qty = Number.isFinite(Number(quantity)) ? Number(quantity) : 1;

    // Ensure the selected variation still exists and is available
    const variationCheck = await pool.query(
      `SELECT variation_name, available FROM tblitemvariation WHERE id = $1`,
      [variation_id]
    );

    if (variationCheck.rowCount === 0) {
      return res.status(400).json({
        error: "Option no longer available",
        message: "One of the options you selected is no longer available for this item. Please review your choices and try again.",
      });
    }

    const variationRow = variationCheck.rows[0];
    if (variationRow.available === false) {
      return res.status(400).json({
        error: "Option unavailable",
        message: `The option "${variationRow.variation_name}" is no longer available for this item. Please choose a different option.`,
      });
    }

    // Check if same (order_detail_id, variation_id) already exists
    const exists = await pool.query(
      `SELECT id, COALESCE(quantity, 1) AS quantity
       FROM tblorderitemvariation
       WHERE order_detail_id = $1 AND variation_id = $2
       LIMIT 1`,
      [order_detail_id, variation_id]
    );

    if (exists.rowCount > 0) {
      // Increment existing row's quantity
      const updated = await pool.query(
        `UPDATE tblorderitemvariation
         SET quantity = COALESCE(quantity, 1) + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [qty, exists.rows[0].id]
      );
      return res.status(200).json(updated.rows[0]);
    }

    // Otherwise insert new row
    const inserted = await pool.query(
      `INSERT INTO tblorderitemvariation (order_detail_id, variation_id, quantity)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [order_detail_id, variation_id, qty]
    );
    return res.status(201).json(inserted.rows[0]);
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
  const { variation_id, quantity } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tblorderitemvariation
       SET variation_id = COALESCE($1, variation_id),
           quantity = COALESCE($2, quantity),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [variation_id, quantity, id]
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
