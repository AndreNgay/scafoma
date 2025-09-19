import express from "express";
import { getFeedbackById } from "../controllers/feedbackController.js";


const router = express.Router();

router.get("/:id", getFeedbackById);

export default router;