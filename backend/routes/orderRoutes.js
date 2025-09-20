import express from "express";
import { getOrdersByConcessionaireId, getOrdersByCustomerId, updateOrderStatus, updateOrderTotal, addOrder, deleteOrder, updatePaymentProof, getCartByCustomerId, checkoutCart, updatePaymentMethod } from "../controllers/orderController.js";
import { upload } from "./concessionRoutes.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/concessionare/:id", getOrdersByConcessionaireId);
router.get("/customer/:id", getOrdersByCustomerId);
router.put("/status/:id", updateOrderStatus);
router.put("/:id/recalculate", updateOrderTotal);
router.put("/gcash-screenshot/:id", upload.single("gcash_screenshot"), updatePaymentProof)
router.post("/", authMiddleware, addOrder);
router.delete("/:id", deleteOrder)
router.get("/cart/:id", getCartByCustomerId) //fetch cart
router.put("/checkout/:id", checkoutCart) 
router.patch("/:id/payment-method", updatePaymentMethod)

export default router;
