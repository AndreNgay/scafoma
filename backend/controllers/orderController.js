import { pool } from "../libs/database.js";

const makeImageDataUrl = (imageBuffer, mime = "jpeg") => {
  if (!imageBuffer) return null;
  const base64 = Buffer.from(imageBuffer).toString("base64");
  return `data:image/${mime};base64,${base64}`;
};

// ==========================
// Get orders for a concessionaire
// ==========================
export const getOrdersByConcessionaireId = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT o.*, 
              u.first_name, u.last_name, u.email, 
              c.concession_name
       FROM tblorder o
       JOIN tbluser u ON o.customer_id = u.id
       JOIN tblconcession c ON o.concession_id = c.id
       WHERE c.concessionaire_id = $1
       ORDER BY o.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

// ==========================
// Get orders for a customer
// ==========================
export const getOrdersByCustomerId = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT o.*, 
              c.concession_name, caf.cafeteria_name
       FROM tblorder o
       JOIN tblconcession c ON o.concession_id = c.id
       JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
       WHERE o.customer_id = $1
       ORDER BY o.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching customer orders:", err);
    res.status(500).json({ error: "Failed to fetch customer orders" });
  }
};

// ==========================
// Update order status
// ==========================
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { order_status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tblorder 
       SET order_status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [order_status, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Order not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
};

export const updateOrderTotal = async (req, res) => {
  const { id } = req.params; // order_id
  try {
    const query = `
      UPDATE tblorder
      SET total_price = (
        SELECT COALESCE(SUM(od.total_price + COALESCE(v.total_variations, 0)), 0)
        FROM tblorderdetail od
        LEFT JOIN (
          SELECT oiv.order_detail_id, SUM(iv.additional_price) AS total_variations
          FROM tblorderitemvariation oiv
          JOIN tblitemvariation iv ON oiv.variation_id = iv.id
          GROUP BY oiv.order_detail_id
        ) v ON od.id = v.order_detail_id
        WHERE od.order_id = $1
      ),
      updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating order total:", err);
    res.status(500).json({ error: "Failed to update order total" });
  }
};


// ==========================
// Upload GCASH payment proof
// ==========================
export const updatePaymentProof = async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const result = await pool.query(
      `UPDATE tblorder 
       SET payment_proof = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [file.buffer, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Order not found" });

    const order = result.rows[0];
    order.payment_proof = makeImageDataUrl(order.payment_proof);

    res.json(order);
  } catch (err) {
    console.error("Error uploading payment proof:", err);
    res.status(500).json({ error: "Failed to upload payment proof" });
  }
};

// ==========================
// Add a new order
// ==========================
export const addOrder = async (req, res) => {
  try {
    const customer_id = req.user?.id;
    const { concession_id, total_price = 0, status = "pending", note = null } = req.body;

    if (!customer_id) {
      return res.status(400).json({ message: "Customer ID missing (not logged in)" });
    }

    const query = `
      INSERT INTO tblorder (customer_id, concession_id, total_price, order_status, note, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *;
    `;
    const values = [customer_id, concession_id, total_price, status, note];
    const result = await pool.query(query, values);

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding order:", err);
    return res.status(500).json({ message: "Server error while adding order" });
  }
};



// ==========================
// Delete an order
// ==========================
export const deleteOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM tblorder WHERE id = $1 RETURNING *`, [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ error: "Failed to delete order" });
  }
};
