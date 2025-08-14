import database from "../libs/database.js";

// Get all concessions
export const getConcessions = async (req, res) => {
  try {
    const result = await database.query(
      `SELECT c.id, c.concession_name, 
              u.first_name || ' ' || u.last_name AS concessionaire_name,
              f.cafeteria_name, 
              c.created_at, c.updated_at
       FROM tblconcessions c
       JOIN tbluser u ON c.concessionaire_id = u.id
       JOIN tblcafeteria f ON c.cafeteria_id = f.id
       ORDER BY c.id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get concession by ID
export const getConcessionById = async (req, res) => {
  try {
    const result = await database.query(
      `SELECT c.id, c.concession_name, 
              u.first_name || ' ' || u.last_name AS concessionaire_name,
              f.cafeteria_name, 
              c.created_at, c.updated_at
       FROM tblconcessions c
       JOIN tbluser u ON c.concessionaire_id = u.id
       JOIN tblcafeteria f ON c.cafeteria_id = f.id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Concession not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create concession
export const createConcession = async (req, res) => {
  const { concession_name, concessionaire_id, cafeteria_id } = req.body;
  try {
    const result = await database.query(
      `INSERT INTO tblconcessions (concession_name, concessionaire_id, cafeteria_id, created_at, updated_at)
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
    const result = await database.query(
      `UPDATE tblconcessions 
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
    const result = await database.query(
      `DELETE FROM tblconcessions WHERE id = $1 RETURNING *`,
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
