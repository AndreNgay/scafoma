# Forgot Password Feature Documentation

## Overview

The Forgot Password feature provides a secure way for users to reset their passwords using email verification. The implementation includes OTP (One-Time Password) verification, rate limiting, and comprehensive security measures.

## Feature Components

### Backend Implementation

#### 1. Email Service (`backend/services/emailService.js`)

**Functions:**
- `generateOTP()` - Generates a 6-digit OTP
- `storeOTP(email, otp, type)` - Stores OTP in database with 10-minute expiration
- `verifyOTP(email, otp, type)` - Verifies OTP and marks as used
- `sendEmail(email, type, data)` - Sends formatted emails

**Email Templates:**
- **password_reset** - Sends OTP to user
- **password_changed** - Confirms password was changed

#### 2. Forgot Password Controller (`backend/controllers/forgotPasswordController.js`)

**Endpoints:**

1. **Request Password Reset**
   - `POST /api-v1/forgot-password/request`
   - Body: `{ email: string }`
   - Sends OTP to user's email
   - Returns success even if email doesn't exist (security)

2. **Verify OTP**
   - `POST /api-v1/forgot-password/verify-otp`
   - Body: `{ email: string, otp: string }`
   - Validates OTP and checks expiration
   - Marks OTP as used after verification

3. **Reset Password**
   - `POST /api-v1/forgot-password/reset`
   - Body: `{ email: string, otp: string, newPassword: string }`
   - Validates OTP one more time
   - Updates password with hashed version
   - Sends confirmation email
   - Deletes all OTPs for the email

4. **Resend OTP**
   - `POST /api-v1/forgot-password/resend-otp`
   - Body: `{ email: string }`
   - Rate limited to 1 minute between requests
   - Generates and sends new OTP

5. **Check OTP Validity** (Utility)
   - `GET /api-v1/forgot-password/check-otp?email=user@example.com`
   - Returns OTP validity status and remaining time

#### 3. Routes (`backend/routes/forgotPasswordRoutes.js`)

All routes are publicly accessible (no authentication required):
```javascript
POST   /api-v1/forgot-password/request      // Request password reset
POST   /api-v1/forgot-password/verify-otp   // Verify OTP
POST   /api-v1/forgot-password/reset        // Reset password
POST   /api-v1/forgot-password/resend-otp   // Resend OTP
GET    /api-v1/forgot-password/check-otp    // Check OTP validity
```

### Mobile App Implementation

#### File: `mobile-app/app/screens/auth/ForgotPassword.tsx`

**Features:**
- Three-step process (Email → OTP → Reset)
- Email validation
- 6-digit OTP input
- Countdown timer for resend (60 seconds)
- Password validation (minimum 6 characters)
- Password confirmation with paste prevention
- Loading states for all actions
- Error handling with toast notifications
- Keyboard-aware scrolling
- Auto-focus on inputs

**State Management:**
```typescript
- email: string
- otp: string (6 digits)
- newPassword: string
- confirmPassword: string
- step: 'email' | 'otp' | 'reset'
- loading: boolean
- resendLoading: boolean
- countdown: number (60s timer)
```

**User Flow:**
1. Enter email → Send OTP
2. Enter 6-digit code → Verify OTP
3. Enter new password → Reset password
4. Redirect to Sign In

### Web App Implementation

#### File: `web-app/src/pages/auth/forgot-password.jsx`

**Features:**
- Responsive design with gradient background
- Three-step wizard with progress indicator
- Form validation
- Countdown timer for resend
- Loading spinners
- Smooth transitions
- Error handling with toast notifications

**UI Components:**
- Step indicators (dots)
- Large OTP input field
- Password strength hint
- Resend button with countdown
- Back navigation buttons

## Security Features

### 1. Email Privacy
- Returns success message even if email doesn't exist
- Prevents email enumeration attacks

### 2. OTP Security
- 6-digit random OTP
- 10-minute expiration time
- One-time use (marked as used after verification)
- Stored in database with timestamp
- Deleted after password reset

### 3. Rate Limiting
- 1-minute cooldown between resend requests
- Prevents OTP spam
- Server-side enforcement

