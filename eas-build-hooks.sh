#!/bin/bash
# EAS Build Hook to fix Gradle issues

echo "🔧 Fixing expo-linear-gradient Gradle configuration..."

GRADLE_FILE="node_modules/expo-linear-gradient/android/build.gradle"

if [ -f "$GRADLE_FILE" ]; then
  # Add maven plugin if missing
  if ! grep -q "apply plugin: 'maven'" "$GRADLE_FILE"; then
    # Add after first apply plugin statement
    sed -i "s/\(apply plugin: ['\"][^'\"]*['\"]\)/\1\napply plugin: 'maven'/" "$GRADLE_FILE"
    echo "✓ Added maven plugin"
  fi

  # Add compileSdk if missing
  if ! grep -q "compileSdk" "$GRADLE_FILE"; then
    sed -i "s/\(android\s*{\)/\1\n    compileSdk 35/" "$GRADLE_FILE"
    echo "✓ Added compileSdk 35"
  fi
fi

echo "✅ Gradle fixes applied"




