import { pool } from "../libs/database.js";
import { markNotificationAsRead as markRead, markAllAsRead, getUnreadCount } from "../services/notificationService.js";

// GET notifications for a specific user by user_id
export const getNotificationsByUserId = async (req, res) => {
  const { id } = req.params; // user_id

  try {
    // Validate user_id
    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Fetch notifications for the user, newest first
    const result = await pool.query(
      `SELECT id, user_id, notification_type, message, is_read, order_id, created_at, updated_at
       FROM tblnotification
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    // Return notifications
    res.json({
      user_id: id,
      notifications: result.rows,
      count: result.rowCount,
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  const { id } = req.params; // notification_id
  const userId = req.user?.id; // Get user from auth middleware

  try {
    const notification = await markRead(id, userId);
    
    if (!notification) {
      return res.status(404).json({ error: "Notification not found or unauthorized" });
    }

    res.json({ success: true, notification });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (req, res) => {
  const { id } = req.params; // user_id

  try {
    const count = await markAllAsRead(id);

    res.json({ 
      success: true, 
      message: "All notifications marked as read",
      count
    });
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
};

// Get unread notification count
export const getUnreadNotificationCount = async (req, res) => {
  const { id } = req.params; // user_id

  try {
    const count = await getUnreadCount(id);
    res.json({ count });
  } catch (err) {
    console.error("Error getting unread count:", err);
    res.status(500).json({ error: "Failed to get unread count" });
  }
};

export const addNotification = async (req, res) => {
}