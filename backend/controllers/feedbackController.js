import { pool } from "../libs/database.js";

/**
 * GET /feedback/:id
 * Return all feedbacks for a menu item (always returns 200 with array - empty if none)
 */
export const getFeedbackById = async (req, res) => {
  const { id } = req.params; // menu_item_id

  try {
    const result = await pool.query(
      `SELECT f.id, f.customer_id, f.rating, f.comment, f.created_at, 
              u.first_name, u.last_name
       FROM tblfeedback f
       JOIN tbluser u ON f.customer_id = u.id
       WHERE f.menu_item_id = $1
       ORDER BY f.created_at DESC`,
      [id]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    return res.status(500).json({ message: "Server error while fetching feedbacks" });
  }
};

/**
 * GET /feedback/can-leave/:itemId/:customerId
 * Returns { canLeave: true|false }
 * Checks whether the customer has an eligible order that contains the menu item.
 *
 * NOTE: The frontend calls: /feedback/can-leave/${item.id}/${user.id}
 * so route params are (itemId, customerId) — we pass them to the query properly.
 */
export const canLeaveFeedback = async (req, res) => {
  const { itemId, customerId } = req.params;

  try {
    const checkRes = await pool.query(
      `SELECT od.id
       FROM tblorderdetail od
       JOIN tblorder o ON od.order_id = o.id
       WHERE o.customer_id = $1
         AND od.item_id = $2
         AND o.in_cart = FALSE
         AND o.order_status IN ('completed', 'ready for pickup', 'accepted')
       LIMIT 1`,
      [customerId, itemId]
    );

    const canLeave = checkRes.rows.length > 0;
    return res.status(200).json({ canLeave });
  } catch (error) {
    console.error("Error checking feedback eligibility:", error);
    return res.status(500).json({ message: "Server error while checking feedback eligibility" });
  }
};

/**
 * POST /feedback
 * body: { customer_id, menu_item_id, rating, comment }
 *
 * - Validates required fields
 * - Ensures the customer actually ordered the item (same logic as canLeaveFeedback)
 * - Prevents duplicate feedback from same user for same menu item (409)
 */
export const createFeedback = async (req, res) => {
  const { customer_id, menu_item_id, rating, comment } = req.body;

  if (!customer_id || !menu_item_id || !rating) {
    return res.status(400).json({ message: "customer_id, menu_item_id, and rating are required" });
  }

  try {
    // 1) Check if customer has ordered this item (eligible statuses)
    const orderCheck = await pool.query(
      `SELECT od.id
       FROM tblorderdetail od
       JOIN tblorder o ON od.order_id = o.id
       WHERE o.customer_id = $1
         AND od.item_id = $2
         AND o.in_cart = FALSE
         AND o.order_status IN ('completed', 'ready for pickup', 'accepted')
       LIMIT 1`,
      [customer_id, menu_item_id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(403).json({ message: "You can only leave feedback after ordering this item." });
    }

    // 2) Prevent duplicate feedback by same customer for same menu item (optional)
    const existing = await pool.query(
      `SELECT id FROM tblfeedback WHERE customer_id = $1 AND menu_item_id = $2 LIMIT 1`,
      [customer_id, menu_item_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "You have already left feedback for this item." });
    }

    // 3) Insert feedback
    const insertRes = await pool.query(
      `INSERT INTO tblfeedback (customer_id, menu_item_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [customer_id, menu_item_id, rating, comment || null]
    );

    return res.status(201).json(insertRes.rows[0]);
  } catch (error) {
    console.error("Error creating feedback:", error);
    return res.status(500).json({ message: "Server error while creating feedback" });
  }
};
