import { pool } from "../libs/database.js";
import multer from "multer";

const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Helper: convert BYTEA image to base64 data URL
const makeImageDataUrl = (imageBuffer, mime = "jpeg") => {
  if (!imageBuffer) return null;
  const base64 = Buffer.from(imageBuffer).toString("base64");
  return `data:image/${mime};base64,${base64}`;
};

export const getOrdersByConcessionaireId = async (req, res) => {
  const { id } = req.params; // concessionaire_id
  const { page = 1, limit = 10 } = req.query;

  try {
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT o.*, 
              u.first_name, u.last_name, u.email, u.profile_image,
              c.concession_name
       FROM tblorder o
       JOIN tbluser u ON o.customer_id = u.id
       JOIN tblconcession c ON o.concession_id = c.id
       WHERE c.concessionaire_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const orders = result.rows.map((order) => ({
      ...order,
      profile_image: makeImageDataUrl(order.profile_image),
    }));

    // Get total count for frontend pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM tblorder o
       JOIN tblconcession c ON o.concession_id = c.id
       WHERE c.concessionaire_id = $1`,
      [id]
    );

    const totalOrders = parseInt(countResult.rows[0].total, 10);

    return res.status(200).json({
      page: Number(page),
      limit: Number(limit),
      total: totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ message: "Server error while fetching orders" });
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
              o.payment_method,
              c.concession_name, 
              caf.cafeteria_name,
              COALESCE(c.gcash_payment_available, FALSE) AS gcash_payment_available,
              COALESCE(c.oncounter_payment_available, FALSE) AS oncounter_payment_available
       FROM tblorder o
       JOIN tblconcession c ON o.concession_id = c.id
       JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
       WHERE o.customer_id = $1
         AND o.in_cart = FALSE   -- ✅ only checked-out orders
       ORDER BY o.created_at DESC`,
      [id]
    );

  const orders = result.rows.map(order => {
    order.payment_proof = makeImageDataUrl(order.gcash_screenshot);
    return order;
  });


    res.json(orders);
  } catch (err) {
    console.error("Error fetching customer orders:", err);
    res.status(500).json({ error: "Failed to fetch customer orders" });
  }
};


export const getOrderById = async (req, res) => {
  const { id } = req.params; // order ID

  try {
    // Get main order info with customer and concession details, including payment flags
    const orderResult = await pool.query(
      `SELECT o.*, 
              u.first_name, u.last_name, u.email, u.profile_image,
              c.concession_name, 
              caf.cafeteria_name,
              COALESCE(c.gcash_payment_available, FALSE) AS gcash_payment_available,
              COALESCE(c.oncounter_payment_available, FALSE) AS oncounter_payment_available
       FROM tblorder o
       JOIN tbluser u ON o.customer_id = u.id
       JOIN tblconcession c ON o.concession_id = c.id
       JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rowCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];

    // Convert images to base64
    order.profile_image = makeImageDataUrl(order.profile_image);
    order.gcash_screenshot = makeImageDataUrl(order.gcash_screenshot);
    order.payment_proof = order.gcash_screenshot || null;

    // Get order items
    const itemsResult = await pool.query(
      `SELECT od.*, m.item_name, m.price AS base_price
       FROM tblorderdetail od
       JOIN tblmenuitem m ON od.item_id = m.id
       WHERE od.order_id = $1`,
      [id]
    );

    const items = itemsResult.rows;

    // For each item, get variations
    for (let item of items) {
      const variationsResult = await pool.query(
        `SELECT iv.id, iv.variation_name, iv.additional_price
         FROM tblorderitemvariation oiv
         JOIN tblitemvariation iv ON oiv.variation_id = iv.id
         WHERE oiv.order_detail_id = $1`,
        [item.id]
      );
      item.variations = variationsResult.rows;
    }

    order.items = items;

    res.json(order);
  } catch (err) {
    console.error("Error fetching order by ID:", err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};



// ==========================
// Update order status
// ==========================
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { order_status, decline_reason } = req.body;
  try {
    let query, params;
    
    if (order_status === 'declined' && decline_reason) {
      // Update with decline reason
      query = `UPDATE tblorder 
               SET order_status = $1, decline_reason = $2, updated_at = NOW()
               WHERE id = $3 RETURNING *`;
      params = [order_status, decline_reason, id];
    } else {
      // Update without decline reason
      query = `UPDATE tblorder 
               SET order_status = $1, updated_at = NOW()
               WHERE id = $2 RETURNING *`;
      params = [order_status, id];
    }
    
    const result = await pool.query(query, params);
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
    // First check if the order exists, is accepted, and doesn't already have a screenshot
    const orderCheck = await pool.query(
      `SELECT order_status, gcash_screenshot FROM tblorder WHERE id = $1`,
      [id]
    );
    
    if (orderCheck.rowCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    const orderStatus = orderCheck.rows[0].order_status;
    const existingScreenshot = orderCheck.rows[0].gcash_screenshot;
    
    if (orderStatus !== "accepted" && orderStatus !== "ready for pickup") {
      return res.status(400).json({ 
        error: "Payment proof can only be uploaded after the order has been accepted or is ready for pickup",
        currentStatus: orderStatus
      });
    }
    
    if (existingScreenshot) {
      return res.status(400).json({ 
        error: "GCash screenshot has already been uploaded and cannot be changed",
        hasScreenshot: true
      });
    }

    const result = await pool.query(
      `UPDATE tblorder 
       SET gcash_screenshot = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [file.buffer, id]
    );

    const order = result.rows[0];
    // Convert gcash_screenshot to base64 for frontend
    order.payment_proof = makeImageDataUrl(order.gcash_screenshot);

    res.json(order);
  } catch (err) {
    console.error("Error uploading payment proof:", err);
    res.status(500).json({ error: "Failed to upload payment proof" });
  }
};


