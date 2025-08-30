import express from "express";
import { getMenuItems, getMenuItemsByConcessionaire } from "../controllers/MenuItemController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all MenuItems
router.get("/all", getMenuItems);

// Get menu items by concessionaire ID
router.get("/", authMiddleware, getMenuItemsByConcessionaire);

export default router;
