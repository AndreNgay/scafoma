import { pool } from "../libs/database.js";
import {
  ORDER_REOPENING_REASONS,
  ORDER_REOPENING_DECLINE_REASONS,
  MAX_REOPENING_REQUESTS,
  MAX_REOPENING_WINDOW_HOURS,
  getReopeningMessage,
  getReopeningDeclineMessage,
} from "../constants/orderReopeningReasons.js";
import {
  notifyReopeningRequest,
  notifyReopeningApproved,
  notifyReopeningRejected,
} from "../services/notificationService.js";

// ==========================
// Check if order can be reopened
// ==========================
export const canRequestReopening = async (req, res) => {
  const { orderId } = req.params;

  try {
    // Fetch order details
    const orderResult = await pool.query(
      `SELECT o.*, c.concessionaire_id, c.concession_name
       FROM tblorder o
       JOIN tblconcession c ON o.concession_id = c.id
       WHERE o.id = $1`,
      [orderId],
    );

    if (orderResult.rowCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];

    // Check if order is declined
    if (order.order_status !== "declined") {
      return res.json({
        canReopen: false,
        reason: "Order is not in declined status",
      });
    }

    // Check if order was auto-declined (contains "automatically declined" in decline_reason)
    const isAutoDeclined =
      order.decline_reason &&
      order.decline_reason
        .toLowerCase()
        .includes("automatically declined");

    if (!isAutoDeclined) {
      return res.json({
        canReopen: false,
        reason: "Only auto-declined orders can be reopened",
      });
    }

    // Check if there's already a pending request
    const pendingRequest = await pool.query(
      `SELECT id FROM tblorderreopeningrequest
       WHERE order_id = $1 AND status = 'pending'
       LIMIT 1`,
      [orderId],
    );

    if (pendingRequest.rowCount > 0) {
      return res.json({
        canReopen: false,
        reason: "A reopening request is already pending",
        hasPendingRequest: true,
      });
    }

    // Check reopening count
    if (order.reopening_count >= MAX_REOPENING_REQUESTS) {
      return res.json({
        canReopen: false,
        reason: `Maximum number of reopening requests (${MAX_REOPENING_REQUESTS}) reached`,
      });
    }

    // Check time window (within 24 hours of decline)
    const declinedAt = new Date(order.updated_at);
    const now = new Date();
    const hoursSinceDecline =
      (now.getTime() - declinedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceDecline > MAX_REOPENING_WINDOW_HOURS) {
      return res.json({
        canReopen: false,
        reason: `Reopening window has expired (must be within ${MAX_REOPENING_WINDOW_HOURS} hours)`,
      });
    }

    return res.json({
      canReopen: true,
      remainingRequests: MAX_REOPENING_REQUESTS - order.reopening_count,
      hoursRemaining: MAX_REOPENING_WINDOW_HOURS - hoursSinceDecline,
    });
  } catch (err) {
    console.error("Error checking reopening eligibility:", err);
    res.status(500).json({ error: "Failed to check reopening eligibility" });
  }
};

// ==========================
// Get reopening request status
// ==========================
export const getReopeningStatus = async (req, res) => {
  const { orderId } = req.params;

  try {
    const result = await pool.query(
      `SELECT r.*, o.order_status, c.concession_name
       FROM tblorderreopeningrequest r
       JOIN tblorder o ON r.order_id = o.id
       JOIN tblconcession c ON o.concession_id = c.id
       WHERE r.order_id = $1
       ORDER BY r.created_at DESC
       LIMIT 1`,
      [orderId],
    );

    if (result.rowCount === 0) {
      return res.json({ hasRequest: false });
    }

    return res.json({
      hasRequest: true,
      request: result.rows[0],
    });
  } catch (err) {
    console.error("Error fetching reopening status:", err);
    res.status(500).json({ error: "Failed to fetch reopening status" });
  }
};

