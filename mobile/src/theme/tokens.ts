import { Platform } from 'react-native'

/**
 * Tailor tokens. The same values are documented in the PWA.
 * White cards, ink text, one blue accent.
 * Wordmark: Georgia, the native stand-in for Fraunces. UI: system sans, the stand-in for Figtree.
 */
const pink = {
  paper: '#fff7fa',
  paperRaised: '#FFFFFF',
  paperSunken: '#ffe4ee',
  ink: '#2a1220',
  inkSoft: '#6d4458',
  inkFaint: '#a37b8d',
  brass: '#e23d78',
  brassSoft: '#f3a3c0',
  line: '#f3d5e0',
  positive: '#2F5D45',
  alert: '#9a3412',
}

export const palettes = {
  light: pink,
  dark: {
    ...pink,
    paper: '#1a1016',
    paperRaised: '#26151d',
    paperSunken: '#3a2230',
    ink: '#f8eef2',
    inkSoft: '#e3c4d2',
    inkFaint: '#b890a0',
    brass: '#ff6b9d',
    brassSoft: '#ffb3cc',
    line: '#4d3140',
    alert: '#ffb4a2',
  },
} as const

export const tokens = {
  color: palettes.light,
  font: {
    serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) ?? 'serif',
    sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) ?? 'System',
  },
  radius: { sm: 8, md: 14, lg: 22 },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
} as const
