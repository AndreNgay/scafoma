import express from "express";
import { getOrderDetailsById, addOrderDetail, updateOrderDetail, deleteOrderDetail } from "../controllers/orderDetailController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:id", getOrderDetailsById);
router.post("/", authMiddleware, addOrderDetail);
router.put("/:id", updateOrderDetail);
router.delete("/:id", deleteOrderDetail);


export default router;