// ==========================
// Create reopening request
// ==========================
export const createReopeningRequest = async (req, res) => {
  const { orderId } = req.params;
  const { requestType, customMessage } = req.body;

  try {
    // Validate request type
    const validReasons = Object.values(ORDER_REOPENING_REASONS);
    if (!validReasons.includes(requestType)) {
      return res.status(400).json({
        error: "Invalid request type",
        validTypes: validReasons,
      });
    }

    // Fetch order details
    const orderResult = await pool.query(
      `SELECT o.*, c.concessionaire_id, c.concession_name
       FROM tblorder o
       JOIN tblconcession c ON o.concession_id = c.id
       WHERE o.id = $1`,
      [orderId],
    );

    if (orderResult.rowCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];

    // Verify order can be reopened
    if (order.order_status !== "declined") {
      return res.status(400).json({
        error: "Only declined orders can be reopened",
      });
    }

    // Check if order was auto-declined
    const isAutoDeclined =
      order.decline_reason &&
      order.decline_reason
        .toLowerCase()
        .includes("automatically declined");

    if (!isAutoDeclined) {
      return res.status(400).json({
        error: "Only auto-declined orders can be reopened",
      });
    }

    // Check for pending requests
    const pendingRequest = await pool.query(
      `SELECT id FROM tblorderreopeningrequest
       WHERE order_id = $1 AND status = 'pending'
       LIMIT 1`,
      [orderId],
    );

    if (pendingRequest.rowCount > 0) {
      return res.status(400).json({
        error: "A reopening request is already pending",
      });
    }

    // Check reopening limit
    if (order.reopening_count >= MAX_REOPENING_REQUESTS) {
      return res.status(400).json({
        error: `Maximum number of reopening requests (${MAX_REOPENING_REQUESTS}) reached`,
      });
    }

    // Check time window
    const declinedAt = new Date(order.updated_at);
    const now = new Date();
    const hoursSinceDecline =
      (now.getTime() - declinedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceDecline > MAX_REOPENING_WINDOW_HOURS) {
      return res.status(400).json({
        error: `Reopening window has expired (must be within ${MAX_REOPENING_WINDOW_HOURS} hours)`,
      });
    }

    // Build the request message
    const premadeMessage = getReopeningMessage(requestType);
    const fullMessage =
      requestType === ORDER_REOPENING_REASONS.OTHER && customMessage
        ? customMessage
        : customMessage
          ? `${premadeMessage}. Additional details: ${customMessage}`
          : premadeMessage;

    // Create reopening request
    const result = await pool.query(
      `INSERT INTO tblorderreopeningrequest
       (order_id, customer_id, concessionaire_id, request_message, request_type, status, requested_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW() AT TIME ZONE 'UTC')
       RETURNING *`,
      [
        orderId,
        order.customer_id,
        order.concessionaire_id,
        fullMessage,
        requestType,
      ],
    );

    // Update order reopening count
    await pool.query(
      `UPDATE tblorder
       SET reopening_count = reopening_count + 1,
           reopening_requested = true,
           updated_at = NOW() AT TIME ZONE 'UTC'
       WHERE id = $1`,
      [orderId],
    );

    // Get customer name for notification
    const customerResult = await pool.query(
      `SELECT first_name, last_name FROM tbluser WHERE id = $1`,
      [order.customer_id],
    );

    const customerName =
      customerResult.rowCount > 0
        ? `${customerResult.rows[0].first_name} ${customerResult.rows[0].last_name}`
        : "Customer";

    // Send notification to concessionaire
    await notifyReopeningRequest(
      orderId,
      order.concessionaire_id,
      customerName,
      order.concession_name,
    );

    return res.status(201).json({
      success: true,
      message: "Reopening request submitted successfully",
      request: result.rows[0],
    });
  } catch (err) {
    console.error("Error creating reopening request:", err);
    res.status(500).json({ error: "Failed to create reopening request" });
  }
};

