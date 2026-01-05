const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to fix Gradle build issues
 * Fixes expo-linear-gradient maven plugin and compileSdk errors
 */
function withFixGradle(config) {
  // Fix expo-linear-gradient build.gradle
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const gradlePath = path.join(
        projectRoot,
        'node_modules',
        'expo-linear-gradient',
        'android',
        'build.gradle'
      );

      if (fs.existsSync(gradlePath)) {
        let gradleContent = fs.readFileSync(gradlePath, 'utf8');
        let modified = false;

        // Fix 1: Add maven-publish plugin if missing
        if (!gradleContent.includes("apply plugin: 'maven'") && !gradleContent.includes("apply plugin: 'maven-publish'")) {
          // Add maven-publish plugin (modern replacement for maven plugin)
          if (gradleContent.includes('apply plugin:')) {
            gradleContent = gradleContent.replace(
              /(apply plugin: ['"][^'"]+['"])/,
              "$1\napply plugin: 'maven-publish'"
            );
            modified = true;
          }
        }

        // Fix 2: Add compileSdk if missing
        if (!gradleContent.includes('compileSdk')) {
          if (gradleContent.includes('android {')) {
            gradleContent = gradleContent.replace(
              /(android\s*\{)/,
              "$1\n    compileSdk 35"
            );
            modified = true;
          }
        }

        if (modified) {
          fs.writeFileSync(gradlePath, gradleContent, 'utf8');
          console.log('✓ Fixed expo-linear-gradient build.gradle');
        }
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withFixGradle;
