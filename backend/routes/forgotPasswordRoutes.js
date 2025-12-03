import express from "express";
import {
  requestPasswordReset,
  verifyPasswordResetOTP,
  resetPassword,
  resendPasswordResetOTP,
  checkOTPValidity,
} from "../controllers/forgotPasswordController.js";

const router = express.Router();

// Request password reset (send OTP to email)
router.post("/request", requestPasswordReset);

// Verify OTP
router.post("/verify-otp", verifyPasswordResetOTP);

// Reset password with OTP
router.post("/reset", resetPassword);

// Resend OTP
router.post("/resend-otp", resendPasswordResetOTP);

// Check OTP validity (optional utility endpoint)
router.get("/check-otp", checkOTPValidity);

export default router;
