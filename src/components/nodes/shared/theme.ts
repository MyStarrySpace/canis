import type { NodeTheme } from '../../../types';

export interface ThemeColors {
  bg: string;
  bgTint: (color: string) => string;
  text: string;
  textSecondary: string;
  textMuted: string;
  selectionColor: string;
}

const dark: ThemeColors = {
  bg: 'rgba(26, 15, 10, 0.9)',
  bgTint: (color) => `${color}10`,
  text: '#f9fafb',
  textSecondary: '#e5e7eb',
  textMuted: '#9ca3af',
  selectionColor: '#fbbf24',
};

const light: ThemeColors = {
  bg: '#ffffff',
  bgTint: (color) => `${color}08`,
  text: '#2d2d2d',
  textSecondary: '#4a4a4a',
  textMuted: '#7a7a7a',
  selectionColor: '#e36216',
};

export function getTheme(theme?: NodeTheme): ThemeColors {
  return theme === 'light' ? light : dark;
}
