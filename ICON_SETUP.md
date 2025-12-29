# Icon Setup Instructions

## ⚠️ Required: Convert waqf.jpg to PNG

The app icon **must** be in PNG format for Android builds. The current `waqf.jpg` needs to be converted.

## Quick Setup Steps

### Step 1: Convert waqf.jpg to PNG

**Option A: Using Online Converter (Easiest)**
1. Go to https://convertio.co/jpg-png/ or https://cloudconvert.com/jpg-to-png
2. Upload `assets/images/waqf.jpg`
3. Download the converted PNG
4. Save as `assets/images/icon.png` (1024x1024 pixels recommended)

**Option B: Using ImageMagick (If installed)**
```bash
magick convert assets/images/waqf.jpg -resize 1024x1024 assets/images/icon.png
```

**Option C: Using Python (If you have PIL/Pillow)**
```python
from PIL import Image
img = Image.open('assets/images/waqf.jpg')
img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
img.save('assets/images/icon.png', 'PNG')
```

### Step 2: Create Android Adaptive Icon

For Android adaptive icon, you need a square PNG:
1. Use the same `icon.png` or create a square version
2. Save as `assets/images/android-icon-foreground.png`
3. Ensure it's 1024x1024 pixels
4. The background color is set to white (#FFFFFF) in app.json

### Step 3: Verify Files

After conversion, ensure these files exist:
- ✅ `assets/images/icon.png` (1024x1024 PNG)
- ✅ `assets/images/android-icon-foreground.png` (1024x1024 PNG)

### Step 4: Test Configuration

Run this to verify:
```bash
npx expo-doctor
```

All icon-related errors should be resolved.

## Current Configuration

The `app.json` is configured to use:
- **Main Icon**: `./assets/images/icon.png`
- **Android Adaptive Icon**: `./assets/images/android-icon-foreground.png`
- **Background Color**: White (#FFFFFF)

## After Conversion

Once you've converted the icons, you can proceed with building the APK:

```bash
npm run build:android:apk
```




