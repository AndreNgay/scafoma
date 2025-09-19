import { pool } from "../libs/database.js";

export const getFeedbackById = async (req, res) => {
  const { id } = req.params; // Get the menu item ID from the route parameter

  try {
    // Query to get all feedbacks related to the menu item
    const result = await pool.query(
      `SELECT f.id, f.rating, f.comment, f.created_at, u.first_name, u.last_name
       FROM tblfeedback f
       JOIN tbluser u ON f.customer_id = u.id
       WHERE f.menu_item_id = $1
       ORDER BY f.created_at DESC`, 
      [id]
    );

    // If no feedback found for the given menu item, return a 404
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No feedback found for this menu item" });
    }

    // Return the feedbacks
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    return res.status(500).json({ message: "Server error while fetching feedbacks" });
  }
};
