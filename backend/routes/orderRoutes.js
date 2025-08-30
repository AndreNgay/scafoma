import express from "express";
import { getOrdersByConcessionaire } from "../controllers/orderController.js";
import authMiddleware from "../middleware/authMiddleware.js"; // makes req.user available

const router = express.Router();

// GET /api-v1/orders
router.get("/", authMiddleware, getOrdersByConcessionaire);

export default router;
