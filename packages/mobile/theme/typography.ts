import { fontMono, fontMonoFallback } from './tokens'

type FontWeight = keyof typeof fontMono

/**
 * React Native has no `text-transform: uppercase` — screens that want the
 * web app's uppercase-label look must call .toUpperCase() on the string
 * itself; this only handles font selection.
 */
export function monoFont(weight: FontWeight, fontsLoaded: boolean): { fontFamily: string } {
  return { fontFamily: fontsLoaded ? fontMono[weight] : fontMonoFallback }
}
