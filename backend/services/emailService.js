import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { pool } from '../libs/database.js';

// Email configuration
const createTransporter = () => {
  // Use environment variables for email configuration
  const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASSWORD, // Your app password
    },
  };

  return nodemailer.createTransporter(emailConfig);
};

// Generate OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

// Generate verification token
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Store OTP in database with expiration
export const storeOTP = async (email, otp, type = 'password_reset') => {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  try {
    // Delete any existing OTP for this email and type
    await pool.query(
      'DELETE FROM tblemailverification WHERE email = $1 AND verification_type = $2',
      [email, type]
    );

    // Insert new OTP
    await pool.query(
      `INSERT INTO tblemailverification (email, otp_code, verification_type, expires_at, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [email, otp, type, expiresAt]
    );

    return true;
  } catch (error) {
    console.error('Error storing OTP:', error);
    return false;
  }
};

// Verify OTP
export const verifyOTP = async (email, otp, type = 'password_reset') => {
  try {
    const result = await pool.query(
      `SELECT * FROM tblemailverification
       WHERE email = $1 AND otp_code = $2 AND verification_type = $3
       AND expires_at > CURRENT_TIMESTAMP AND used = FALSE`,
      [email, otp, type]
    );

    if (result.rows.length === 0) {
      return { success: false, message: 'Invalid or expired OTP' };
    }

    // Mark OTP as used
    await pool.query(
      'UPDATE tblemailverification SET used = TRUE WHERE id = $1',
      [result.rows[0].id]
    );

    return { success: true, message: 'OTP verified successfully' };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, message: 'Error verifying OTP' };
  }
};

// Store email verification token
export const storeVerificationToken = async (email, token) => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  try {
    // Delete any existing token for this email
    await pool.query(
      'DELETE FROM tblemailverification WHERE email = $1 AND verification_type = $2',
      [email, 'email_verification']
    );

    // Insert new token
    await pool.query(
      `INSERT INTO tblemailverification (email, verification_token, verification_type, expires_at, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [email, token, 'email_verification', expiresAt]
    );

    return true;
  } catch (error) {
    console.error('Error storing verification token:', error);
    return false;
  }
};

// Verify email token
export const verifyEmailToken = async (token) => {
  try {
    const result = await pool.query(
      `SELECT * FROM tblemailverification
       WHERE verification_token = $1 AND verification_type = 'email_verification'
       AND expires_at > CURRENT_TIMESTAMP AND used = FALSE`,
      [token]
    );

    if (result.rows.length === 0) {
      return { success: false, message: 'Invalid or expired verification link' };
    }

    const verification = result.rows[0];

    // Mark token as used
    await pool.query(
      'UPDATE tblemailverification SET used = TRUE WHERE id = $1',
      [verification.id]
    );

    // Update user as verified
    await pool.query(
      'UPDATE tbluser SET email_verified = TRUE WHERE email = $1',
      [verification.email]
    );

    return { success: true, message: 'Email verified successfully', email: verification.email };
  } catch (error) {
    console.error('Error verifying email token:', error);
    return { success: false, message: 'Error verifying email' };
  }
};

// Email templates
const getEmailTemplate = (type, data) => {
  const baseURL = process.env.FRONTEND_URL || 'https://yourapp.com';

  switch (type) {
    case 'welcome':
      return {
        subject: 'Welcome to SCAFOMA - Verify Your Email',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background: linear-gradient(135deg, #A40C2D, #C41E3A); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to SCAFOMA!</h1>
              <p style="color: #fff; margin: 10px 0 0 0; opacity: 0.9;">Your campus food ordering journey starts here</p>
            </div>

            <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi <strong>${data.firstName} ${data.lastName}</strong>,
              </p>

              <p style="font-size: 16px; margin-bottom: 25px;">
                Thank you for joining SCAFOMA! To complete your registration and start ordering delicious food from your favorite campus concessions, please verify your email address.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseURL}/verify-email?token=${data.token}"
                   style="background: #A40C2D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(164, 12, 45, 0.3); transition: all 0.3s ease;">
                  Verify Email Address
                </a>
              </div>

              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="color: #A40C2D; margin: 0 0 10px 0;">What's Next?</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Browse menu items from campus concessions</li>
                  <li>Add your favorite items to cart</li>
                  <li>Place orders for pickup</li>
                  <li>Track your order status</li>
                </ul>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${baseURL}/verify-email?token=${data.token}" style="color: #A40C2D; word-break: break-all;">
                  ${baseURL}/verify-email?token=${data.token}
                </a>
              </p>

              <p style="font-size: 14px; color: #666; margin-top: 20px;">
                This verification link will expire in 24 hours.
              </p>

              <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
                <p style="font-size: 14px; color: #999; margin: 0;">
                  If you didn't create a SCAFOMA account, you can safely ignore this email.
                </p>
              </div>
            </div>

            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>© 2024 SCAFOMA. All rights reserved.</p>
              <p>This email was sent from an automated system. Please do not reply.</p>
            </div>
          </div>
        `,
      };

    case 'password_reset':
      return {
        subject: 'Reset Your SCAFOMA Password',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background: linear-gradient(135deg, #A40C2D, #C41E3A); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
              <p style="color: #fff; margin: 10px 0 0 0; opacity: 0.9;">Secure your SCAFOMA account</p>
            </div>

            <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hello,
              </p>

              <p style="font-size: 16px; margin-bottom: 25px;">
                We received a request to reset your SCAFOMA password. Use the verification code below to proceed with resetting your password.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #f8f9fa; border: 2px dashed #A40C2D; padding: 20px; border-radius: 10px; display: inline-block;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Verification Code</p>
                  <div style="font-size: 32px; font-weight: bold; color: #A40C2D; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                    ${data.otp}
                  </div>
                </div>
              </div>

              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0; font-size: 14px; color: #8a6d3b;">
                  <strong>Security Notice:</strong> This code will expire in 10 minutes. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                </p>
              </div>

              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="color: #A40C2D; margin: 0 0 10px 0;">Next Steps:</h3>
                <ol style="margin: 0; padding-left: 20px;">
                  <li>Return to the SCAFOMA app</li>
                  <li>Enter the verification code above</li>
                  <li>Create a new secure password</li>
                  <li>Login with your new password</li>
                </ol>
              </div>

              <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
                <p style="font-size: 14px; color: #999; margin: 0;">
                  For security reasons, please don't share this code with anyone.
                </p>
              </div>
            </div>

            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>© 2024 SCAFOMA. All rights reserved.</p>
              <p>This email was sent from an automated system. Please do not reply.</p>
            </div>
          </div>
        `,
      };

    case 'password_changed':
      return {
        subject: 'Your SCAFOMA Password Has Been Changed',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Password Changed Successfully</h1>
              <p style="color: #fff; margin: 10px 0 0 0; opacity: 0.9;">Your account is secure</p>
            </div>

            <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background: #d1fae5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <div style="width: 40px; height: 40px; background: #10b981; border-radius: 50%; position: relative;">
                    <div style="position: absolute; top: 15px; left: 12px; width: 16px; height: 8px; border: 3px solid white; border-top: none; border-right: none; transform: rotate(-45deg);"></div>
                  </div>
                </div>
              </div>

              <p style="font-size: 16px; margin-bottom: 20px; text-align: center;">
                Your SCAFOMA account password has been successfully changed.
              </p>

              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>When:</strong> ${new Date().toLocaleString()}<br>
                  <strong>Account:</strong> ${data.email}
                </p>
              </div>

              <p style="font-size: 16px; margin-bottom: 25px;">
                You can now use your new password to log in to SCAFOMA and continue enjoying your favorite campus meals.
              </p>

              <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>Didn't change your password?</strong><br>
                  If you didn't make this change, please contact our support team immediately to secure your account.
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseURL}/login"
                   style="background: #A40C2D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(164, 12, 45, 0.3);">
                  Login to SCAFOMA
                </a>
              </div>
            </div>

            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>© 2024 SCAFOMA. All rights reserved.</p>
              <p>This email was sent from an automated system. Please do not reply.</p>
            </div>
          </div>
        `,
      };

    case 'login_alert':
      return {
        subject: 'New Login to Your SCAFOMA Account',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">New Login Detected</h1>
              <p style="color: #fff; margin: 10px 0 0 0; opacity: 0.9;">Account security notification</p>
            </div>

            <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hello <strong>${data.firstName} ${data.lastName}</strong>,
              </p>

              <p style="font-size: 16px; margin-bottom: 25px;">
                We detected a new login to your SCAFOMA account. Here are the details:
              </p>

              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>Time:</strong> ${new Date().toLocaleString()}<br>
                  <strong>Email:</strong> ${data.email}<br>
                  <strong>Device:</strong> ${data.device || 'Mobile Device'}<br>
                  <strong>Location:</strong> ${data.location || 'Unknown'}
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <p style="font-size: 16px; margin-bottom: 15px;">Was this you?</p>
                <div style="display: inline-flex; gap: 15px;">
                  <div style="background: #d1fae5; color: #065f46; padding: 10px 20px; border-radius: 20px; font-weight: bold;">
                    ✓ Yes, this was me
                  </div>
                </div>
              </div>

              <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0; font-size: 14px; color: #b91c1c;">
                  <strong>Wasn't you?</strong><br>
                  If this wasn't you, please change your password immediately and contact our support team.
                </p>
              </div>
            </div>

            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>© 2024 SCAFOMA. All rights reserved.</p>
              <p>This email was sent from an automated system. Please do not reply.</p>
            </div>
          </div>
        `,
      };

    default:
      return { subject: '', html: '' };
  }
};