// ==========================
// Get reopening requests for concessionaire
// ==========================
export const getReopeningRequestsByConcessionaire = async (req, res) => {
  const { concessionaireId } = req.params;
  const { status } = req.query; // 'pending', 'approved', 'rejected', or 'all'

  try {
    let query = `
      SELECT r.*,
             o.order_status, o.total_price, o.payment_method, o.decline_reason,
             c.concession_name,
             u.first_name || ' ' || u.last_name as customer_name,
             u.profile_image
      FROM tblorderreopeningrequest r
      JOIN tblorder o ON r.order_id = o.id
      JOIN tblconcession c ON o.concession_id = c.id
      JOIN tbluser u ON r.customer_id = u.id
      WHERE r.concessionaire_id = $1
    `;

    const params = [concessionaireId];

    if (status && status !== "all") {
      query += ` AND r.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await pool.query(query, params);

    return res.json({
      success: true,
      requests: result.rows,
    });
  } catch (err) {
    console.error("Error fetching reopening requests:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch reopening requests" });
  }
};

// ==========================
// Respond to reopening request (approve/reject)
// ==========================
export const respondToReopeningRequest = async (req, res) => {
  const { requestId } = req.params;
  const { action, responseType, customMessage } = req.body; // action: 'approve' or 'reject'

  try {
    // Validate action
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        error: "Invalid action. Must be 'approve' or 'reject'",
      });
    }

    // Fetch request details
    const requestResult = await pool.query(
      `SELECT r.*, o.order_status, o.decline_reason, c.concession_name
       FROM tblorderreopeningrequest r
       JOIN tblorder o ON r.order_id = o.id
       JOIN tblconcession c ON o.concession_id = c.id
       WHERE r.id = $1`,
      [requestId],
    );

    if (requestResult.rowCount === 0) {
      return res.status(404).json({ error: "Reopening request not found" });
    }

    const request = requestResult.rows[0];

    // Check if request is still pending
    if (request.status !== "pending") {
      return res.status(400).json({
        error: `Request has already been ${request.status}`,
      });
    }

    // Check if order is still declined
    if (request.order_status !== "declined") {
      return res.status(400).json({
        error: "Order is no longer in declined status",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      if (action === "approve") {
        // Update request status
        await client.query(
          `UPDATE tblorderreopeningrequest
           SET status = 'approved',
               responded_at = NOW() AT TIME ZONE 'UTC',
               updated_at = NOW() AT TIME ZONE 'UTC'
           WHERE id = $1`,
          [requestId],
        );

        // Reopen the order - set back to 'accepted' status
        // Store original decline reason for reference
        await client.query(
          `UPDATE tblorder
           SET order_status = 'accepted',
               original_decline_reason = decline_reason,
               decline_reason = NULL,
               reopening_requested = false,
               reopened_at = NOW() AT TIME ZONE 'UTC',
               updated_at = NOW() AT TIME ZONE 'UTC',
               payment_receipt_expires_at = NOW() AT TIME ZONE 'UTC' + (
                 SELECT receipt_timer::interval FROM tblconcession WHERE id = concession_id
               )
           WHERE id = $1`,
          [request.order_id],
        );

        await client.query("COMMIT");

        // Send notification to customer
        await notifyReopeningApproved(
          request.order_id,
          request.customer_id,
          request.concession_name,
        );

        return res.json({
          success: true,
          message: "Order reopened successfully",
          action: "approved",
        });
      } else {
        // action === 'reject'
        // Validate response type if provided
        if (responseType) {
          const validReasons = Object.values(ORDER_REOPENING_DECLINE_REASONS);
          if (!validReasons.includes(responseType)) {
            await client.query("ROLLBACK");
            return res.status(400).json({
              error: "Invalid response type",
              validTypes: validReasons,
            });
          }
        }

        // Build response message
        let responseMessage = "";
        if (responseType) {
          const premadeMessage = getReopeningDeclineMessage(responseType);
          responseMessage =
            responseType === ORDER_REOPENING_DECLINE_REASONS.OTHER &&
            customMessage
              ? customMessage
              : customMessage
                ? `${premadeMessage}. Additional details: ${customMessage}`
                : premadeMessage;
        } else if (customMessage) {
          responseMessage = customMessage;
        } else {
          responseMessage = "Your reopening request has been declined";
        }

        // Update request status
        await client.query(
          `UPDATE tblorderreopeningrequest
           SET status = 'rejected',
               response_message = $1,
               response_type = $2,
               responded_at = NOW() AT TIME ZONE 'UTC',
               updated_at = NOW() AT TIME ZONE 'UTC'
           WHERE id = $3`,
          [responseMessage, responseType || null, requestId],
        );

        // Update order reopening_requested flag
        await client.query(
          `UPDATE tblorder
           SET reopening_requested = false,
               updated_at = NOW() AT TIME ZONE 'UTC'
           WHERE id = $1`,
          [request.order_id],
        );

        await client.query("COMMIT");

        // Send notification to customer
        await notifyReopeningRejected(
          request.order_id,
          request.customer_id,
          request.concession_name,
          responseMessage,
        );

        return res.json({
          success: true,
          message: "Reopening request declined",
          action: "rejected",
          responseMessage,
        });
      }
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error responding to reopening request:", err);
    res.status(500).json({ error: "Failed to respond to reopening request" });
  }
};

// ==========================
// Get reopening request by ID
// ==========================
export const getReopeningRequestById = async (req, res) => {
  const { requestId } = req.params;

  try {
    const result = await pool.query(
      `SELECT r.*,
             o.order_status, o.total_price, o.payment_method, o.decline_reason,
             o.schedule_time, o.created_at as order_created_at,
             c.concession_name,
             u.first_name || ' ' || u.last_name as customer_name,
             u.profile_image, u.email as customer_email
      FROM tblorderreopeningrequest r
      JOIN tblorder o ON r.order_id = o.id
      JOIN tblconcession c ON o.concession_id = c.id
      JOIN tbluser u ON r.customer_id = u.id
      WHERE r.id = $1`,
      [requestId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Reopening request not found" });
    }

    return res.json({
      success: true,
      request: result.rows[0],
    });
  } catch (err) {
    console.error("Error fetching reopening request:", err);
    res.status(500).json({ error: "Failed to fetch reopening request" });
  }
};
