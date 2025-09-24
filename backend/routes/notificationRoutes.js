import express from "express";
import { getNotificationsByUserId } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/:id", getNotificationsByUserId);

export default router;