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
  getUser
} from "../controllers/userController.js";

const router = express.Router();

// Get currently logged-in user
router.get("/", authMiddleware, getUser);

// Get all users
router.get("/all", getAllUsers);

// Change password (self)
router.put("/change-password/:id", authMiddleware, changePassword);

// Create concessionaire
router.post("/concessionaire", createConcessionaire);

// Reset password
router.post("/:id/reset-password", authMiddleware, resetPassword);

router.put("/profile", authMiddleware, updateProfile);

// Update user details
router.put("/:id", authMiddleware, updateUser);



// Delete user
router.delete("/:id", authMiddleware, deleteUser);

export default router;
