import express from "express";
import { getMenuItems, deleteMenuItem } from "../controllers/MenuItemController.js";

const router = express.Router();

// Get all MenuItems
router.get("/all", getMenuItems);

// Delete a MenuItem
router.delete("/:id", deleteMenuItem);


export default router;