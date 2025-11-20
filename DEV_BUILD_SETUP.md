# Development Build Setup Guide

This guide explains how to set up development builds for the Scafoma mobile app to enable full push notification testing.

## Why Development Build?

- Expo Go does NOT support push notifications (since SDK 53)
- Development builds allow full native functionality including push notifications
- You can test all features that aren't available in Expo Go

---

## For Project Leader (Owner Account)

### 1. Add Collaborator to Expo Account

1. Go to [Expo Dashboard](https://expo.dev/)
2. Select your project
3. Go to **Settings** → **Members**
4. Click **Invite Member**
5. Enter collaborator's email address
6. Select role: **Developer** (allows building)
7. Click **Send Invitation**

### 2. Add Collaborator to GitHub Repository

1. Go to your GitHub repository: `AndreNgay/scafoma`
2. Click **Settings** → **Collaborators**
3. Click **Add people**
4. Enter collaborator's GitHub username
5. Select role: **Write** (allows pushing code)
6. Click **Add**

---

## For Collaborator

### 1. Accept Invitations

- Check your email for Expo invitation → Click accept
- Check your email for GitHub invitation → Click accept

### 2. Install EAS CLI

```powershell
npm install -g eas-cli
```

### 3. Login to Expo

```powershell
cd C:\scafoma\mobile-app
eas login
```

Enter your Expo email and password.

### 4. Verify Access

```powershell
eas whoami
```

You should see your username.

### 5. Build Development Version for Android

```powershell
eas build --profile development --platform android
```

**What happens:**

- EAS builds the app in the cloud (takes 10-20 minutes)
- You get a download link for the APK file

### 6. Install APK on Android Device

1. Download the APK from the link EAS provides
2. Transfer to your Android phone
3. Enable "Install from Unknown Sources" in phone settings
4. Install the APK

### 7. Run Development Server

```powershell
cd C:\scafoma\mobile-app
npx expo start --dev-client
```

**On your phone:**

- Open the installed app (not Expo Go)
- Scan the QR code or enter the URL
- App will connect to your dev server

---

## For iOS (Optional - requires Mac)

```powershell
eas build --profile development --platform ios
```

**Note:** iOS builds require Apple Developer account ($99/year).

---

## Troubleshooting

### "Not authorized to access project"

- Project leader needs to add you as member in Expo dashboard

### "Build failed"

- Check `eas.json` is properly configured (already done in this project)
- Verify your Expo account has access

### "Push notifications not working"

- Make sure you're using the development build (NOT Expo Go)
- Check backend is running on accessible URL
- Verify notification permissions are granted on device

---

## What Can Be Tested After Build

✅ Push notifications (local and remote)
✅ Background app behavior
✅ All native device features
✅ Production-like experience

❌ Cannot test in Expo Go (notifications disabled)

---

## Quick Commands Reference

```powershell
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Check who you're logged in as
eas whoami

# Build for Android
eas build --profile development --platform android

# Run dev server
npx expo start --dev-client
```

---

## Notes

- Development builds are separate from Expo Go
- You need to rebuild when you change native code (like adding new packages)
- Changes to JavaScript/TypeScript don't need rebuild (hot reload works)
- Keep backend running and accessible from your phone's network
