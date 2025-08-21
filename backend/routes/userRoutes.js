import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getUser,
  changePassword,
  updateUser,
  getAllUsers,
  deleteUser
} from "../controllers/userController.js";

const router = express.Router();

// Get currently logged-in user
router.get("/", authMiddleware, getUser);

// Get all users
router.get("/all", authMiddleware, getAllUsers);

// Change password
router.put("/change-password", authMiddleware, changePassword);

// Update user details
router.put("/:id", authMiddleware, updateUser);

router.delete("/:id", authMiddleware, deleteUser);

export default router;
