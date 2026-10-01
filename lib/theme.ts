import { DarkTheme, DefaultTheme, type Theme } from 'expo-router/react-navigation';

// Mirrors the HSL tokens in global.css — keep both in sync. Source:
// Shopper Figma file (fileKey HbQCCdkrJDE9BzznluMmz8) variables
// Orange/50-700, Neutral/50,300-900, Red/500.
export const THEME = {
  light: {
    background: 'hsl(0 0% 98%)', // neutral-50 #fafafa
    foreground: 'hsl(215 27.9% 16.9%)', // neutral-900 #1f2937
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(215 27.9% 16.9%)', // neutral-900
    popover: 'hsl(0 0% 100%)',
    popoverForeground: 'hsl(215 27.9% 16.9%)', // neutral-900
    primary: 'hsl(25.9 100% 44.5%)', // orange-500 #e36200
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(25.4 100% 94.9%)', // orange-50 #fff0e5
    secondaryForeground: 'hsl(25.9 100% 21.8%)', // orange-700 #6f3000
    muted: 'hsl(220 13% 91%)', // neutral-300 #e5e7eb
    mutedForeground: 'hsl(220 8.9% 46.1%)', // neutral-600 #6b7280
    accent: 'hsl(25.4 100% 89.8%)', // orange-100 #ffe1cb
    accentForeground: 'hsl(25.9 100% 21.8%)', // orange-700
    destructive: 'hsl(0 65.1% 50.6%)', // red-500 #d32f2f
    border: 'hsl(220 13% 91%)', // neutral-300
    input: 'hsl(220 13% 91%)', // neutral-300
    ring: 'hsl(25.9 100% 44.5%)', // orange-500
    radius: '0.625rem',
    chart1: 'hsl(12 76% 61%)',
    chart2: 'hsl(173 58% 39%)',
    chart3: 'hsl(197 37% 24%)',
    chart4: 'hsl(43 74% 66%)',
    chart5: 'hsl(27 87% 67%)',
  },
  dark: {
    background: 'hsl(215 27.9% 16.9%)', // neutral-900
    foreground: 'hsl(0 0% 98%)', // neutral-50
    card: 'hsl(217.8 23.1% 22.9%)', // neutral-800 #2d3748
    cardForeground: 'hsl(0 0% 98%)', // neutral-50
    popover: 'hsl(217.8 23.1% 22.9%)', // neutral-800
    popoverForeground: 'hsl(0 0% 98%)', // neutral-50
    primary: 'hsl(26 100% 52.9%)', // orange-400 #ff770f
    primaryForeground: 'hsl(215 27.9% 16.9%)', // neutral-900
    secondary: 'hsl(25.9 100% 21.8%)', // orange-700
    secondaryForeground: 'hsl(25.4 100% 89.8%)', // orange-100
    muted: 'hsl(215 13.8% 34.1%)', // neutral-700 #4b5563
    mutedForeground: 'hsl(217.9 10.6% 64.9%)', // neutral-500 #9ca3af
    accent: 'hsl(25.9 100% 32.7%)', // orange-600 #a74800
    accentForeground: 'hsl(25.4 100% 89.8%)', // orange-100
    destructive: 'hsl(0 65.1% 50.6%)', // red-500
    border: 'hsl(215 13.8% 34.1%)', // neutral-700
    input: 'hsl(215 13.8% 34.1%)', // neutral-700
    ring: 'hsl(26 100% 52.9%)', // orange-400
    radius: '0.625rem',
    chart1: 'hsl(220 70% 50%)',
    chart2: 'hsl(160 60% 45%)',
    chart3: 'hsl(30 80% 55%)',
    chart4: 'hsl(280 65% 60%)',
    chart5: 'hsl(340 75% 55%)',
  },
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
