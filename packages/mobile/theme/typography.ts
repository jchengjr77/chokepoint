import { fontMono, fontMonoFallback } from './tokens'
import { useFontsLoaded } from './FontsContext'

type FontWeight = keyof typeof fontMono

/**
 * React Native has no `text-transform: uppercase` — screens that want the
 * web app's uppercase-label look must call .toUpperCase() on the string
 * itself; this only handles font selection.
 */
export function monoFont(weight: FontWeight, fontsLoaded: boolean): { fontFamily: string } {
  return { fontFamily: fontsLoaded ? fontMono[weight] : fontMonoFallback }
}

/** Same as monoFont, but reads fontsLoaded from context instead of a prop — for screens mounted under FontsProvider (see app/_layout.tsx) rather than passed it explicitly. */
export function useMonoFont() {
  const fontsLoaded = useFontsLoaded()
  return (weight: FontWeight = 'regular') => monoFont(weight, fontsLoaded)
}