### 4. Password Security
- Minimum 6 characters
- Hashed using bcrypt
- Password confirmation required
- Paste prevention on confirm field (mobile)

### 5. Database Security
- Parameterized queries (SQL injection prevention)
- Email normalization (case-insensitive)
- Automatic cleanup of expired OTPs

## Database Schema

### Table: `tblemailverification`

```sql
CREATE TABLE tblemailverification (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    otp_code VARCHAR(6),
    verification_token VARCHAR(64),
    verification_type VARCHAR(20) NOT NULL DEFAULT 'email_verification',
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `email` - User's email address
- `otp_code` - 6-digit verification code
- `verification_type` - 'password_reset' for this feature
- `expires_at` - Expiration timestamp (10 minutes)
- `used` - Whether OTP has been used
- `created_at` - When OTP was generated

## API Request/Response Examples

### 1. Request Password Reset

**Request:**
```bash
POST /api-v1/forgot-password/request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Password reset code has been sent to your email."
}
```

**Response (Error):**
```json
{
  "status": "failed",
  "message": "Email is required"
}
```

### 2. Verify OTP

**Request:**
```bash
POST /api-v1/forgot-password/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "OTP verified successfully. You can now reset your password."
}
```

**Response (Error):**
```json
{
  "status": "failed",
  "message": "Invalid or expired OTP"
}
```

### 3. Reset Password

**Request:**
```bash
POST /api-v1/forgot-password/reset
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newSecurePassword123"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Password has been reset successfully. You can now login with your new password."
}
```

**Response (Error):**
```json
{
  "status": "failed",
  "message": "Invalid or expired OTP. Please request a new password reset code."
}
```

### 4. Resend OTP

**Request:**
```bash
POST /api-v1/forgot-password/resend-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "A new password reset code has been sent to your email."
}
```

**Response (Rate Limited):**
```json
{
  "status": "failed",
  "message": "Please wait at least 1 minute before requesting a new code."
}
```

## Email Configuration

### Environment Variables

Required environment variables in `.env`:

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account → Security
   - Select "2-Step Verification"
   - Scroll to "App passwords"
   - Generate a new app password
   - Use this password in `EMAIL_PASSWORD`

### Email Template Customization

Email templates are in `backend/services/emailService.js`:

- **Colors:** Gradient uses `#A40C2D` (primary red)
- **Logo:** Can be added to email header
- **Content:** Modify HTML in `getEmailTemplate()` function

## Testing

### Manual Testing Checklist

- [ ] Enter invalid email format → Shows validation error
- [ ] Enter non-existent email → Shows success (security)
- [ ] Enter valid email → Receives OTP email
- [ ] Enter wrong OTP → Shows error
- [ ] Enter expired OTP → Shows error
- [ ] Enter correct OTP → Proceeds to password reset
- [ ] Enter password < 6 chars → Shows error
- [ ] Enter mismatched passwords → Shows error
- [ ] Enter valid passwords → Resets password
- [ ] Click resend before 60s → Button disabled
- [ ] Click resend after 60s → Sends new OTP
- [ ] Login with old password → Fails
- [ ] Login with new password → Success
- [ ] Receive password changed email → Confirms reset

### Test User Flow

```
1. User clicks "Forgot Password" on sign-in page
2. User enters email: test@example.com
3. User clicks "Send Verification Code"
4. System sends OTP email (e.g., 123456)
5. User enters OTP: 123456
6. User clicks "Verify Code"
7. System validates OTP
8. User enters new password
9. User confirms new password
10. User clicks "Reset Password"
11. System updates password
12. System sends confirmation email
13. User redirected to sign-in page
14. User logs in with new password
```

## Error Handling

### Client-Side Errors

| Error | Message | Solution |
|-------|---------|----------|
| Empty email | "Please enter your email" | Fill email field |
| Invalid email | "Please enter a valid email address" | Use correct email format |
| Empty OTP | "Please enter the verification code" | Fill OTP field |
| Invalid OTP length | "Verification code must be 6 digits" | Enter 6 digits |
| Empty password | "Please fill in both password fields" | Fill password fields |
| Short password | "Password must be at least 6 characters" | Use longer password |
| Password mismatch | "Passwords do not match" | Match passwords |

