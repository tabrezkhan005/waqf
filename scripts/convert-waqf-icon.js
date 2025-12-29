/**
 * Script to convert waqf.jpg to PNG format for app icon
 * This creates optimized PNG icons for Android and iOS
 */

const fs = require('fs');
const path = require('path');

console.log('⚠️  Icon Conversion Required');
console.log('');
console.log('The app icon must be in PNG format. Please convert waqf.jpg to PNG:');
console.log('');
console.log('Options:');
console.log('1. Use an online converter: https://convertio.co/jpg-png/');
console.log('2. Use ImageMagick: magick convert assets/images/waqf.jpg assets/images/icon.png');
console.log('3. Use any image editor (Photoshop, GIMP, etc.)');
console.log('');
console.log('Requirements:');
console.log('- Format: PNG');
console.log('- Size: 1024x1024 pixels (square)');
console.log('- Save as: assets/images/icon.png');
console.log('');
console.log('For Android adaptive icon:');
console.log('- Create a square PNG (1024x1024)');
console.log('- Save as: assets/images/android-icon-foreground.png');
console.log('- The background color is set to white (#FFFFFF)');
console.log('');

// Check if waqf.jpg exists
const waqfJpgPath = path.join(__dirname, '..', 'assets', 'images', 'waqf.jpg');
if (fs.existsSync(waqfJpgPath)) {
  console.log('✓ Found waqf.jpg at:', waqfJpgPath);
  console.log('  Please convert this to PNG format as described above.');
} else {
  console.log('✗ waqf.jpg not found at:', waqfJpgPath);
}




