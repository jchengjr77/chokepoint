export type ThemeId = 'albino-preto' | 'solarized' | 'gruvbox' | 'github' | 'synthwave84'
export type ThemeMode = 'dark' | 'light'

export interface ThemeMeta {
  id: ThemeId
  label: string
}

export const THEMES: ThemeMeta[] = [
  { id: 'albino-preto', label: 'Albino and Preto' },
  { id: 'solarized', label: 'Solarized' },
  { id: 'gruvbox', label: 'Gruvbox' },
  { id: 'github', label: 'GitHub' },
  { id: 'synthwave84', label: "Synthwave '84" },
]

export const DEFAULT_THEME: ThemeId = 'albino-preto'
export const DEFAULT_MODE: ThemeMode = 'dark'
