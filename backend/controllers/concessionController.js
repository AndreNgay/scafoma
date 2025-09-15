import { pool } from "../libs/database.js";

const formatImage = (buffer) => {
  if (!buffer) return null;
  const base64 = buffer.toString("base64");
  return `data:image/jpeg;base64,${base64}`;
};

export const getConcessions = async (req, res) => {
  try {
    const concessions = await pool.query(`
      SELECT 
        c.id,
        c.concession_name,
        c.concessionaire_id,
        u.first_name || ' ' || u.last_name AS concessionaire_name,
        c.cafeteria_id,
        c.created_at,
        c.updated_at
      FROM tblconcession c
      LEFT JOIN tbluser u ON c.concessionaire_id = u.id
      ORDER BY c.created_at DESC
    `);

    if (concessions.rows.length === 0) {
      return res.status(404).json({
        status: "failed",
        message: "No concessions found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Concessions retrieved successfully",
      data: concessions.rows,
    });
  } catch (err) {
    console.error("Error fetching concessions:", err);
    res.status(500).json({ error: err.message });
  }
};


// Create concession
export const createConcession = async (req, res) => {
  const { concession_name, concessionaire_id, cafeteria_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tblconcession (concession_name, concessionaire_id, cafeteria_id, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [concession_name, concessionaire_id, cafeteria_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update concession
export const updateConcession = async (req, res) => {
  const { concession_name, concessionaire_id, cafeteria_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tblconcession 
       SET concession_name = $1, concessionaire_id = $2, cafeteria_id = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [concession_name, concessionaire_id, cafeteria_id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Concession not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete concession
export const deleteConcession = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM tblconcession WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Concession not found" });
    }
    res.json({ message: "Concession deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getConcessionById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, f.cafeteria_name, f.location
       FROM tblconcession c
       JOIN tblcafeteria f ON c.cafeteria_id = f.id
       WHERE c.concessionaire_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Concession not found for this user" });
    }

    const concession = result.rows[0];
    concession.image_url = formatImage(concession.image); // ✅ convert BYTEA → base64
    delete concession.image; // hide raw buffer

    res.json({
      status: "success",
      data: concession,
    });
  } catch (err) {
    console.error("Error fetching concession:", err);
    res.status(500).json({ error: err.message });
  }
};


export const updateMyConcession = async (req, res) => {
  const {
    concession_name,
    gcash_payment_available,
    oncounter_payment_available,
    gcash_number,
    status,
  } = req.body;

  try {
    let imageBuffer = null;
    if (req.file) {
      imageBuffer = req.file.buffer;
    }

    // Update concession first
    await pool.query(
      `UPDATE tblconcession 
       SET 
         concession_name = $1,
         image = COALESCE($2, image),
         gcash_payment_available = $3,
         oncounter_payment_available = $4,
         gcash_number = $5,
         status = $6,
         updated_at = CURRENT_TIMESTAMP
       WHERE concessionaire_id = $7`,
      [
        concession_name,
        imageBuffer,
        gcash_payment_available,
        oncounter_payment_available,
        gcash_number,
        status,
        req.user.id,
      ]
    );

    // Fetch updated concession with cafeteria details
    const result = await pool.query(
      `SELECT c.*, f.cafeteria_name, f.location
       FROM tblconcession c
       JOIN tblcafeteria f ON c.cafeteria_id = f.id
       WHERE c.concessionaire_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Concession not found for this user" });
    }

    const concession = result.rows[0];
    concession.image_url = concession.image
      ? `data:image/jpeg;base64,${concession.image.toString("base64")}`
      : null;
    delete concession.image;

    res.json({
      status: "success",
      message: "Concession updated successfully",
      data: concession,
    });
  } catch (err) {
    console.error("Error updating concession:", err);
    res.status(500).json({ error: err.message });
  }
};
