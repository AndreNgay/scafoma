import { pool } from "../libs/database.js";

export const getAllConcessionaire = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, contact_number, role, created_at, updated_at 
       FROM tbluser 
       WHERE role = 'concessionaire'
       ORDER BY created_at DESC`
    );

    res.status(200).json({
      status: "success",
      message: "Concessionaires retrieved successfully",
      concessionaires: result.rows,
    });
  } catch (error) {
    console.error("Error retrieving all concessionaires:", error);
    res.status(500).json({ status: "failed", message: "Internal Server Error" });
  }
};
