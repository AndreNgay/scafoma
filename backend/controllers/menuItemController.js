import { pool } from "../libs/database.js";
import multer from "multer";
import path from "path";
import fs from "fs";


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

    // Convert image BYTEA → base64 string
    const menuItems = result.rows.map((item) => {
      let image_url = null;
      if (item.image) {
        const base64 = Buffer.from(item.image).toString("base64");
        image_url = `data:image/jpeg;base64,${base64}`;
      }

      return {
        id: item.id,
        item_name: item.item_name,
        price: item.price,
        category: item.category,
        availability: item.available,
        concession_name: item.concession_name,
        image_url, // ✅ frontend will display this
      };
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




// configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/menu";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
export const upload = multer({ storage });

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
      return res.status(400).json({ status: "failed", message: "Invalid variations JSON" });
    }
  }

  const image_url = req.file ? `/uploads/menu/${req.file.filename}` : null;

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

    const imageData = req.file ? fs.readFileSync(req.file.path) : null;

    const insertMenu = await client.query(
      `INSERT INTO tblmenuitem (item_name, concession_id, price, image, category) 
      VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [item_name, concessionId, price, imageData, category]
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
