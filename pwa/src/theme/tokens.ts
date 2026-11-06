/**
 * Tailor tokens. The same values are documented in the mobile app.
 * Paper ground, ink text, one brass accent.
 * Wordmark: Fraunces. UI: Figtree.
 */
export const tokens = {
  color: {
    paper: '#F3EEE4',
    paperRaised: '#FBF7F0',
    paperSunken: '#E7E0D2',
    ink: '#1A1714',
    inkSoft: '#5E574C',
    inkFaint: '#8A8174',
    brass: '#9C6B2F',
    brassSoft: '#C4A574',
    line: '#D8CFC0',
    positive: '#2F5D45',
    alert: '#8E3B32',
  },
  font: {
    serif: '"Fraunces", "Iowan Old Style", Palatino, Georgia, serif',
    sans: '"Figtree", "Avenir Next", "Segoe UI", sans-serif',
  },
  radius: { sm: 8, md: 14, lg: 22 },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
} as const
