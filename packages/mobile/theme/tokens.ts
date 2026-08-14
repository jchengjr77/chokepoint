/**
 * v1 mobile theming is deliberately just the default "Albino and Preto"
 * dark palette (matching packages/web/src/index.css's :root block) as a
 * plain JS object — React Native has no CSS custom properties or
 * attribute-selector theming, so the other 5 web themes are out of scope
 * until a later phase. Update both files together if the default palette
 * changes.
 */
export const colors = {
  bgPrimary: '#000000',
  bgSurface: '#111111',
  bgElevated: '#1a1a1a',
  bgNode: '#222222',
  border: '#333333',
  borderFocus: '#666666',

  textPrimary: '#ffffff',
  textSecondary: '#999999',
  textTertiary: '#555555',

  nodePosition: '#ffffff',
  nodeSubmission: '#00cc66',
  edgeDefault: '#444444',
  edgeSubmission: '#00cc66',

  danger: '#ff5555',
} as const

export const radius = 3

/**
 * JetBrains Mono isn't a system font — must be loaded via useFonts (see
 * App.tsx) before use, using these exact keys. Falls back to the
 * platform monospace font while loading or if loading fails.
 */
export const fontMono = {
  regular: 'JetBrainsMono_400Regular',
  medium: 'JetBrainsMono_500Medium',
  semiBold: 'JetBrainsMono_600SemiBold',
  bold: 'JetBrainsMono_700Bold',
} as const
export const fontMonoFallback = 'monospace'
