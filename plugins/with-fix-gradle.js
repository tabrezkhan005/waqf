const { withDangerousMod, withAppBuildGradle, withSettingsGradle } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to fix Gradle build issues
 * Fixes expo-linear-gradient maven plugin and compileSdk errors
 */
function withFixGradle(config) {
  // Fix 1: Ensure autolinking in settings.gradle
  config = withSettingsGradle(config, (config) => {
    if (config.modResults.contents) {
      // Check if autolinking is already present
      if (!config.modResults.contents.includes('autolinking')) {
        // Add autolinking after rootProject.name
        config.modResults.contents = config.modResults.contents.replace(
          /(rootProject\.name\s*=\s*['"][^'"]+['"])/,
          "$1\napply from: new File([\"node\", \"--print\", \"require.resolve('@expo/autolinking/package.json', { paths: [require.resolve('expo/package.json')] })\"].execute().text.trim(), \"../scripts/autolinking.gradle\")"
        );
      }
    }
    return config;
  });

  // Fix 2: Fix expo-linear-gradient build.gradle
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

        // Fix 1: Add maven plugin if missing (use maven-publish instead)
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
