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

// Get menu items by logged-in concessionaire (with variations)
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

    // Fetch variations for all items in one query
    const itemIds = result.rows.map((r) => r.id);
    let variationsMap = {};

    if (itemIds.length > 0) {
      const vQuery = `
        SELECT id, label, variation_name, additional_price, menu_item_id
        FROM tblitemvariation
        WHERE menu_item_id = ANY($1::int[])
      `;
      const vResult = await pool.query(vQuery, [itemIds]);

      // Group variations by menu_item_id & label
      variationsMap = vResult.rows.reduce((acc, v) => {
        if (!acc[v.menu_item_id]) acc[v.menu_item_id] = {};
        if (!acc[v.menu_item_id][v.label]) acc[v.menu_item_id][v.label] = [];

        acc[v.menu_item_id][v.label].push({
          name: v.variation_name,
          price: v.additional_price,
        });

        return acc;
      }, {});
    }

    // Attach variations grouped by label
    const menuItems = result.rows.map((item) => {
      const groupedVariations = variationsMap[item.id] || {};
      const formattedGroups = Object.keys(groupedVariations).map((label) => ({
        label,
        variations: groupedVariations[label],
      }));

      return { ...item, variations: formattedGroups };
    });

    res.status(200).json({
      status: "success",
      message: "Menu items retrieved successfully",
      data: menuItems,
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

// Update a menu item (with variations + availability)
export const updateMenuItem = async (req, res) => {
  const { id } = req.params;
  const { item_name, price, image_url, category, variations, availability } = req.body;
  const concessionaireId = req.user.id;

  try {
    // Step 1: Verify the menu item belongs to the logged-in concessionaire
    const checkQuery = `
      SELECT mi.id
      FROM tblmenuitem mi
      JOIN tblconcession c ON mi.concession_id = c.id
      WHERE mi.id = $1 AND c.concessionaire_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [id, concessionaireId]);
    if (checkResult.rowCount === 0) {
      return res.status(403).json({
        status: "failed",
        message: "You are not authorized to update this menu item",
      });
    }

    // Step 2: Update basic menu item fields (with availability)
    const updateQuery = `
      UPDATE tblmenuitem
      SET item_name = $1, 
          price = $2, 
          image_url = $3, 
          category = $4, 
          availability = COALESCE($5, availability), 
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;
    const updateResult = await pool.query(updateQuery, [
      item_name,
      price,
      image_url,
      category,
      availability, // can be true/false or undefined (keeps old value)
      id,
    ]);
    const updatedItem = updateResult.rows[0];

    // Step 3: Delete old variations
    await pool.query("DELETE FROM tblitemvariation WHERE menu_item_id = $1", [id]);

    // Step 4: Insert new variations
    if (variations && variations.length > 0) {
      for (const group of variations) {
        const { label, variations: items } = group;

        for (const v of items) {
          if (!v.name) continue; // Skip empty
          await pool.query(
            `INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) 
             VALUES ($1, $2, $3, $4)`,
            [label || "Default", v.name, v.price || 0, id]
          );
        }
      }
    }

    res.status(200).json({
      status: "success",
      message: "Menu item updated successfully",
      data: { ...updatedItem, variations },
    });
  } catch (error) {
    console.error("Error updating menu item:", error);
    res.status(500).json({
      status: "failed",
      message: "Internal Server Error",
    });
  }
};


// Delete a menu item
export const deleteMenuItem = async (req, res) => {
  const { id } = req.params;
  const concessionaireId = req.user.id;

  try {
    // Verify ownership
    const checkQuery = `
      SELECT mi.id
      FROM tblmenuitem mi
      JOIN tblconcession c ON mi.concession_id = c.id
      WHERE mi.id = $1 AND c.concessionaire_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [id, concessionaireId]);
    if (checkResult.rowCount === 0) {
      return res.status(403).json({
        status: "failed",
        message: "You are not authorized to delete this menu item",
      });
    }

    // Delete variations first
    await pool.query("DELETE FROM tblitemvariation WHERE menu_item_id = $1", [id]);

    // Delete the menu item
    await pool.query("DELETE FROM tblmenuitem WHERE id = $1", [id]);

    res.status(200).json({
      status: "success",
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res.status(500).json({
      status: "failed",
      message: "Internal Server Error",
    });
  }
};
