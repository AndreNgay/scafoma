import { pool } from "../libs/database.js";

export const getMenuItems = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM tblmenuitem ORDER BY created_at DESC`
    );

    res.status(200).json({
      status: "success",
      message: "Menu items retrieved successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error retrieving menu items:", error);
    res.status(500).json({ status: "failed", message: "Internal Server Error" });
  }
};

export const getMenuItemsByConcessionaire = async (req, res) => {
  const concessionaireId = req.user.id; // ✔️ take directly from JWT

  try {
    const query = `
      SELECT mi.*, c.concession_name
      FROM tblmenuitem mi
      JOIN tblconcession c ON mi.concession_id = c.id
      WHERE c.concessionaire_id = $1
      ORDER BY mi.created_at DESC
    `;

    const result = await pool.query(query, [concessionaireId]);
    res.status(200).json({
      status: "success",
      message: "Menu items retrieved successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error retrieving menu items by concessionaire:", error);
    res.status(500).json({ status: "failed", message: "Internal Server Error" });
  }
};

