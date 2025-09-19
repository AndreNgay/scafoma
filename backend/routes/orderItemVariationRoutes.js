import express from "express";
import {
  getOrderItemVariationsById,
  addOrderItemVariation,
  updateOrderItemVariation,
  deleteOrderItemVariation,
} from "../controllers/orderItemVariationController.js";

const router = express.Router();

// Get all variations for an order detail
router.get("/:", getOrderItemVariationsById);

// Add new variation to order detail
router.post("/", addOrderItemVariation);

// Update variation
router.put("/:id", updateOrderItemVariation);

// Delete variation
router.delete("/:id", deleteOrderItemVariation);

export default router;
