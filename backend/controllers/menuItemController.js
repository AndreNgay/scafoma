import { pool } from "../libs/database.js";

// Get all menu items (admin)
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

// Get menu items by logged-in concessionaire
export const getMenuItemsByConcessionaire = async (req, res) => {
  const concessionaireId = req.user.id;

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

// Add new menu item + variations
export const addMenuItem = async (req, res) => {
  const concessionaireId = req.user.id;
  const { item_name, price, image_url, category, variations } = req.body;

  if (!item_name || !price || !category) {
    return res
      .status(400)
      .json({ status: "failed", message: "Missing required fields" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Find concession_id from concessionaire_id
    const concessionResult = await client.query(
      `SELECT id FROM tblconcession WHERE concessionaire_id = $1 LIMIT 1`,
      [concessionaireId]
    );

    if (concessionResult.rows.length === 0) {
      throw new Error("No concession found for this concessionaire");
    }

    const concessionId = concessionResult.rows[0].id;

    // Insert into tblmenuitem
    const insertMenu = await client.query(
      `INSERT INTO tblmenuitem (item_name, concession_id, price, image_url, category) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [item_name, concessionId, price, image_url, category]
    );

    const menuItemId = insertMenu.rows[0].id;

    // Insert variations (if any)
    if (variations && variations.length > 0) {
      for (const group of variations) {
        for (const v of group.variations) {
          if (!v.name) continue; // skip empty variation rows

          await client.query(
            `INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id)
             VALUES ($1, $2, $3, $4)`,
            [group.label || "Default", v.name, v.price || 0, menuItemId]
          );
        }
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      message: "Menu item created successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error adding menu item:", error);
    res.status(500).json({ status: "failed", message: "Internal Server Error" });
  } finally {
    client.release();
  }
};