// Send email function
export const sendEmail = async (to, type, data = {}) => {
  try {
    const transporter = createTransporter();
    const template = getEmailTemplate(type, data);

    if (!template.subject || !template.html) {
      throw new Error('Invalid email template type');
    }

    const mailOptions = {
      from: {
        name: 'SCAFOMA',
        address: process.env.EMAIL_USER
      },
      to,
      subject: template.subject,
      html: template.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email with verification
export const sendWelcomeEmail = async (email, firstName, lastName) => {
  const token = generateVerificationToken();

  // Store verification token
  const tokenStored = await storeVerificationToken(email, token);
  if (!tokenStored) {
    return { success: false, message: 'Failed to store verification token' };
  }

  // Send welcome email
  const emailResult = await sendEmail(email, 'welcome', {
    firstName,
    lastName,
    token,
  });

  return emailResult;
};

// Send password reset OTP
export const sendPasswordResetOTP = async (email) => {
  const otp = generateOTP();

  // Store OTP
  const otpStored = await storeOTP(email, otp, 'password_reset');
  if (!otpStored) {
    return { success: false, message: 'Failed to store OTP' };
  }

  // Send email
  const emailResult = await sendEmail(email, 'password_reset', { otp });

  return emailResult;
};

// Send password changed notification
export const sendPasswordChangedEmail = async (email) => {
  const emailResult = await sendEmail(email, 'password_changed', { email });
  return emailResult;
};

// Send login alert
export const sendLoginAlert = async (email, firstName, lastName, loginData = {}) => {
  const emailResult = await sendEmail(email, 'login_alert', {
    email,
    firstName,
    lastName,
    device: loginData.device,
    location: loginData.location,
  });

  return emailResult;
};

// Cleanup expired tokens and OTPs (should be run periodically)
export const cleanupExpiredTokens = async () => {
  try {
    await pool.query('DELETE FROM tblemailverification WHERE expires_at < CURRENT_TIMESTAMP');
    console.log('Expired tokens cleaned up successfully');
    return true;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return false;
  }
};
