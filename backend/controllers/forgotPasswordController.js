import { pool } from "../libs/database.js";
import { hashPassword } from "../libs/index.js";
import {
  generateOTP,
  storeOTP,
  verifyOTP,
  sendEmail,
} from "../services/emailService.js";

// ===============================
// Request Password Reset (Send OTP)
// ===============================
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    // Validate input
    if (!email || !email.trim()) {
      return res.status(400).json({
        status: "failed",
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const userCheck = await pool.query(
      "SELECT id, first_name, last_name, email FROM tbluser WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (userCheck.rows.length === 0) {
      // For security, don't reveal if email exists or not
      return res.status(200).json({
        status: "success",
        message: "If an account exists with this email, you will receive a password reset code.",
      });
    }

    const user = userCheck.rows[0];

    // Generate OTP
    const otp = generateOTP();

    // Store OTP in database
    const stored = await storeOTP(user.email, otp, "password_reset");

    if (!stored) {
      return res.status(500).json({
        status: "failed",
        message: "Failed to generate password reset code. Please try again.",
      });
    }

    // Send email with OTP
    try {
      await sendEmail(user.email, "password_reset", {
        firstName: user.first_name,
        lastName: user.last_name,
        otp: otp,
      });

      console.log(`Password reset OTP sent to ${user.email}: ${otp}`);

      res.status(200).json({
        status: "success",
        message: "Password reset code has been sent to your email.",
      });
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError);

      // Delete the OTP since email failed
      await pool.query(
        "DELETE FROM tblemailverification WHERE email = $1 AND verification_type = $2",
        [user.email, "password_reset"]
      );

      return res.status(500).json({
        status: "failed",
        message: "Failed to send password reset email. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Error in requestPasswordReset:", error);
    res.status(500).json({
      status: "failed",
      message: "Internal server error. Please try again later.",
    });
  }
};

// ===============================
// Verify OTP
// ===============================
export const verifyPasswordResetOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Validate input
    if (!email || !email.trim() || !otp || !otp.trim()) {
      return res.status(400).json({
        status: "failed",
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const userCheck = await pool.query(
      "SELECT id FROM tbluser WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: "failed",
        message: "User not found",
      });
    }

    // Verify OTP
    const verification = await verifyOTP(normalizedEmail, otp.trim(), "password_reset");

    if (!verification.success) {
      return res.status(400).json({
        status: "failed",
        message: verification.message,
      });
    }

    res.status(200).json({
      status: "success",
      message: "OTP verified successfully. You can now reset your password.",
    });
  } catch (error) {
    console.error("Error in verifyPasswordResetOTP:", error);
    res.status(500).json({
      status: "failed",
      message: "Internal server error. Please try again later.",
    });
  }
};

// ===============================
// Reset Password (After OTP Verification)
// ===============================
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    // Validate input
    if (!email || !email.trim() || !otp || !otp.trim() || !newPassword) {
      return res.status(400).json({
        status: "failed",
        message: "Email, OTP, and new password are required",
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        status: "failed",
        message: "Password must be at least 6 characters long",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const userCheck = await pool.query(
      "SELECT id, first_name, email FROM tbluser WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: "failed",
        message: "User not found",
      });
    }

    const user = userCheck.rows[0];

    // Verify OTP one more time (in case it was verified but not used yet)
    const otpCheck = await pool.query(
      `SELECT * FROM tblemailverification
       WHERE LOWER(email) = $1 AND otp_code = $2 AND verification_type = $3
       AND expires_at > CURRENT_TIMESTAMP`,
      [normalizedEmail, otp.trim(), "password_reset"]
    );

    if (otpCheck.rows.length === 0) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or expired OTP. Please request a new password reset code.",
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await pool.query(
      "UPDATE tbluser SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [hashedPassword, user.id]
    );

    // Delete all OTPs for this email
    await pool.query(
      "DELETE FROM tblemailverification WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    // Send confirmation email
    try {
      await sendEmail(user.email, "password_changed", {
        email: user.email,
        firstName: user.first_name,
      });
    } catch (emailError) {
      console.error("Error sending password changed email:", emailError);
      // Don't fail the request if confirmation email fails
    }

    console.log(`Password reset successful for user: ${user.email}`);

    res.status(200).json({
      status: "success",
      message: "Password has been reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({
      status: "failed",
      message: "Internal server error. Please try again later.",
    });
  }
};

// ===============================
// Resend OTP
// ===============================
export const resendPasswordResetOTP = async (req, res) => {
  const { email } = req.body;

  try {
    // Validate input
    if (!email || !email.trim()) {
      return res.status(400).json({
        status: "failed",
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const userCheck = await pool.query(
      "SELECT id, first_name, last_name, email FROM tbluser WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (userCheck.rows.length === 0) {
      // For security, don't reveal if email exists or not
      return res.status(200).json({
        status: "success",
        message: "If an account exists with this email, you will receive a new password reset code.",
      });
    }

    const user = userCheck.rows[0];

    // Check if there's a recent OTP request (rate limiting)
    const recentOTP = await pool.query(
      `SELECT created_at FROM tblemailverification
       WHERE LOWER(email) = $1 AND verification_type = $2
       AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute'`,
      [normalizedEmail, "password_reset"]
    );

    if (recentOTP.rows.length > 0) {
      return res.status(429).json({
        status: "failed",
        message: "Please wait at least 1 minute before requesting a new code.",
      });
    }

    // Generate new OTP
    const otp = generateOTP();

    // Store OTP in database
    const stored = await storeOTP(user.email, otp, "password_reset");

    if (!stored) {
      return res.status(500).json({
        status: "failed",
        message: "Failed to generate password reset code. Please try again.",
      });
    }

    // Send email with OTP
    try {
      await sendEmail(user.email, "password_reset", {
        firstName: user.first_name,
        lastName: user.last_name,
        otp: otp,
      });

      console.log(`Password reset OTP resent to ${user.email}: ${otp}`);

      res.status(200).json({
        status: "success",
        message: "A new password reset code has been sent to your email.",
      });
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError);

      // Delete the OTP since email failed
      await pool.query(
        "DELETE FROM tblemailverification WHERE LOWER(email) = $1 AND verification_type = $2",
        [normalizedEmail, "password_reset"]
      );

      return res.status(500).json({
        status: "failed",
        message: "Failed to send password reset email. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Error in resendPasswordResetOTP:", error);
    res.status(500).json({
      status: "failed",
      message: "Internal server error. Please try again later.",
    });
  }
};

// ===============================
// Check if OTP is still valid (optional utility)
// ===============================
export const checkOTPValidity = async (req, res) => {
  const { email } = req.query;

  try {
    if (!email || !email.trim()) {
      return res.status(400).json({
        status: "failed",
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const otpCheck = await pool.query(
      `SELECT expires_at FROM tblemailverification
       WHERE LOWER(email) = $1 AND verification_type = $2
       AND expires_at > CURRENT_TIMESTAMP AND used = FALSE
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedEmail, "password_reset"]
    );

    if (otpCheck.rows.length === 0) {
      return res.status(200).json({
        status: "success",
        valid: false,
        message: "No valid OTP found",
      });
    }

    const expiresAt = new Date(otpCheck.rows[0].expires_at);
    const now = new Date();
    const remainingSeconds = Math.floor((expiresAt - now) / 1000);

    res.status(200).json({
      status: "success",
      valid: true,
      remainingSeconds: remainingSeconds,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error in checkOTPValidity:", error);
    res.status(500).json({
      status: "failed",
      message: "Internal server error",
    });
  }
};
