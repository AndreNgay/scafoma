import { pool } from "../libs/database.js";

export const getItemVariationsById = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        v.id,
        v.label,
        v.variation_name,
        v.additional_price,
        v.menu_item_id,
        m.item_name,
        m.price AS base_price,
        (m.price + v.additional_price) AS final_price,
        v.created_at,
        v.updated_at
      FROM tblitemvariation v
      INNER JOIN tblmenuitem m ON v.menu_item_id = m.id
      WHERE v.menu_item_id = $1
      ORDER BY v.label, v.variation_name;
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No variations found for this menu item",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("Error fetching item variations:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching item variations",
    });
  }
};
