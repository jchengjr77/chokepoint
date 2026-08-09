import libraryData from '../data/library.json'
import type { Library, LibraryEntry, Ruleset } from '../types'

export const library = libraryData as Library

const staticEntries: LibraryEntry[] = [...library.positions, ...library.submissions]
const staticEntryById = new Map(staticEntries.map((e) => [e.id, e]))

// User-defined entries (added via the Add Position modal or NL preview's
// "define new" flow) live outside the static, bundled library.json — they
// come from the user_library_entries table and are loaded/kept in sync by
// useCustomLibrary. Most of the app calls getLibraryEntry synchronously in
// many places (layout, canvas rendering, import/export), so rather than
// thread an async/context lookup through all of them, custom entries are
// mirrored into this module-level map whenever they change. This is safe
// because custom entries are private per-user and never change from
// outside the current session.
const customEntryById = new Map<string, LibraryEntry>()

export function setCustomLibraryEntries(entries: LibraryEntry[]): void {
  customEntryById.clear()
  for (const entry of entries) customEntryById.set(entry.id, entry)
}

export function getLibraryEntry(id: string): LibraryEntry | undefined {
  return staticEntryById.get(id) ?? customEntryById.get(id)
}

export function isCustomLibraryEntry(id: string): boolean {
  return customEntryById.has(id) && !staticEntryById.has(id)
}

export function entryMatchesRuleset(entry: LibraryEntry, ruleset: Ruleset): boolean {
  return entry.rulesets.includes(ruleset)
}
