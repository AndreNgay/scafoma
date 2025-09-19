// controllers/menuItemController.js
import { pool } from "../libs/database.js";
import multer from "multer";

const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Helper: convert BYTEA image to base64 data URL
const makeImageDataUrl = (imageBuffer, mime = "jpeg") => {
  if (!imageBuffer) return null;
  const base64 = Buffer.from(imageBuffer).toString("base64");
  return `data:image/${mime};base64,${base64}`;
};

// =========================
// Get all menu items (with optional filters, pagination, sorting)
// =========================
export const getMenuItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { cafeteriaId, concessionId, category, sortBy, search } = req.query;

    let whereClauses = [];
    let params = [];
    let i = 1;

    if (cafeteriaId) {
      whereClauses.push(`c.cafeteria_id = $${i++}`);
      params.push(cafeteriaId);
    }
    if (concessionId) {
      whereClauses.push(`mi.concession_id = $${i++}`);
      params.push(concessionId);
    }
    if (category) {
      whereClauses.push(`mi.category ILIKE $${i++}`);
      params.push(`%${category}%`);
    }
    if (search) {
      whereClauses.push(`mi.item_name ILIKE $${i++}`);
      params.push(`%${search}%`);
    }

    const whereSQL = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";

    let orderBy = "mi.created_at DESC";
    if (sortBy === "price_asc") orderBy = "mi.price ASC";
    if (sortBy === "price_desc") orderBy = "mi.price DESC";
    if (sortBy === "name") orderBy = "mi.item_name ASC";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tblmenuitem mi 
       JOIN tblconcession c ON mi.concession_id = c.id 
       ${whereSQL}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT mi.*, c.concession_name, caf.cafeteria_name
       FROM tblmenuitem mi
       JOIN tblconcession c ON mi.concession_id = c.id
       JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
       ${whereSQL}
       ORDER BY ${orderBy}
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset]
    );

    const menuItems = result.rows;

    // Fetch variation groups and variations
    const menuItemIds = menuItems.map(mi => mi.id);
    let variationsMap = {};
    if (menuItemIds.length > 0) {
      const vRes = await pool.query(
        `SELECT ivg.menu_item_id, ivg.variation_group_name AS label,
                iv.variation_name, iv.additional_price
         FROM tblitemvariation iv
         JOIN tblitemvariationgroup ivg ON iv.item_variation_group_id = ivg.id
         WHERE ivg.menu_item_id = ANY($1::int[])`,
        [menuItemIds]
      );

      for (const v of vRes.rows) {
        if (!variationsMap[v.menu_item_id]) variationsMap[v.menu_item_id] = {};
        if (!variationsMap[v.menu_item_id][v.label]) variationsMap[v.menu_item_id][v.label] = [];
        variationsMap[v.menu_item_id][v.label].push({
          name: v.variation_name,
          price: Number(v.additional_price),
        });
      }
    }

    const formattedItems = menuItems.map(r => ({
      id: r.id,
      item_name: r.item_name,
      price: Number(r.price),
      category: r.category,
      availability: r.available,
      concession_name: r.concession_name,
      concession_id: r.concession_id,
      cafeteria_name: r.cafeteria_name,
      image_url: makeImageDataUrl(r.image),
      variations: variationsMap[r.id]
        ? Object.keys(variationsMap[r.id]).map(label => ({
            label,
            variations: variationsMap[r.id][label]
          }))
        : [],
    }));

    res.json({
      status: "success",
      data: formattedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "failed", message: "Server error" });
  }
};

