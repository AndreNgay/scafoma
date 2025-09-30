import express from "express";
import { getOrderDetailsById, addOrderDetail, updateOrderDetail, deleteOrderDetail, updateOrderDetailQuantity, getMostOrderedItems, getTrendingItemsThisWeek, getRecentItemsByUser } from "../controllers/orderDetailController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:id", getOrderDetailsById);
router.get("/analytics/most-ordered", getMostOrderedItems);
router.get("/analytics/trending-week", getTrendingItemsThisWeek);
router.get("/analytics/recent/:userId", getRecentItemsByUser);
router.post("/", authMiddleware, addOrderDetail);
router.put("/:orderDetailId/quantity", updateOrderDetailQuantity);
router.put("/:id", updateOrderDetail);

router.delete("/:id", deleteOrderDetail);


export default router;
