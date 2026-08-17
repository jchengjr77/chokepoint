import { createContext, useContext } from 'react';

// Avoids threading `fontsLoaded` through every screen's props once
// routes are tab-navigated rather than a single component tree.
const FontsContext = createContext(false);

export function FontsProvider({ loaded, children }: { loaded: boolean; children: React.ReactNode }) {
  return <FontsContext.Provider value={loaded}>{children}</FontsContext.Provider>;
}

export function useFontsLoaded(): boolean {
  return useContext(FontsContext);
}
