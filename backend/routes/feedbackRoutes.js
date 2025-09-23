import express from "express";
import { getFeedbackById, createFeedback, canLeaveFeedback } from "../controllers/feedbackController.js";


const router = express.Router();

router.get("/:id", getFeedbackById);
router.post("/", createFeedback);
router.get("/can-leave/:itemId/:customerId", canLeaveFeedback);

export default router;