// =========================
// Get menu items by concessionaire
// =========================
export const getMenuItemsByConcessionaire = async (req, res) => {
  const concessionaireId = req.user.id;
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { category, search, sortBy } = req.query;

    let whereClauses = [`c.concessionaire_id = $1`];
    let params = [concessionaireId];
    let i = 2;

    if (category) {
      whereClauses.push(`mi.category ILIKE $${i++}`);
      params.push(`%${category}%`);
    }
    if (search) {
      whereClauses.push(`mi.item_name ILIKE $${i++}`);
      params.push(`%${search}%`);
    }

    const whereSQL = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";

    let orderBy = "mi.created_at DESC";
    if (sortBy === "price_asc") orderBy = "mi.price ASC";
    if (sortBy === "price_desc") orderBy = "mi.price DESC";
    if (sortBy === "name") orderBy = "mi.item_name ASC";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tblmenuitem mi
       JOIN tblconcession c ON mi.concession_id = c.id
       ${whereSQL}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT mi.*, c.concession_name, caf.cafeteria_name
       FROM tblmenuitem mi
       JOIN tblconcession c ON mi.concession_id = c.id
       JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
       ${whereSQL}
       ORDER BY ${orderBy}
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset]
    );

    const menuItems = result.rows;

    const menuItemIds = menuItems.map(mi => mi.id);
    let variationsMap = {};
    if (menuItemIds.length > 0) {
      const vRes = await pool.query(
        `SELECT ivg.menu_item_id, ivg.variation_group_name AS label,
                iv.variation_name, iv.additional_price
         FROM tblitemvariation iv
         JOIN tblitemvariationgroup ivg ON iv.item_variation_group_id = ivg.id
         WHERE ivg.menu_item_id = ANY($1::int[])`,
        [menuItemIds]
      );

      for (const v of vRes.rows) {
        if (!variationsMap[v.menu_item_id]) variationsMap[v.menu_item_id] = {};
        if (!variationsMap[v.menu_item_id][v.label]) variationsMap[v.menu_item_id][v.label] = [];
        variationsMap[v.menu_item_id][v.label].push({
          name: v.variation_name,
          price: Number(v.additional_price),
        });
      }
    }

    const formattedItems = menuItems.map(r => ({
      id: r.id,
      item_name: r.item_name,
      price: Number(r.price),
      category: r.category,
      availability: r.available,
      concession_name: r.concession_name,
      concession_id: r.concession_id,
      cafeteria_name: r.cafeteria_name,
      image_url: makeImageDataUrl(r.image),
      variations: variationsMap[r.id]
        ? Object.keys(variationsMap[r.id]).map(label => ({
            label,
            variations: variationsMap[r.id][label]
          }))
        : [],
    }));

    res.json({
      status: "success",
      data: formattedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "failed", message: "Server error" });
  }
};