export const updatePaymentMethod = async (req, res) => {
  const { id } = req.params;
  const { payment_method } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tblorder
       SET payment_method = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [payment_method, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Order not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update payment method" });
  }
};

// ==========================
// Add a new order
// ==========================
export const addOrder = async (req, res) => {
  const { customer_id, concession_id, dining_option, status, total_price, in_cart, payment_method } = req.body;
  try {
    if (in_cart) {
      const existing = await pool.query(
        `SELECT * FROM tblorder WHERE customer_id=$1 AND concession_id=$2 AND in_cart=TRUE LIMIT 1`,
        [customer_id, concession_id]
      );
      if (existing.rows.length > 0) return res.status(200).json(existing.rows[0]);
    }

    const result = await pool.query(
      `INSERT INTO tblorder (customer_id, concession_id, dining_option, order_status, total_price, in_cart, payment_method)
       VALUES ($1,$2,$3,COALESCE($4, 'pending'),$5,$6,$7) RETURNING *`,
      [customer_id, concession_id, dining_option || 'dine-in', status, total_price, in_cart ?? false, payment_method]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding order:", err);
    res.status(500).json({ error: "Failed to add order" });
  }
};



// ==========================
// Clean up invalid cart items (unavailable items or items from closed concessions)
// ==========================
export const cleanupInvalidCartItems = async (customerId) => {
  try {
    // First, get all cart items with their availability and concession status
    const checkQuery = `
      SELECT od.id AS order_detail_id, od.item_id, m.available, c.status as concession_status
      FROM tblorder o
      JOIN tblorderdetail od ON o.id = od.order_id
      JOIN tblmenuitem m ON od.item_id = m.id
      JOIN tblconcession c ON o.concession_id = c.id
      WHERE o.customer_id = $1 AND o.in_cart = TRUE
    `;
    
    const checkResult = await pool.query(checkQuery, [customerId]);
    
    // Find invalid items (unavailable or from closed concessions)
    const invalidItems = checkResult.rows.filter(row => 
      !row.available || row.concession_status === 'closed'
    );
    
    if (invalidItems.length > 0) {
      const invalidOrderDetailIds = invalidItems.map(item => item.order_detail_id);
      
      // Delete order item variations for invalid items
      await pool.query(
        `DELETE FROM tblorderitemvariation 
         WHERE order_detail_id = ANY($1::int[])`,
        [invalidOrderDetailIds]
      );
      
      // Delete order details for invalid items
      await pool.query(
        `DELETE FROM tblorderdetail 
         WHERE id = ANY($1::int[])`,
        [invalidOrderDetailIds]
      );
      
      // Check if any orders are now empty and delete them
      const emptyOrdersQuery = `
        SELECT o.id as order_id
        FROM tblorder o
        LEFT JOIN tblorderdetail od ON o.id = od.order_id
        WHERE o.customer_id = $1 AND o.in_cart = TRUE AND od.id IS NULL
      `;
      
      const emptyOrdersResult = await pool.query(emptyOrdersQuery, [customerId]);
      
      if (emptyOrdersResult.rows.length > 0) {
        const emptyOrderIds = emptyOrdersResult.rows.map(row => row.order_id);
        await pool.query(
          `DELETE FROM tblorder WHERE id = ANY($1::int[])`,
          [emptyOrderIds]
        );
      }
      
      console.log(`Cleaned up ${invalidItems.length} invalid cart items for customer ${customerId}`);
    }
    
    return invalidItems.length;
  } catch (err) {
    console.error("Error cleaning up invalid cart items:", err);
    return 0;
  }
};

// ==========================
// Get items in cart for a customer
// ==========================
export const getCartByCustomerId = async (req, res) => {
  const { id } = req.params; // customer_id
  try {
    // First, clean up any invalid cart items
    await cleanupInvalidCartItems(id);
    
    const query = `
      SELECT o.id AS order_id,
             o.total_price,
             o.dining_option,
             od.id AS order_detail_id,
             od.quantity,
             od.total_price AS order_detail_total,
             m.item_name,
             m.price AS base_price,
             c.concession_name,
             caf.cafeteria_name,
             m.available,
             c.status as concession_status,
             ARRAY_AGG(iv.variation_name) FILTER (WHERE iv.id IS NOT NULL) AS variations
      FROM tblorder o
      JOIN tblorderdetail od ON o.id = od.order_id
      JOIN tblmenuitem m ON od.item_id = m.id
      JOIN tblconcession c ON o.concession_id = c.id
      JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
      LEFT JOIN tblorderitemvariation oiv ON od.id = oiv.order_detail_id
      LEFT JOIN tblitemvariation iv ON oiv.variation_id = iv.id
      WHERE o.customer_id = $1 AND o.in_cart = TRUE
        AND m.available = TRUE 
        AND c.status = 'open'
      GROUP BY o.id, od.id, m.item_name, m.price, c.concession_name, caf.cafeteria_name, o.dining_option, m.available, c.status
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
  const { schedule_time } = req.body; // optional schedule_time from request body
  
  try {
    // First, clean up any invalid cart items before checkout
    const cleanedCount = await cleanupInvalidCartItems(id);
    
    if (cleanedCount > 0) {
      console.log(`Removed ${cleanedCount} invalid items before checkout for customer ${id}`);
    }
    
    // Validate schedule_time if provided
    if (schedule_time) {
      const scheduledDate = new Date(schedule_time);
      const now = new Date();
      
      if (scheduledDate <= now) {
        return res.status(400).json({ 
          error: "Schedule time must be in the future" 
        });
      }
    }
    
    // Update orders with schedule_time if provided
    const updateQuery = schedule_time 
      ? `UPDATE tblorder
         SET in_cart = FALSE, order_status = 'pending', schedule_time = $2, updated_at = NOW()
         WHERE customer_id = $1 AND in_cart = TRUE
         RETURNING *`
      : `UPDATE tblorder
         SET in_cart = FALSE, order_status = 'pending', updated_at = NOW()
         WHERE customer_id = $1 AND in_cart = TRUE
         RETURNING *`;
    
    const params = schedule_time ? [id, schedule_time] : [id];
    const result = await pool.query(updateQuery, params);

    let message = "Checkout successful";
    if (schedule_time) {
      message += ` - Scheduled for ${new Date(schedule_time).toLocaleString()}`;
    }

    res.json({ 
      message, 
      orders: result.rows,
      cleanedItems: cleanedCount > 0 ? `${cleanedCount} invalid items were removed before checkout` : null
    });
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
