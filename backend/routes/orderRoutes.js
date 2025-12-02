import express from "express";
import {
  getOrdersByConcessionaireId,
  getOrdersByCustomerId,
  updateOrderStatus,
  updateOrderTotal,
  addOrder,
  deleteOrder,
  updatePaymentProof,
  getCartByCustomerId,
  checkoutCart,
  checkoutSingleOrder,
  updatePaymentMethod,
  getOrderById,
  cancelOrder,
  notifyConcessionaireForOrder,
  rejectReceipt,
  rejectGCashScreenshot,
  checkAndDeclineExpiredReceipt,
  bulkDeclineExpiredReceipts,
} from "../controllers/orderController.js";
import { upload } from "./concessionRoutes.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { pool } from "../libs/database.js";

const router = express.Router();

router.get("/concessionare/:id", getOrdersByConcessionaireId);
router.get("/:id", getOrderById);
router.get("/customer/:id", getOrdersByCustomerId);
router.put("/status/:id", updateOrderStatus);
router.put("/:id/recalculate", updateOrderTotal);
router.put(
  "/gcash-screenshot/:id",
  upload.single("gcash_screenshot"),
  updatePaymentProof,
);
router.post("/", authMiddleware, addOrder);
router.delete("/:id", deleteOrder);
router.put("/cancel/:id", authMiddleware, cancelOrder); // Cancel order (customer only)
router.get("/cart/:id", getCartByCustomerId); //fetch cart
router.get("/cart-test/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const cartQuery = `
      SELECT o.id as order_id, o.in_cart, o.order_status, o.total_price,
             od.id as order_detail_id, od.quantity, od.total_price as detail_total,
             m.item_name
      FROM tblorder o
      JOIN tblorderdetail od ON o.id = od.order_id
      JOIN tblmenuitem m ON od.item_id = m.id
      WHERE o.customer_id = $1 AND o.in_cart = TRUE
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(cartQuery, [id]);
    res.json({
      success: true,
      message: `Found ${result.rows.length} cart items for customer ${id}`,
      cartItems: result.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cart test error:", err);
    res.status(500).json({ error: "Cart test failed", details: err.message });
  }
}); // Test cart functionality
router.put("/checkout/:id", checkoutCart);
router.put("/checkout-single", checkoutSingleOrder); // Checkout single order by order_id
router.patch("/:id/payment-method", updatePaymentMethod);
router.post("/:id/notify", authMiddleware, notifyConcessionaireForOrder);
router.put("/:id/reject-receipt", rejectReceipt); // Reject receipt and restart timer
router.put("/:id/reject-gcash-screenshot", rejectGCashScreenshot); // Reject GCash screenshot with specific reason
router.post("/:id/check-expired", checkAndDeclineExpiredReceipt); // Auto-decline if receipt timer expired
router.post("/bulk-decline-expired", bulkDeclineExpiredReceipts); // Bulk auto-decline expired GCash receipts

export default router;
