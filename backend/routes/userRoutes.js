import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  changePassword,
  updateUser,
  getAllUsers,
  deleteUser,
  createConcessionaire,
  resetPassword,
  getUser
} from "../controllers/userController.js";

const router = express.Router();

// Get currently logged-in user
router.get("/", authMiddleware, getUser);

// Get all users
router.get("/all", getAllUsers);

// Change password (self)
router.put("/change-password", authMiddleware, changePassword);

// Create concessionaire
router.post("/concessionaire", createConcessionaire);

// Reset password
router.post("/:id/reset-password", authMiddleware, resetPassword);

// Update user details
router.put("/:id", authMiddleware, updateUser);

// Delete user
router.delete("/:id", authMiddleware, deleteUser);

export default router;