### Server-Side Errors

| Status | Error | Reason |
|--------|-------|--------|
| 400 | "Email is required" | Missing email in request |
| 400 | "Invalid or expired OTP" | OTP incorrect or expired |
| 404 | "User not found" | Email doesn't exist |
| 429 | "Please wait at least 1 minute..." | Rate limit hit |
| 500 | "Failed to send email" | Email service error |
| 500 | "Internal server error" | Database or server issue |

## Best Practices

### For Users

1. Check spam folder for OTP email
2. Use strong passwords (8+ characters recommended)
3. Don't share OTP with anyone
4. Complete reset within 10 minutes
5. Contact support if issues persist

### For Developers

1. Never log OTPs in production
2. Use environment variables for email config
3. Monitor email delivery rates
4. Set up email retry logic
5. Implement proper logging
6. Regular security audits
7. Keep dependencies updated

## Troubleshooting

### Issue: Emails not sending

**Solutions:**
1. Check email credentials in `.env`
2. Verify email service is enabled
3. Check firewall/network settings
4. Test with Gmail app password
5. Check email service logs

### Issue: OTP expired too quickly

**Solutions:**
1. Check server timezone settings
2. Verify database timezone
3. Adjust expiration time (currently 10 min)
4. Check system clock accuracy

### Issue: Rate limiting too strict

**Solutions:**
1. Adjust cooldown period (currently 60s)
2. Implement per-IP rate limiting
3. Add CAPTCHA for repeated attempts
4. Monitor abuse patterns

### Issue: Passwords not matching requirements

**Solutions:**
1. Display password requirements clearly
2. Add real-time validation
3. Show password strength meter
4. Provide example passwords

## Security Considerations

### Potential Vulnerabilities

1. **Email Enumeration**
   - ✅ Mitigated by returning success for any email

2. **OTP Brute Force**
   - ✅ Mitigated by 10-minute expiration
   - ✅ Mitigated by one-time use
   - ⚠️ Consider adding attempt limits

3. **Replay Attacks**
   - ✅ Mitigated by marking OTP as used
   - ✅ Mitigated by short expiration

4. **Man-in-the-Middle**
   - ⚠️ Ensure HTTPS in production
   - ⚠️ Use secure email connection (TLS)

5. **Account Takeover**
   - ✅ OTP sent to registered email only
   - ✅ Password must meet minimum length
   - ⚠️ Consider 2FA for additional security

## Future Enhancements

### Recommended Improvements

1. **SMS OTP** - Alternative to email OTP
2. **CAPTCHA** - Prevent automated abuse
3. **Account Recovery** - Multiple verification methods
4. **Password Strength Meter** - Real-time feedback
5. **Login Notification** - Alert on password change
6. **Password History** - Prevent reusing old passwords
7. **Attempt Limits** - Lock account after X failed attempts
8. **IP Logging** - Track reset requests by IP
9. **Device Fingerprinting** - Detect suspicious devices
10. **Backup Codes** - Alternative recovery method

### Analytics to Track

- Password reset request rate
- OTP verification success rate
- Email delivery success rate
- Average completion time
- Common failure points
- Peak usage times

## Maintenance

### Regular Tasks

- Clear expired OTPs from database (automated)
- Monitor email bounce rates
- Review error logs weekly
- Update dependencies monthly
- Security audit quarterly
- Load testing before major releases

### Database Cleanup

Run periodically to remove old verification records:

```sql
DELETE FROM tblemailverification
WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
```

## Support

### For Users

If you're having trouble resetting your password:
1. Check your spam/junk folder
2. Wait 60 seconds and try resending
3. Ensure you're using the registered email
4. Try a different browser
5. Contact support with your email

### For Developers

Common development issues:
- Email not configured: Check `.env` file
- OTP not found: Check database connection
- CORS errors: Update allowed origins
- Timeout errors: Increase API timeout

## Conclusion

The Forgot Password feature provides a secure, user-friendly way to reset passwords using email verification. The implementation follows security best practices including OTP expiration, rate limiting, and protection against common attacks.

---

**Version:** 1.0.0
**Last Updated:** 2024
**Status:** ✅ Production Ready