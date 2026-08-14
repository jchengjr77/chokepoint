// This package has no DOM lib (it must stay usable from React Native,
// which has no `window`/`navigator`), but a couple of call sites need to
// *check* for their existence at runtime (`typeof window !== 'undefined'`)
// to degrade safely on platforms where they're absent. These minimal
// ambient declarations let those guarded checks type-check without
// pulling in all of lib.dom.d.ts and asserting these are always present.
declare const window:
  | {
      location: { origin: string }
      addEventListener(type: 'online' | 'offline', listener: () => void): void
      removeEventListener(type: 'online' | 'offline', listener: () => void): void
    }
  | undefined
declare const navigator: { onLine: boolean } | undefined
