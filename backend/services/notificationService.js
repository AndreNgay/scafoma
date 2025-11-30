// services/notificationService.js
import { pool } from "../libs/database.js";

/**
 * Create a notification in the database
 * @param {number} userId - The user to notify
 * @param {string} type - Notification type (e.g., 'new_order', 'order_ready', 'order_accepted', etc.)
 * @param {string} message - The notification message
 * @param {object} metadata - Optional metadata (order_id, etc.)
 */
export const createNotification = async (userId, type, message, metadata = {}) => {
  try {
    console.log(`Attempting to create notification for user ${userId}, type: ${type}`);
    const orderId = metadata?.order_id ?? null;
    const result = await pool.query(
      `INSERT INTO tblnotification (user_id, notification_type, message, is_read, order_id)
       VALUES ($1, $2, $3, FALSE, $4)
       RETURNING *`,
      [userId, type, message, orderId]
    );
    
    console.log(`✅ Notification created successfully: ${type} for user ${userId}`, result.rows[0]);
    return result.rows[0];
  } catch (err) {
    console.error("❌ Error creating notification:", err);
    console.error("User ID:", userId, "Type:", type, "Message:", message);
    return null;
  }
};

/**
 * Notify concessionaire about a new order
 */
export const notifyNewOrder = async (orderId, concessionaireId, customerName, itemCount) => {
  const message = `New order from ${customerName}! Order #${orderId} (${itemCount} item${itemCount > 1 ? 's' : ''})`;
  console.log(`📬 Notifying concessionaire ${concessionaireId} about new order ${orderId}`);
  return await createNotification(concessionaireId, 'New Order', message, { order_id: orderId });
};

/**
 * Notify concessionaire about a customer order cancellation
 */
export const notifyOrderCancelledForConcessionaire = async (orderId, concessionaireId, customerName) => {
  const message = `Order #${orderId} was cancelled by ${customerName}`;
  return await createNotification(concessionaireId, 'Order Cancelled', message, { order_id: orderId });
};

/**
 * Notify customer to pay within the receipt timer when order is accepted (GCash only)
 */
export const notifyCustomerToPay = async (orderId, customerId, concessionName, receiptTimer) => {
  // Parse HH:MM:SS to total minutes for a friendly message
  const [hours, minutes] = receiptTimer.split(':').map(Number)
  let timeText = ''
  if (hours > 0) {
    timeText = `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`
  } else {
    timeText = `${minutes} minute${minutes > 1 ? 's' : ''}`
  }
  const message = `${concessionName}: Your order #${orderId} was accepted! Please pay via GCash and upload your receipt within ${timeText}.`;
  return await createNotification(customerId, 'Payment Reminder', message, { order_id: orderId });
};

/**
 * Notify concessionaire when a customer uploads a GCash receipt
 */
export const notifyConcessionaireReceiptUploaded = async (orderId, concessionaireId, customerName) => {
  const message = `GCash receipt uploaded for order #${orderId} by ${customerName}. Please review and confirm.`;
  return await createNotification(concessionaireId, 'Receipt Uploaded', message, { order_id: orderId });
};

/**
 * Notify customer about order status change
 */
export const notifyOrderStatusChange = async (
  orderId,
  customerId,
  status,
  concessionName = '',
  declineReason = '',
  oldTotal = null,
  newTotal = null,
  priceChangeReason = ''
) => {
  const statusMessages = {
    'accepted': 'Your order has been accepted!',
    'declined': 'Your order has been declined.',
    'ready for pickup': 'Your order is ready for pickup!',
    'completed': 'Your order has been completed.',
  };

  let message = `${concessionName ? `${concessionName}: ` : ''}${
    statusMessages[status] || `Order status updated to ${status}`
  } (Order #${orderId})`;

  if (status === 'declined' && declineReason) {
    message += `\nReason: ${declineReason}`;
  }

  if (
    oldTotal !== null &&
    newTotal !== null &&
    Number.isFinite(Number(oldTotal)) &&
    Number.isFinite(Number(newTotal)) &&
    Number(newTotal) !== Number(oldTotal)
  ) {
    const formatPeso = (v) => Number(v).toFixed(2);
    message += `\nTotal updated from ₱${formatPeso(oldTotal)} to ₱${formatPeso(newTotal)}.`;
    if (priceChangeReason) {
      message += `\nReason for change: ${priceChangeReason}`;
    }
  }

  return await createNotification(customerId, 'Order Update', message, {
    order_id: orderId,
    order_status: status,
  });
};

/**
 * Notify customer about GCash screenshot rejection
 */
export const notifyPaymentScreenshotRejected = async (orderId, customerId, concessionName, rejectionReason) => {
  const message = `${concessionName}: Your GCash receipt for order #${orderId} was rejected.\nReason: ${rejectionReason}\nPlease upload a correct receipt to proceed with your order.`;
  return await createNotification(customerId, 'Payment Rejected', message, { order_id: orderId });
};

/**
 * Notify both customer and concessionaire about automatic order decline due to receipt timeout
 */
export const notifyAutoDeclineTimeout = async (orderId, customerId, concessionaireId, concessionName) => {
  // Notify customer
  const customerMessage = `${concessionName}: Your order #${orderId} was automatically declined because the GCash receipt was not uploaded within the required time.`;
  await createNotification(customerId, 'Order Auto-Declined', customerMessage, { order_id: orderId });
  
  // Notify concessionaire
  const concessionaireMessage = `Order #${orderId} was automatically declined due to customer not uploading GCash receipt within the required time.`;
  await createNotification(concessionaireId, 'Order Auto-Declined', concessionaireMessage, { order_id: orderId });
  
  console.log(`📬 Auto-decline notifications sent for order ${orderId} to customer ${customerId} and concessionaire ${concessionaireId}`);
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const result = await pool.query(
      `UPDATE tblnotification
       SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    return result.rows[0];
  } catch (err) {
    console.error("Error marking notification as read:", err);
    return null;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId) => {
  try {
    const result = await pool.query(
      `UPDATE tblnotification
       SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = FALSE
       RETURNING *`,
      [userId]
    );
    return result.rowCount;
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    return 0;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM tblnotification
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  } catch (err) {
    console.error("Error getting unread count:", err);
    return 0;
  }
};


