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
    const result = await pool.query(
      `INSERT INTO tblnotification (user_id, notification_type, message, is_read)
       VALUES ($1, $2, $3, FALSE)
       RETURNING *`,
      [userId, type, message]
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
  return await createNotification(concessionaireId, 'new_order', message, { order_id: orderId });
};

/**
 * Notify customer about order status change
 */
export const notifyOrderStatusChange = async (orderId, customerId, status, concessionName = '') => {
  const statusMessages = {
    'accepted': 'Your order has been accepted!',
    'declined': 'Your order has been declined.',
    'ready for pickup': 'Your order is ready for pickup!',
    'completed': 'Your order has been completed.',
  };
  
  const message = `${concessionName ? `${concessionName}: ` : ''}${statusMessages[status] || `Order status updated to ${status}`}`;
  return await createNotification(customerId, 'order_update', message, { order_id: orderId, order_status: status });
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


