import { pixelBasedPreset, type TailwindConfig } from '@react-email/components';

export const fahariTailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    fontFamily: {
      notion:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
  },
} satisfies TailwindConfig;
