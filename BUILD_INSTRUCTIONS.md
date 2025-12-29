# APK Build Instructions

## ✅ Configuration Complete

Your app is fully configured:
- **App Name**: WAQF DCB
- **Package**: com.waqf.dcb
- **Icon**: waqf.png ✅
- **All checks passed**: 17/17

## 🚀 Build Options

### Option 1: EAS Build (Cloud - Recommended)

**Step 1: Login to Expo**
```bash
eas login
```

**Step 2: Configure EAS Project**
```bash
eas build:configure
```
(Answer "yes" when prompted to create EAS project)

**Step 3: Build APK**
```bash
npm run build:android:apk
```

The build will run on Expo's servers (takes 10-20 minutes). You'll get a download link when complete.

---

### Option 2: Local Build (Requires Android Studio)

**Step 1: Generate Android Project**
```bash
npx expo prebuild --platform android --clean
```

**Step 2: Build APK with Gradle**
```bash
cd android
.\gradlew assembleRelease
```

**Step 3: Find the APK**
- Location: `android\app\build\outputs\apk\release\app-release.apk`
- Rename to: `WAQF-DCB-1.0.0.apk`

---

### Option 3: Expo Development Build (For Testing)

If you just want to test the app:
```bash
npx expo run:android
```

This will build and install on a connected device/emulator.

---

## 📋 Pre-Build Checklist

- ✅ waqf.png exists and is configured
- ✅ All dependencies installed
- ✅ expo-doctor shows 17/17 checks passed
- ✅ app.json configured correctly
- ✅ eas.json configured

## 🔍 Verify Before Building

Run this to ensure everything is ready:
```bash
npx expo-doctor
```

Expected: **17/17 checks passed. No issues detected!**

## 📱 After Building

1. Install APK on Android device
2. Verify app name shows as "WAQF DCB"
3. Check that waqf.png appears as app icon
4. Test all functionality

---

## ⚠️ Note

EAS Build requires:
- Expo account (free)
- Internet connection
- Build takes 10-20 minutes

Local build requires:
- Android Studio installed
- Android SDK configured
- More setup but faster builds
