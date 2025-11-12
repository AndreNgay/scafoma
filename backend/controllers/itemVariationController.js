import { pool } from "../libs/database.js";

// Helper: convert BYTEA image to base64 data URL
const makeImageDataUrl = (imageBuffer, mime = "jpeg") => {
  if (!imageBuffer) return null;
  const base64 = Buffer.from(imageBuffer).toString("base64");
  return `data:image/${mime};base64,${base64}`;
};

// ✅ Get all variations for a given group
export const getVariationsByGroupId = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        v.id,
        v.item_variation_group_id,
        v.variation_name,
        v.additional_price,
        v.max_amount,
        v.image,
        v.created_at,
        v.updated_at
      FROM tblitemvariation v
      WHERE v.item_variation_group_id = $1
      ORDER BY v.variation_name ASC;
    `;

    const result = await pool.query(query, [id]);

    // Convert image buffers to base64 data URLs
    const variations = result.rows.map(variation => ({
      ...variation,
      image_url: makeImageDataUrl(variation.image)
    }));

    return res.status(200).json({
      success: true,
      data: variations,
    });
  } catch (err) {
    console.error("Error fetching variations:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching variations",
    });
  }
};

// ✅ Add new variation
export const addVariation = async (req, res) => {
  const { item_variation_group_id, variation_name, additional_price } = req.body;

  if (!item_variation_group_id || !variation_name) {
    return res.status(400).json({ success: false, message: "Group ID and variation name are required" });
  }

  try {
    const query = `
      INSERT INTO tblitemvariation (item_variation_group_id, variation_name, additional_price)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      item_variation_group_id,
      variation_name,
      additional_price || 0,
    ]);

    return res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error adding variation:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while adding variation",
    });
  }
};

// ✅ Update variation
export const updateVariation = async (req, res) => {
  const { id } = req.params;
  const { variation_name, additional_price } = req.body;

  try {
    const query = `
      UPDATE tblitemvariation
      SET variation_name = COALESCE($1, variation_name),
          additional_price = COALESCE($2, additional_price),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;

    const result = await pool.query(query, [variation_name, additional_price, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Variation not found" });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating variation:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating variation",
    });
  }
};

// ✅ Delete variation
export const deleteVariation = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `DELETE FROM tblitemvariation WHERE id = $1 RETURNING *;`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Variation not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Variation deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting variation:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting variation",
    });
  }
};

// ✅ Upload variation image
export const uploadVariationImage = async (req, res) => {
  const { id } = req.params;
  
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      message: "No image file provided" 
    });
  }

  try {
    const imageBuffer = req.file.buffer;
    
    const query = `
      UPDATE tblitemvariation 
      SET image = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;

    const result = await pool.query(query, [imageBuffer, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Variation not found" 
      });
    }

    return res.status(200).json({
      success: true,
      message: "Variation image uploaded successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error uploading variation image:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while uploading variation image",
    });
  }
};
