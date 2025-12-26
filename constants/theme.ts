/**
 * Islamic Theme Colors
 * Based on traditional Islamic color palette with green as primary
 */

import { Platform } from 'react-native';

// Islamic Green - Primary color (from login page)
const islamicGreen = '#0A7E43';
const islamicGreenDark = '#087A3A';
const islamicGreenLight = '#0FA855';

// Complementary colors
const gold = '#D4AF37'; // Islamic gold
const cream = '#F5F5DC'; // Light cream
const darkGreen = '#064E2B'; // Dark green for text
const lightGreen = '#E8F5E9'; // Light green background

const tintColorLight = islamicGreen;
const tintColorDark = islamicGreenLight;

export const Colors = {
  light: {
    text: '#0F0F0F',
    background: '#F8FAFC',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // Islamic theme colors
    primary: islamicGreen,
    primaryDark: islamicGreenDark,
    primaryLight: islamicGreenLight,
    secondary: gold,
    accent: '#1A9D5C',
    backgroundLight: lightGreen,
    cream: cream,
    textDark: darkGreen,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    // Islamic theme colors
    primary: islamicGreenLight,
    primaryDark: islamicGreen,
    primaryLight: '#12C463',
    secondary: gold,
    accent: '#1A9D5C',
    backgroundLight: '#1A3A2A',
    cream: '#2A2A1A',
    textDark: '#E8F5E9',
  },
};

// Role-based colors (all using Islamic green variations)
export const RoleColors = {
  admin: '#0A7E43', // Islamic Green
  inspector: '#0A7E43', // Islamic Green
  accounts: '#0A7E43', // Islamic Green
  reports: '#0A7E43', // Islamic Green
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
