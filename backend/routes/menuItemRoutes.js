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

// Public: all items (admin)
router.get("/all", getMenuItems);

// Concessionaire-specific (requires auth)
router.get("/", authMiddleware, getMenuItemsByConcessionaire);

// Create (multipart/form-data with optional 'image' field)
router.post("/", authMiddleware, upload.single("image"), addMenuItem);

// Update (multipart/form-data; optional 'image' field to replace existing image)
router.put("/:id", authMiddleware, upload.single("image"), updateMenuItem);

// Delete
router.delete("/:id", authMiddleware, deleteMenuItem);

export default router;
