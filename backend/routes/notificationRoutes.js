import express from "express";
import { 
  getNotificationsByUserId, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getUnreadNotificationCount 
} from "../controllers/notificationController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:id", getNotificationsByUserId);
router.get("/:id/unread-count", getUnreadNotificationCount);
router.put("/:id/read", authMiddleware, markNotificationAsRead);
router.put("/:id/read-all", markAllNotificationsAsRead);

export default router;