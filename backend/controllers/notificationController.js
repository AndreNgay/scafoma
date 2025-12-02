import { pool } from "../libs/database.js";
import {
  markNotificationAsRead as markRead,
  markAllAsRead,
  getUnreadCount,
} from "../services/notificationService.js";

// GET notifications for a specific user by user_id
export const getNotificationsByUserId = async (req, res) => {
  const { id } = req.params; // user_id
  const { page = 1, limit = 10 } = req.query;

  try {
    // Validate user_id
    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const pageNum = Number(page) || 1;
    const pageLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageNum - 1) * pageLimit;

    // Retry logic for database connection issues
    let result, countResult;
    let retries = 3;

    while (retries > 0) {
      try {
        // Fetch notifications page for the user, newest first
        result = await pool.query(
          `SELECT id, user_id, notification_type, message, is_read, order_id,
                  -- Convert UTC to Asia/Manila
                  (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') as created_at,
                  (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') as updated_at
           FROM tblnotification
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT $2 OFFSET $3`,
          [id, pageLimit, offset],
        );

        // Count total notifications for pagination
        countResult = await pool.query(
          `SELECT COUNT(*) AS total
           FROM tblnotification
           WHERE user_id = $1`,
          [id],
        );

        break; // Success, exit retry loop
      } catch (dbError) {
        retries--;
        console.error(
          `Database query failed (${3 - retries} attempt):`,
          dbError.message,
        );

        if (retries === 0) {
          throw dbError; // Re-throw if all retries exhausted
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, (3 - retries) * 1000),
        );
      }
    }

    const total = parseInt(countResult.rows?.[0]?.total || 0, 10);
    const totalPages = Math.max(Math.ceil(total / pageLimit), 1);

    // Return notifications with pagination metadata
    res.json({
      user_id: id,
      page: pageNum,
      limit: pageLimit,
      total,
      totalPages,
      data: result.rows,
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);

    // Provide more specific error messages
    if (
      err.code === "ECONNRESET" ||
      err.code === "ENOTFOUND" ||
      err.code === "ETIMEDOUT"
    ) {
      res.status(503).json({
        error: "Database connection issue. Please try again in a moment.",
        code: err.code,
      });
    } else {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  const { id } = req.params; // notification_id
  const userId = req.user?.id; // Get user from auth middleware

  try {
    const notification = await markRead(id, userId);

    if (!notification) {
      return res
        .status(404)
        .json({ error: "Notification not found or unauthorized" });
    }

    res.json({ success: true, notification });
  } catch (err) {
    console.error("Error marking notification as read:", err);

    if (
      err.code === "ECONNRESET" ||
      err.code === "ENOTFOUND" ||
      err.code === "ETIMEDOUT"
    ) {
      res.status(503).json({
        error: "Database connection issue. Please try again in a moment.",
        code: err.code,
      });
    } else {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
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
      count,
    });
  } catch (err) {
    console.error("Error marking all notifications as read:", err);

    if (
      err.code === "ECONNRESET" ||
      err.code === "ENOTFOUND" ||
      err.code === "ETIMEDOUT"
    ) {
      res.status(503).json({
        error: "Database connection issue. Please try again in a moment.",
        code: err.code,
      });
    } else {
      res
        .status(500)
        .json({ error: "Failed to mark all notifications as read" });
    }
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

    if (
      err.code === "ECONNRESET" ||
      err.code === "ENOTFOUND" ||
      err.code === "ETIMEDOUT"
    ) {
      res.status(503).json({
        error: "Database connection issue. Please try again in a moment.",
        code: err.code,
      });
    } else {
      res.status(500).json({ error: "Failed to get unread count" });
    }
  }
};

export const addNotification = async (req, res) => {};
