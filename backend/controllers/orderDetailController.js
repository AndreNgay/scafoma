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
    // Recalculate order total after insert
    await pool.query(
      `UPDATE tblorder
       SET total_price = (
         SELECT COALESCE(SUM(od.total_price), 0)
         FROM tblorderdetail od
         WHERE od.order_id = $1
       ),
       updated_at = NOW()
       WHERE id = $1`,
      [order_id]
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
    // Get order_id to recalc later
    const pre = await pool.query(`SELECT order_id FROM tblorderdetail WHERE id = $1`, [id]);
    const orderId = pre.rows[0]?.order_id;
    const result = await pool.query(
      `UPDATE tblorderdetail
       SET quantity = $1, item_price = $2, total_price = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [quantity, item_price, total_price, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Order detail not found" });
    if (orderId) {
      await pool.query(
        `UPDATE tblorder
         SET total_price = (
           SELECT COALESCE(SUM(od.total_price), 0)
           FROM tblorderdetail od
           WHERE od.order_id = $1
         ),
         updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      );
    }
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
  const { id } = req.params; // order_detail_id
  try {
    // Get order_id before deleting
    const pre = await pool.query(`SELECT order_id FROM tblorderdetail WHERE id = $1`, [id]);
    const orderId = pre.rows[0]?.order_id;
    const result = await pool.query(
      `DELETE FROM tblorderdetail WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Order detail not found" });
    if (orderId) {
      await pool.query(
        `UPDATE tblorder
         SET total_price = (
           SELECT COALESCE(SUM(od.total_price), 0)
           FROM tblorderdetail od
           WHERE od.order_id = $1
         ),
         updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      );
    }
    res.json({ message: "Item removed from cart" });
  } catch (err) {
    console.error("Error deleting order detail:", err);
    res.status(500).json({ error: "Failed to remove item" });
  }
};


export const updateOrderDetailQuantity = async (req, res) => {
  const { orderDetailId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: "Quantity must be at least 1" });
  }

  try {
    // Fetch base price of this order detail
    const result = await pool.query(
      `
      SELECT od.id AS order_detail_id, od.item_price, mi.price AS base_price
      FROM tblorderdetail od
      JOIN tblmenuitem mi ON od.item_id = mi.id
      WHERE od.id = $1
      `,
      [orderDetailId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order detail not found" });
    }

    const { base_price } = result.rows[0];

    const itemPrice = Number(base_price);
    const totalPrice = itemPrice * quantity;

    // Update order detail with new qty + recomputed totals
    await pool.query(
      `
      UPDATE tblorderdetail
      SET quantity = $1,
          item_price = $2,
          total_price = $3,
          updated_at = NOW()
      WHERE id = $4
      `,
      [quantity, itemPrice, totalPrice, orderDetailId]
    );

    // Recalculate parent order total
    await pool.query(
      `UPDATE tblorder
       SET total_price = (
         SELECT COALESCE(SUM(od.total_price), 0)
         FROM tblorderdetail od
         WHERE od.order_id = (SELECT order_id FROM tblorderdetail WHERE id = $1)
       ),
       updated_at = NOW()
       WHERE id = (SELECT order_id FROM tblorderdetail WHERE id = $1)`,
      [orderDetailId]
    );

    res.json({ message: "Quantity updated successfully" });
  } catch (err) {
    console.error("Error updating order detail:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================
// Aggregations: Most ordered items (overall)
// ==========================
export const getMostOrderedItems = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await pool.query(
      `SELECT mi.id, mi.item_name, mi.price, mi.category, mi.image,
              SUM(od.quantity) AS total_qty,
              c.concession_name, caf.cafeteria_name
       FROM tblorderdetail od
       JOIN tblmenuitem mi ON od.item_id = mi.id
       JOIN tblconcession c ON mi.concession_id = c.id
       JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
       GROUP BY mi.id, c.concession_name, caf.cafeteria_name
       ORDER BY total_qty DESC
       LIMIT $1`,
      [limit]
    );

    const items = result.rows.map(r => ({
      id: r.id,
      item_name: r.item_name,
      price: Number(r.price),
      category: r.category,
      image_url: r.image ? `data:image/jpeg;base64,${r.image.toString("base64")}` : null,
      total_qty: Number(r.total_qty),
      concession_name: r.concession_name,
      cafeteria_name: r.cafeteria_name,
    }));

    res.json({ status: "success", data: items });
  } catch (err) {
    console.error("Error fetching most ordered items:", err);
    res.status(500).json({ status: "failed", message: "Server error" });
  }
};

// ==========================
// Aggregations: Trending items (current week)
// ==========================
export const getTrendingItemsThisWeek = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await pool.query(
      `SELECT mi.id, mi.item_name, mi.price, mi.category, mi.image,
              SUM(od.quantity) AS total_qty,
              c.concession_name, caf.cafeteria_name
       FROM tblorderdetail od
       JOIN tblorder o ON od.order_id = o.id
       JOIN tblmenuitem mi ON od.item_id = mi.id
       JOIN tblconcession c ON mi.concession_id = c.id
       JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
       WHERE date_trunc('week', o.created_at) = date_trunc('week', NOW())
       GROUP BY mi.id, c.concession_name, caf.cafeteria_name
       ORDER BY total_qty DESC
       LIMIT $1`,
      [limit]
    );

    const items = result.rows.map(r => ({
      id: r.id,
      item_name: r.item_name,
      price: Number(r.price),
      category: r.category,
      image_url: r.image ? `data:image/jpeg;base64,${r.image.toString("base64")}` : null,
      total_qty: Number(r.total_qty),
      concession_name: r.concession_name,
      cafeteria_name: r.cafeteria_name,
    }));

    res.json({ status: "success", data: items });
  } catch (err) {
    console.error("Error fetching trending items:", err);
    res.status(500).json({ status: "failed", message: "Server error" });
  }
};

// ==========================
// Personalized: Recent items for a user (most recent first)
// ==========================
export const getRecentItemsByUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit) || 10;
    if (!userId) return res.status(400).json({ status: "failed", message: "userId required" });

    const result = await pool.query(
      `SELECT od.item_id AS id,
              mi.item_name,
              mi.price,
              mi.category,
              mi.image,
              c.concession_name,
              caf.cafeteria_name,
              MAX(o.created_at) AS last_ordered_at
       FROM tblorder o
       JOIN tblorderdetail od ON od.order_id = o.id
       JOIN tblmenuitem mi ON mi.id = od.item_id
       JOIN tblconcession c ON mi.concession_id = c.id
       JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
       WHERE o.customer_id = $1 AND o.in_cart = FALSE
       GROUP BY od.item_id, mi.item_name, mi.price, mi.category, mi.image, c.concession_name, caf.cafeteria_name
       ORDER BY last_ordered_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    const items = result.rows.map(r => ({
      id: r.id,
      item_name: r.item_name,
      price: Number(r.price),
      category: r.category,
      image_url: r.image ? `data:image/jpeg;base64,${r.image.toString("base64")}` : null,
      concession_name: r.concession_name,
      cafeteria_name: r.cafeteria_name,
      last_ordered_at: r.last_ordered_at,
    }));

    res.json({ status: "success", data: items });
  } catch (err) {
    console.error("Error fetching recent items by user:", err);
    res.status(500).json({ status: "failed", message: "Server error" });
  }
};