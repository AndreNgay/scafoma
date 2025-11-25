import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  changePassword,
  updateUser,
  updateProfile,
  getAllUsers,
  deleteUser,
  createConcessionaire,
  resetPassword,
  getUser,
  getUserById
} from "../controllers/userController.js";
import multer from "multer";

const upload = multer(); // in-memory
const router = express.Router();

// Get currently logged-in user
router.get("/", authMiddleware, getUser);

// Get all users
router.get("/all", getAllUsers);

// Get user by ID
router.get("/:id", getUserById);

// Change password (self)
router.put("/change-password/:id", authMiddleware, changePassword);

// Create concessionaire
router.post("/concessionaire", createConcessionaire);

// Reset password
router.post("/:id/reset-password", resetPassword);

router.put("/profile", authMiddleware, upload.single("profile_image"), updateProfile);

// Update user details
router.put("/:id", authMiddleware, updateUser);

// Delete user
router.delete("/:id", authMiddleware, deleteUser);

export default router;
