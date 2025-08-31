import express from "express";
import {
  getMenuItems,
  getMenuItemsByConcessionaire,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/menuItemController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all MenuItems (for admin)
router.get("/all", getMenuItems);

// Get menu items for currently logged-in concessionaire
router.get("/", authMiddleware, getMenuItemsByConcessionaire);

// Add a menu item
router.post("/", authMiddleware, addMenuItem);

// Update a menu item
router.put("/:id", authMiddleware, updateMenuItem);

// Delete a menu item
router.delete("/:id", authMiddleware, deleteMenuItem);

export default router;