// =========================
// Add new menu item
// =========================
export const addMenuItem = async (req, res) => {
  const concessionaireId = req.user.id;
  const { item_name, price, category } = req.body;
  let variations = [];

  if (!item_name || !price || !category) {
    return res.status(400).json({ status: "failed", message: "Missing required fields" });
  }

  if (req.body.variations) {
    try {
      variations = JSON.parse(req.body.variations);
    } catch {
      return res.status(400).json({ status: "failed", message: "Invalid variations JSON" });
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

    if (!concessionResult.rows.length) {
      throw new Error("No concession found for this concessionaire");
    }

    const concessionId = concessionResult.rows[0].id;

    const insertMenu = await client.query(
      `INSERT INTO tblmenuitem (item_name, concession_id, price, image, category) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [item_name, concessionId, parseFloat(price), imageData, category]
    );
    const menuItemId = insertMenu.rows[0].id;

    // Insert variation groups & variations
    for (const group of variations) {
      const insertGroup = await client.query(
        `INSERT INTO tblitemvariationgroup (variation_group_name, menu_item_id) VALUES ($1, $2) RETURNING id`,
        [group.label || "Default", menuItemId]
      );
      const groupId = insertGroup.rows[0].id;

      for (const v of group.variations) {
        if (!v.name) continue;
        await client.query(
          `INSERT INTO tblitemvariation (item_variation_group_id, variation_name, additional_price)
           VALUES ($1, $2, $3)`,
          [groupId, v.name, v.price || 0]
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({ status: "success", message: "Menu item created successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ status: "failed", message: "Internal Server Error" });
  } finally {
    client.release();
  }
};

// =========================
// Update menu item
// =========================
export const updateMenuItem = async (req, res) => {
  const { id } = req.params;
  const concessionaireId = req.user.id;
  const { item_name, price, category } = req.body;
  let availability = undefined;
  if (typeof req.body.availability !== "undefined") {
    const v = req.body.availability;
    availability = v === "true" || v === "1" ? true : v === "false" || v === "0" ? false : null;
  }

  let variations = [];
  if (req.body.variations) {
    try {
      variations = JSON.parse(req.body.variations);
    } catch {
      return res.status(400).json({ status: "failed", message: "Invalid variations JSON" });
    }
  }

  const imageData = req.file ? req.file.buffer : null;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const checkResult = await client.query(
      `SELECT mi.id FROM tblmenuitem mi
       JOIN tblconcession c ON mi.concession_id = c.id
       WHERE mi.id = $1 AND c.concessionaire_id = $2`,
      [id, concessionaireId]
    );
    if (!checkResult.rows.length) {
      throw new Error("Menu item not found or unauthorized");
    }

    // Update menu item
    let updateFields = [];
    let updateParams = [];
    let idx = 1;

    if (item_name) {
      updateFields.push(`item_name = $${idx++}`);
      updateParams.push(item_name);
    }
    if (price) {
      updateFields.push(`price = $${idx++}`);
      updateParams.push(parseFloat(price));
    }
    if (category) {
      updateFields.push(`category = $${idx++}`);
      updateParams.push(category);
    }
    if (availability !== null && availability !== undefined) {
      updateFields.push(`available = $${idx++}`);
      updateParams.push(availability);
    }
    if (imageData) {
      updateFields.push(`image = $${idx++}`);
      updateParams.push(imageData);
    }

    if (updateFields.length) {
      await client.query(
        `UPDATE tblmenuitem SET ${updateFields.join(", ")} WHERE id = $${idx}`,
        [...updateParams, id]
      );
    }

    // Delete existing variation groups & variations
    const existingGroups = await client.query(
      `SELECT id FROM tblitemvariationgroup WHERE menu_item_id = $1`,
      [id]
    );
    const groupIds = existingGroups.rows.map(g => g.id);

    if (groupIds.length > 0) {
      await client.query(
        `DELETE FROM tblitemvariation WHERE item_variation_group_id = ANY($1::int[])`,
        [groupIds]
      );
      await client.query(
        `DELETE FROM tblitemvariationgroup WHERE id = ANY($1::int[])`,
        [groupIds]
      );
    }

    // Insert new variation groups & variations
    for (const group of variations) {
      const insertGroup = await client.query(
        `INSERT INTO tblitemvariationgroup (variation_group_name, menu_item_id) VALUES ($1, $2) RETURNING id`,
        [group.label || "Default", id]
      );
      const groupId = insertGroup.rows[0].id;

      for (const v of group.variations) {
        if (!v.name) continue;
        await client.query(
          `INSERT INTO tblitemvariation (item_variation_group_id, variation_name, additional_price)
           VALUES ($1, $2, $3)`,
          [groupId, v.name, v.price || 0]
        );
      }
    }

    await client.query("COMMIT");

    res.json({ status: "success", message: "Menu item updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ status: "failed", message: "Internal Server Error" });
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
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const checkResult = await client.query(
      `SELECT mi.id FROM tblmenuitem mi
       JOIN tblconcession c ON mi.concession_id = c.id
       WHERE mi.id = $1 AND c.concessionaire_id = $2`,
      [id, concessionaireId]
    );
    if (!checkResult.rows.length) {
      throw new Error("Menu item not found or unauthorized");
    }

    const existingGroups = await client.query(
      `SELECT id FROM tblitemvariationgroup WHERE menu_item_id = $1`,
      [id]
    );
    const groupIds = existingGroups.rows.map(g => g.id);

    if (groupIds.length > 0) {
      await client.query(
        `DELETE FROM tblitemvariation WHERE item_variation_group_id = ANY($1::int[])`,
        [groupIds]
      );
      await client.query(
        `DELETE FROM tblitemvariationgroup WHERE id = ANY($1::int[])`,
        [groupIds]
      );
    }

    await client.query(`DELETE FROM tblmenuitem WHERE id = $1`, [id]);

    await client.query("COMMIT");
    res.json({ status: "success", message: "Menu item deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ status: "failed", message: "Internal Server Error" });
  } finally {
    client.release();
  }
};
