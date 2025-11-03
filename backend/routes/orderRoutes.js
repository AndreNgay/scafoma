import express from "express";
import { getOrdersByConcessionaireId, getOrdersByCustomerId, updateOrderStatus, updateOrderTotal, addOrder, deleteOrder, updatePaymentProof, getCartByCustomerId, checkoutCart, updatePaymentMethod, getOrderById, cancelOrder, notifyConcessionaireForOrder } from "../controllers/orderController.js";
import { upload } from "./concessionRoutes.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/concessionare/:id", getOrdersByConcessionaireId);
router.get("/:id", getOrderById);
router.get("/customer/:id", getOrdersByCustomerId);
router.put("/status/:id", updateOrderStatus);
router.put("/:id/recalculate", updateOrderTotal);
router.put("/gcash-screenshot/:id", upload.single("gcash_screenshot"), updatePaymentProof)
router.post("/", authMiddleware, addOrder);
router.delete("/:id", deleteOrder)
router.put("/cancel/:id", authMiddleware, cancelOrder) // Cancel order (customer only)
router.get("/cart/:id", getCartByCustomerId) //fetch cart
router.put("/checkout/:id", checkoutCart) 
router.patch("/:id/payment-method", updatePaymentMethod)
router.post("/:id/notify", authMiddleware, notifyConcessionaireForOrder)

export default router;
