import libraryData from '../data/library.json'
import type { Library, LibraryEntry, Ruleset } from '../types'

export const library = libraryData as Library

const allEntries: LibraryEntry[] = [...library.positions, ...library.submissions]
const entryById = new Map(allEntries.map((e) => [e.id, e]))

export function getLibraryEntry(id: string): LibraryEntry | undefined {
  return entryById.get(id)
}

export function entryMatchesRuleset(entry: LibraryEntry, ruleset: Ruleset): boolean {
  return entry.rulesets.includes(ruleset)
}

export function getSuggestedTransitions(libraryId: string): typeof library.knownTransitions {
  return library.knownTransitions.filter((t) => t.sourceId === libraryId || t.targetId === libraryId)
}
