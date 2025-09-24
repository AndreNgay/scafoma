import { pool } from "../libs/database.js";

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
      `SELECT id, user_id, notification_type, message, is_read, created_at, updated_at
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
