/**
 * Script to update all colors to Islamic theme
 * Run: node scripts/update_islamic_colors.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const colorReplacements = {
  '#003D99': '#0A7E43', // Blue -> Islamic Green
  '#1A9D5C': '#087A3A', // Light Green -> Darker Islamic Green
  '#FF9500': '#0A7E43', // Orange -> Islamic Green
  '#9C27B0': '#0A7E43', // Purple -> Islamic Green
};

const directories = [
  'app/admin',
  'app/inspector',
  'app/accounts',
  'app/reports',
  'components',
];

function updateColorsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const [oldColor, newColor] of Object.entries(colorReplacements)) {
    if (content.includes(oldColor)) {
      content = content.replace(new RegExp(oldColor.replace('#', '\\#'), 'g'), newColor);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
    return true;
  }
  return false;
}

// Note: This is a helper script - we'll do the updates manually for better control
console.log('Color replacement mappings:');
console.log(JSON.stringify(colorReplacements, null, 2));









