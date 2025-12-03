import express from "express";
import {
  canRequestReopening,
  getReopeningStatus,
  createReopeningRequest,
  getReopeningRequestsByConcessionaire,
  respondToReopeningRequest,
  getReopeningRequestById,
} from "../controllers/orderReopeningController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Customer routes
router.get("/order/:orderId/can-reopen", canRequestReopening); // Check if order can be reopened
router.get("/order/:orderId/status", getReopeningStatus); // Get reopening request status for an order
router.post("/order/:orderId/request", authMiddleware, createReopeningRequest); // Create reopening request

// Concessionaire routes
router.get("/concessionaire/:concessionaireId", getReopeningRequestsByConcessionaire); // Get all reopening requests for concessionaire
router.get("/request/:requestId", getReopeningRequestById); // Get specific reopening request details
router.put("/request/:requestId/respond", authMiddleware, respondToReopeningRequest); // Approve or reject reopening request

export default router;
