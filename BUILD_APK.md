# Building WAQF DCB APK

## ⚠️ IMPORTANT: Icon Setup Required

**Before building, you MUST convert `waqf.jpg` to PNG format.**

See `ICON_SETUP.md` for detailed instructions.

## Configuration Complete ✅

The app has been configured with:
- **App Name**: WAQF DCB
- **Package Name**: com.waqf.dcb
- **Icon**: icon.png (PNG format required - see ICON_SETUP.md)
- **Version**: 1.0.0
- **Dependencies**: All peer dependencies installed

## Building the APK

### Option 1: Using EAS Build (Recommended - Cloud Build)

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure EAS** (first time only):
   ```bash
   eas build:configure
   ```

4. **Build APK**:
   ```bash
   npm run build:android:apk
   ```
   Or directly:
   ```bash
   eas build --platform android --profile preview
   ```

5. **Download the APK**:
   - The build will be done on Expo's servers
   - You'll get a download link when complete
   - The APK will be named something like: `waqf-dcb-1.0.0.apk`

### Option 2: Local Build (Requires Android Studio)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate Android project**:
   ```bash
   npx expo prebuild --platform android
   ```

3. **Build APK using Gradle**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

4. **Find the APK**:
   - Location: `android/app/build/outputs/apk/release/app-release.apk`
   - Rename it to: `WAQF-DCB-1.0.0.apk`

## Important Notes

⚠️ **Icon Format**: The app is configured to use `waqf.jpg` as the icon. Expo will automatically convert it to PNG format during the build process. However, for best results, you may want to:

1. Convert `waqf.jpg` to PNG format (1024x1024 pixels recommended)
2. Replace the icon path in `app.json` if you create a PNG version

## Build Profiles

- **preview**: Builds an APK for testing (no Google Play signing required)
- **production**: Builds a signed APK ready for Google Play Store

## Troubleshooting

If you encounter issues with the icon:
1. Ensure `assets/images/waqf.jpg` exists
2. The image should be square (1:1 aspect ratio) for best results
3. Recommended size: 1024x1024 pixels

## Next Steps

After building:
1. Test the APK on a device
2. Verify the app name shows as "WAQF DCB"
3. Check that the waqf.jpg logo appears as the app icon
4. Test all functionality before distribution
