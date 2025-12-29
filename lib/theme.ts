import { Platform } from 'react-native';

export const theme = {
  colors: {
    // App (two-tone)
    primary: '#0A7E43',
    secondary: '#2563EB',

    // Neutrals (OK to use broadly)
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F5F9',
    border: '#E5E7EB',
    text: '#0F172A',
    muted: '#64748B',

    // Semantic
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',

    // Charts are allowed to be multi-color
    chart: ['#0A7E43', '#2563EB', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'],
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
  },
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
} as const;

export type Theme = typeof theme;

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '').trim();
  if (![3, 6].includes(cleaned.length)) return null;
  const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}








