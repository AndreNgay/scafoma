import { pool } from "../libs/database.js";

// get groups by menu item id
export const getVariationGroupsById = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT id, variation_group_name, min_selection, max_selection
      FROM tblitemvariationgroup
      WHERE menu_item_id = $1
      ORDER BY variation_group_name ASC;
    `;

    const result = await pool.query(query, [id]);

    // Derive multiple_selection and required_selection from min/max for compatibility
    const rows = result.rows.map((row) => ({
      ...row,
      required_selection: (row.min_selection || 0) > 0,
      multiple_selection: (row.max_selection || 1) > 1,
    }));

    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error fetching variation groups:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching variation groups",
    });
  }
};

// Add group
export const addVariationGroup = async (req, res) => {
  const { variation_group_name, menu_item_id, min_selection, max_selection } = req.body;

  if (!variation_group_name || !menu_item_id) {
    return res.status(400).json({ success: false, message: "Group name and menu item ID are required" });
  }

  try {
    const query = `
      INSERT INTO tblitemvariationgroup (variation_group_name, menu_item_id, min_selection, max_selection)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const minSel = typeof min_selection !== "undefined" ? parseInt(min_selection, 10) || 0 : 0;
    const maxSel = typeof max_selection !== "undefined" ? parseInt(max_selection, 10) || 1 : 1;

    const result = await pool.query(query, [
      variation_group_name,
      menu_item_id,
      minSel,
      maxSel,
    ]);

    const row = result.rows[0];

    return res.status(201).json({
      success: true,
      data: {
        ...row,
        required_selection: (row.min_selection || 0) > 0,
        multiple_selection: (row.max_selection || 1) > 1,
      },
    });
  } catch (err) {
    console.error("Error adding variation group:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while adding variation group",
    });
  }
};

// Update group
export const updateVariationGroup = async (req, res) => {
  const { id } = req.params;
  const { variation_group_name, min_selection, max_selection } = req.body;

  try {
    const query = `
      UPDATE tblitemvariationgroup
      SET variation_group_name = COALESCE($1, variation_group_name),
          min_selection = COALESCE($2, min_selection),
          max_selection = COALESCE($3, max_selection),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;

    const result = await pool.query(query, [variation_group_name, min_selection, max_selection, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Variation group not found" });
    }

    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        ...row,
        required_selection: (row.min_selection || 0) > 0,
        multiple_selection: (row.max_selection || 1) > 1,
      },
    });
  } catch (err) {
    console.error("Error updating variation group:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating variation group",
    });
  }
};


// ✅ Delete variation group
export const deleteVariationGroup = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `DELETE FROM tblitemvariationgroup WHERE id = $1 RETURNING *;`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Variation group not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Variation group deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting variation group:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting variation group",
    });
  }
};
