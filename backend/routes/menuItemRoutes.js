// routes/menuItemRoutes.js
import express from "express";
import {
  getMenuItems,
  getMenuItemsByConcessionaire,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  upload,
} from "../controllers/menuItemController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all MenuItems (for admin)
router.get("/all", getMenuItems);

// Get menu items for currently logged-in concessionaire
router.get("/", authMiddleware, getMenuItemsByConcessionaire);

// ✅ Add a menu item (use multer to parse form-data image + fields)
router.post("/", authMiddleware, upload.single("image"), addMenuItem);

// Update a menu item
router.put("/:id", authMiddleware, upload.single("image"), updateMenuItem);

// Delete a menu item
router.delete("/:id", authMiddleware, deleteMenuItem);

export default router;
