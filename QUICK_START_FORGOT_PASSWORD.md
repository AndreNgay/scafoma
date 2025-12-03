# Quick Start Guide - Forgot Password Feature

## 🚀 Setup in 5 Minutes

### Step 1: Configure Email Service (2 minutes)

1. **Get Gmail App Password**
   ```
   1. Go to https://myaccount.google.com/security
   2. Enable 2-Factor Authentication
   3. Click "App passwords"
   4. Generate new password for "Mail"
   5. Copy the 16-character password
   ```

2. **Add to `.env` file**
   ```bash
   cd C:\scafoma\backend
   # Edit .env file and add:
   
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Your app password
   FRONTEND_URL=http://localhost:3000
   ```

### Step 2: Restart Backend (1 minute)

```bash
cd C:\scafoma\backend
npm restart
```

### Step 3: Test the Feature (2 minutes)

#### Mobile App Test:
```bash
cd C:\scafoma\mobile-app
expo start --clear
```

1. Open app on device/simulator
2. Go to Sign In screen
3. Click "Forgot your password?"
4. Enter your email
5. Check email for OTP code
6. Enter code and reset password

#### Web App Test:
```bash
cd C:\scafoma\web-app
npm run dev
```

1. Open http://localhost:3000/forgot-password
2. Follow the same steps

## ✅ Quick Test

### Test Flow (1 minute)
```
1. Email: test@yourdomain.com
2. Click "Send Verification Code"
3. Check email inbox
4. Copy 6-digit code (e.g., 123456)
5. Enter code
6. New password: testpass123
7. Confirm password: testpass123
8. Click "Reset Password"
9. Login with new password ✓
```

## 🐛 Troubleshooting

### Email Not Received?
```bash
# Check backend console for errors
# Look for: "Password reset OTP sent to..."

# If not appearing:
1. Check .env EMAIL_* variables
2. Verify Gmail app password is correct
3. Check spam folder
4. Try different email address
```

### Rate Limit Error?
```
Wait 60 seconds between resend requests
```

### OTP Invalid/Expired?
```
OTP expires in 10 minutes
Request a new one if expired
```

### Can't Login After Reset?
```
1. Clear browser cache
2. Use exact email (case doesn't matter)
3. Ensure password meets requirements (6+ chars)
```

## 📋 API Quick Reference

### Send OTP
```bash
curl -X POST http://localhost:5000/api-v1/forgot-password/request \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### Verify OTP
```bash
curl -X POST http://localhost:5000/api-v1/forgot-password/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","otp":"123456"}'
```

### Reset Password
```bash
curl -X POST http://localhost:5000/api-v1/forgot-password/reset \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","otp":"123456","newPassword":"newpass123"}'
```

## 🔑 Key Features

✅ **Email-based OTP** - 6-digit code sent to email
✅ **10-minute expiration** - Secure and time-limited
✅ **Rate limiting** - 60s cooldown between resends
✅ **One-time use** - OTP can't be reused
✅ **Password hashing** - Secure bcrypt encryption
✅ **Mobile & Web** - Works on both platforms

## 📱 User Experience

### Mobile App
- Clean 3-step wizard
- Auto-focus on inputs
- Countdown timer
- Toast notifications
- Loading states

### Web App
- Gradient background
- Progress dots
- Responsive design
- Smooth animations
- Loading spinners

## 🔒 Security Features

- Email enumeration prevention
- SQL injection protection
- Rate limiting
- OTP expiration
- Password strength validation
- Case-insensitive email matching

## 📧 Email Templates

Two email types are sent:

1. **Password Reset Email**
   - Contains 6-digit OTP
   - Expires in 10 minutes
   - Red gradient header
   - Security notice

2. **Password Changed Email**
   - Confirmation of reset
   - Timestamp included
   - Green gradient header
   - Security alert

## 🎯 Success Indicators

You'll know it's working when:
- ✅ Backend starts without errors
- ✅ Email appears in console logs
- ✅ User receives OTP email
- ✅ OTP verification succeeds
- ✅ Password reset succeeds
- ✅ Login works with new password

## 💡 Pro Tips

1. **Development:** Use your personal Gmail for testing
2. **Production:** Use dedicated email service (SendGrid, SES)
3. **Testing:** Create test accounts with + notation (user+test@gmail.com)
4. **Security:** Never commit .env file to git
5. **Monitoring:** Check logs regularly for failed attempts

## 🆘 Need Help?

### Check Logs
```bash
# Backend console shows:
# - OTP generation
# - Email sending status
# - Verification attempts
# - Password resets
```

### Database Check
```sql
-- Check if OTP was created
SELECT * FROM tblemailverification 
WHERE email = 'user@example.com' 
ORDER BY created_at DESC 
LIMIT 1;

-- Clean old OTPs if needed
DELETE FROM tblemailverification 
WHERE expires_at < CURRENT_TIMESTAMP;
```

### Common Environment Issues

**Windows:**
- Use Git Bash or PowerShell
- Ensure ports 5000 and 3000 are free
- Check Windows Firewall settings

**Mac/Linux:**
- Use Terminal
- May need `sudo` for ports < 1024
- Check firewall rules

## 🎓 Learning Resources

- Full docs: `FORGOT_PASSWORD_FEATURE.md`
- Summary: `FORGOT_PASSWORD_SUMMARY.md`
- Email service: `backend/services/emailService.js`
- Controller: `backend/controllers/forgotPasswordController.js`

## ⚡ Quick Commands

```bash
# Start everything
cd backend && npm start &
cd mobile-app && expo start &
cd web-app && npm run dev &

# Test API
curl -X POST http://localhost:5000/api-v1/forgot-password/request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'

# View logs
tail -f backend/logs/app.log

# Clear database OTPs
psql -U username -d dbname -c "DELETE FROM tblemailverification WHERE used = true;"
```

## 🎉 You're Done!

The forgot password feature is now ready to use. Test it with a real email address and verify the entire flow works smoothly!

---

**Need more details?** See `FORGOT_PASSWORD_FEATURE.md`
**Having issues?** Check troubleshooting section above
**Want to customize?** Edit email templates in `emailService.js`
