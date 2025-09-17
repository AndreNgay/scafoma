// controllers/menuItemController.js
import { pool } from "../libs/database.js";
import multer from "multer";


const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Helper: convert rows + variations into grouped variations array
const groupVariations = (vRows) => {
  // vRows: [{ id, label, variation_name, additional_price, menu_item_id }]
  const map = {};
  for (const v of vRows) {
    if (!map[v.menu_item_id]) map[v.menu_item_id] = {};
    if (!map[v.menu_item_id][v.label]) map[v.menu_item_id][v.label] = [];
    map[v.menu_item_id][v.label].push({
      name: v.variation_name,
      price: Number(v.additional_price),
    });
  }
  return map;
};

// Convert DB image (BYTEA) to data URL (base64) if present
const makeImageDataUrl = (imageBuffer, mime = "jpeg") => {
  if (!imageBuffer) return null;
  const base64 = Buffer.from(imageBuffer).toString("base64");
  return `data:image/${mime};base64,${base64}`;
};

// =========================
// Get all menu items (admin) - includes grouped variations + image as data URL
// =========================
// controllers/menuItemController.js
export const getMenuItems = async (req, res) => {
  try {
    // pagination params from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // count total
    const countResult = await pool.query("SELECT COUNT(*) FROM tblmenuitem");
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT mi.*, c.concession_name
       FROM tblmenuitem mi
       JOIN tblconcession c ON mi.concession_id = c.id
       ORDER BY mi.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const rows = result.rows;
    const itemIds = rows.map((r) => r.id);

    let variationsMap = {};
    if (itemIds.length > 0) {
      const vResult = await pool.query(
        `SELECT id, label, variation_name, additional_price, menu_item_id
         FROM tblitemvariation
         WHERE menu_item_id = ANY($1::int[])`,
        [itemIds]
      );
      variationsMap = groupVariations(vResult.rows);
    }

    const menuItems = rows.map((item) => {
      const groupedVariations = variationsMap[item.id] || {};
      const formattedGroups = Object.keys(groupedVariations).map((label) => ({
        label,
        variations: groupedVariations[label],
      }));

      return {
        id: item.id,
        item_name: item.item_name,
        price: Number(item.price),
        category: item.category,
        availability: item.available ?? false,
        concession_name: item.concession_name,
        image_url: makeImageDataUrl(item.image),
        variations: formattedGroups,
      };
    });

    res.status(200).json({
      status: "success",
      message: "Menu items retrieved successfully",
      data: menuItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error retrieving menu items:", error);
    res.status(500).json({ status: "failed", message: "Internal Server Error" });
  }
};


// =========================
// Get menu items by concessionaire (same output as above but filtered)
// =========================
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
    const rows = result.rows;
    const itemIds = rows.map((r) => r.id);

    let variationsMap = {};
    if (itemIds.length > 0) {
      const vQuery = `
        SELECT id, label, variation_name, additional_price, menu_item_id
        FROM tblitemvariation
        WHERE menu_item_id = ANY($1::int[])
      `;
      const vResult = await pool.query(vQuery, [itemIds]);
      variationsMap = groupVariations(vResult.rows);
    }

    const menuItems = rows.map((item) => {
      const groupedVariations = variationsMap[item.id] || {};
      const formattedGroups = Object.keys(groupedVariations).map((label) => ({
        label,
        variations: groupedVariations[label],
      }));

      const availability =
        item.available ?? item.availability ?? item.availabile ?? false;

      return {
        id: item.id,
        item_name: item.item_name,
        price: Number(item.price),
        category: item.category,
        availability,
        concession_name: item.concession_name,
        image_url: makeImageDataUrl(item.image),
        variations: formattedGroups,
      };
    });

    res.status(200).json({
      status: "success",
      message: "Menu items retrieved successfully",
      data: menuItems,
    });
  } catch (error) {
    console.error("Error retrieving menu items by concessionaire:", error);
    res
      .status(500)
      .json({ status: "failed", message: "Internal Server Error" });
  }
};

