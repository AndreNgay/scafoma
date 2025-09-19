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

    const orders = result.rows.map(order => {
      if (order.payment_proof) {
        order.payment_proof = makeImageDataUrl(order.payment_proof);
      }
      return order;
    });

    res.json(orders);
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
  const { customer_id, concession_id, status, total_price, in_cart } = req.body;

  try {
    // 🔹 1. Check if an in-cart order already exists for this customer + concession
    const existing = await pool.query(
      `SELECT * FROM tblorder 
       WHERE customer_id = $1 AND concession_id = $2 AND in_cart = TRUE
       LIMIT 1`,
      [customer_id, concession_id]
    );

    if (existing.rows.length > 0) {
      // 🔹 Reuse existing order
      return res.status(200).json(existing.rows[0]);
    }

    // 🔹 2. Otherwise, create new order
    const result = await pool.query(
      `INSERT INTO tblorder (customer_id, concession_id, order_status, total_price, in_cart)
        VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [customer_id, concession_id, status, total_price, in_cart ?? false]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding order:", err);
    res.status(500).json({ error: "Failed to add order" });
  }
};


// ==========================
// Get items in cart for a customer
// ==========================
// ==========================
// Get items in cart for a customer
// ==========================
export const getCartByCustomerId = async (req, res) => {
  const { id } = req.params; // customer_id
  try {
    const query = `
      SELECT o.id AS order_id,
             o.total_price,
             od.id AS order_detail_id,
             od.quantity,
             od.total_price AS order_detail_total,
             m.item_name,
             m.price AS base_price,
             c.concession_name,
             caf.cafeteria_name,
             ARRAY_AGG(iv.variation_name) FILTER (WHERE iv.id IS NOT NULL) AS variations
      FROM tblorder o
      JOIN tblorderdetail od ON o.id = od.order_id
      JOIN tblmenuitem m ON od.item_id = m.id   -- ✅ FIXED (was tblitem)
      JOIN tblconcession c ON o.concession_id = c.id
      JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
      LEFT JOIN tblorderitemvariation oiv ON od.id = oiv.order_detail_id
      LEFT JOIN tblitemvariation iv ON oiv.variation_id = iv.id
      WHERE o.customer_id = $1 AND o.in_cart = TRUE
      GROUP BY o.id, od.id, m.item_name, m.price, c.concession_name, caf.cafeteria_name
      ORDER BY o.created_at DESC;
    `;
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
};

// ==========================
// Checkout (convert cart items to real orders)
// ==========================
export const checkoutCart = async (req, res) => {
  const { id } = req.params; // customer_id
  try {
    const result = await pool.query(
      `UPDATE tblorder
       SET in_cart = FALSE, order_status = 'pending', updated_at = NOW()
       WHERE customer_id = $1 AND in_cart = TRUE
       RETURNING *`,
      [id]
    );

    res.json({ message: "Checkout successful", orders: result.rows });
  } catch (err) {
    console.error("Error during checkout:", err);
    res.status(500).json({ error: "Checkout failed" });
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
