const { hairlineWidth } = require('nativewind/theme');
const tailwindColors = require('tailwindcss/colors');

// Brand scale sourced from the Shopper Figma file (fileKey
// HbQCCdkrJDE9BzznluMmz8, variables Orange/50-700, Neutral/50,300-900).
// Spread over Tailwind's stock scale so any shade Figma hasn't defined
// yet (e.g. neutral-100/200) still resolves instead of silently
// producing no class.
const brandOrange = {
  ...tailwindColors.orange,
  50: '#fff0e5',
  100: '#ffe1cb',
  200: '#ffc294',
  300: '#ffa058',
  400: '#ff770f',
  500: '#e36200',
  600: '#a74800',
  700: '#6f3000',
};
const brandNeutral = {
  ...tailwindColors.neutral,
  50: '#fafafa',
  300: '#e5e7eb',
  400: '#d1d5db',
  500: '#9ca3af',
  600: '#6b7280',
  700: '#4b5563',
  800: '#2d3748',
  900: '#1f2937',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        orange: brandOrange,
        neutral: brandNeutral,
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        // Loaded via @expo-google-fonts/{inter,poppins} in app/_layout.tsx —
        // family names must match those package exports exactly.
        poppins: ['Poppins_400Regular'],
        inter: ['Inter_400Regular'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [require('tailwindcss-animate')],
};
