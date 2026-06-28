import plugin from 'tailwindcss/plugin';
import { TailwindConfig } from '@react-email/components';

const colors = {
  // Backgrounds
  canvas: '#FAFAFA',
  bg: '#FFFFFF',
  'bg-2': '#F7F7F5',

  // Text
  fg: '#191919',
  'fg-2': '#37352F',
  'fg-3': '#787774',
  'fg-inverted': '#FFFFFF',

  // Borders
  stroke: '#E9E9E7',

  // Interactive
  brand: '#191919',
  'brand-hover': '#2F2F2F',
  'brand-active': '#111111',
  'brand-soft': '#F1F1EF',
} as const;

const fontScale = {
  11: {
    fontSize: '11px',
    lineHeight: '1.5',
    letterSpacing: '-0.033px',
    fontWeight: '300',
  },
  13: {
    fontSize: '13px',
    lineHeight: '1.5',
    letterSpacing: '-0.039px',
    fontWeight: '300',
  },
  14: { fontSize: '14px', lineHeight: '1.5' },
  15: {
    fontSize: '15px',
    lineHeight: '1.5',
    letterSpacing: '-0.075px',
    fontWeight: '500',
  },
  20: { fontSize: '20px', lineHeight: '1.2', letterSpacing: '-0.2px' },
  32: { fontSize: '32px', lineHeight: '1.2', letterSpacing: '-0.6px' },
  48: { fontSize: '48px', lineHeight: '1', letterSpacing: '-1.44px' },
  58: { fontSize: '58px', lineHeight: '1', letterSpacing: '-1.74px' },
  88: { fontSize: '88px', lineHeight: '1', letterSpacing: '-2.64px' },
} as const;

export const collageTailwindConfig: TailwindConfig = {
  plugins: [
    plugin(({ addUtilities, addVariant }) => {
      addVariant('mobile', '@media (max-width: 600px)');
      const utilities: Record<string, Record<string, string>> = {};
      for (const [step, token] of Object.entries(fontScale)) {
        utilities[`.font-${step}`] = token;
      }
      addUtilities(utilities);
    }),
  ],
  theme: {
    extend: {
      colors,
      boxShadow: {
        'collage-card':
          '0px 76px 21px 0px rgba(193,195,193,0), 0px 49px 19px 0px rgba(193,195,193,0.01), 0px 27px 16px 0px rgba(193,195,193,0.05), 0px 12px 12px 0px rgba(193,195,193,0.09), 0px 3px 7px 0px rgba(193,195,193,0.1)',
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
        inter: ['Inter', 'Arial', 'sans-serif'],
        mono: ['Roboto Mono', 'Courier New', 'monospace'],
      },
    },
  },
};