// =========================
// Add new menu item (image buffer via multer memory)
// =========================
export const addMenuItem = async (req, res) => {
  const concessionaireId = req.user.id;
  const { item_name, price, category } = req.body;
  let variations = [];

  if (!item_name || !price || !category) {
    return res
      .status(400)
      .json({ status: "failed", message: "Missing required fields" });
  }

  if (req.body.variations) {
    try {
      variations = JSON.parse(req.body.variations);
    } catch (err) {
      return res
        .status(400)
        .json({ status: "failed", message: "Invalid variations JSON" });
    }
  }

  const imageData = req.file ? req.file.buffer : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const concessionResult = await client.query(
      `SELECT id FROM tblconcession WHERE concessionaire_id = $1 LIMIT 1`,
      [concessionaireId]
    );

    if (concessionResult.rows.length === 0) {
      throw new Error("No concession found for this concessionaire");
    }

    const concessionId = concessionResult.rows[0].id;

    const insertMenu = await client.query(
      `INSERT INTO tblmenuitem (item_name, concession_id, price, image, category) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [item_name, concessionId, parseFloat(price), imageData, category]
    );

    const menuItemId = insertMenu.rows[0].id;

    if (variations.length > 0) {
      for (const group of variations) {
        for (const v of group.variations) {
          if (!v.name) continue;
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
    res
      .status(500)
      .json({ status: "failed", message: "Internal Server Error" });
  } finally {
    client.release();
  }
};

// =========================
// Update menu item (supports image buffer via multer memory) — uses same logic for image handling as addMenuItem
// =========================
export const updateMenuItem = async (req, res) => {
  const { id } = req.params;
  const concessionaireId = req.user.id;

  // Because this will be multipart/form-data the fields are strings
  const { item_name, price, category } = req.body;
  // availability may come as 'true'/'false' string in multipart
  let availability = undefined;
  if (typeof req.body.availability !== "undefined") {
    const v = req.body.availability;
    availability = v === "true" || v === "1" ? true : v === "false" || v === "0" ? false : null;
  }

  let variations = [];
  if (req.body.variations) {
    try {
      variations = JSON.parse(req.body.variations);
    } catch (err) {
      return res
        .status(400)
        .json({ status: "failed", message: "Invalid variations JSON" });
    }
  }

  const imageData = req.file ? req.file.buffer : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify ownership
    const checkQuery = `
      SELECT mi.id
      FROM tblmenuitem mi
      JOIN tblconcession c ON mi.concession_id = c.id
      WHERE mi.id = $1 AND c.concessionaire_id = $2
    `;
    const checkResult = await client.query(checkQuery, [id, concessionaireId]);
    if (checkResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        status: "failed",
        message: "You are not authorized to update this menu item",
      });
    }

    const updateQuery = `
      UPDATE tblmenuitem
      SET item_name = $1,
          price = $2,
          image = COALESCE($3, image),
          category = $4,
          available = COALESCE($5, available),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, [
      item_name ?? null,
      typeof price !== "undefined" ? parseFloat(price) : null,
      imageData,
      category ?? null,
      availability,
      id,
    ]);

    const updatedItem = updateResult.rows[0];

    // Replace variations
    await client.query("DELETE FROM tblitemvariation WHERE menu_item_id = $1", [
      id,
    ]);

    if (variations.length > 0) {
      for (const group of variations) {
        for (const v of group.variations) {
          if (!v.name) continue;
          await client.query(
            `INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id)
             VALUES ($1, $2, $3, $4)`,
            [group.label || "Default", v.name, v.price || 0, id]
          );
        }
      }
    }

    await client.query("COMMIT");

    // Build response (include variations and base64 image)
    // Fetch variations for this item to return
    const vQuery = `
      SELECT label, variation_name, additional_price
      FROM tblitemvariation
      WHERE menu_item_id = $1
    `;
    const vRes = await pool.query(vQuery, [id]);
    // group by label
    const grouped = {};
    for (const v of vRes.rows) {
      if (!grouped[v.label]) grouped[v.label] = [];
      grouped[v.label].push({ name: v.variation_name, price: Number(v.additional_price) });
    }
    const formattedGroups = Object.keys(grouped).map((label) => ({
      label,
      variations: grouped[label],
    }));

    // convert image to data url
    const imageUrl = makeImageDataUrl(updatedItem.image);

    res.status(200).json({
      status: "success",
      message: "Menu item updated successfully",
      data: {
        ...updatedItem,
        price: Number(updatedItem.price),
        availability: updatedItem.available ?? false,
        image_url: imageUrl,
        variations: formattedGroups,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating menu item:", error);
    res
      .status(500)
      .json({ status: "failed", message: "Internal Server Error" });
  } finally {
    client.release();
  }
};

// =========================
// Delete menu item
// =========================
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

    await pool.query("DELETE FROM tblitemvariation WHERE menu_item_id = $1", [
      id,
    ]);
    await pool.query("DELETE FROM tblmenuitem WHERE id = $1", [id]);

    res.status(200).json({
      status: "success",
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res
      .status(500)
      .json({ status: "failed", message: "Internal Server Error" });
  }
};
