import express from "express";
import {
  getMenuItems,
  getMenuItemsByConcessionaire,
  addMenuItem,
} from "../controllers/menuItemController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all MenuItems (for admin)
router.get("/all", getMenuItems);

// Get menu items for currently logged-in concessionaire
router.get("/", authMiddleware, getMenuItemsByConcessionaire);

// Add a menu item (with variations) for concessionaire
router.post("/", authMiddleware, addMenuItem);

export default router;
