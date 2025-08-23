import { pool } from "../libs/database.js";

export const getMenuItems = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM tblmenuitem ORDER BY created_at DESC`
    );

    res.status(200).json({
      status: "success",
      message: "Menu items retrieved successfully",
      data: result.rows,  // 👈 renamed to "data" for consistency
    });
  } catch (error) {
    console.error("Error retrieving menu items:", error);
    res
      .status(500)
      .json({ status: "failed", message: "Internal Server Error" });
  }
};


export const deleteMenuItem = async (req, res) => {
    try {
        
    } catch (error) {
        
    }
}