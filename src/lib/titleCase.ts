// Minor words that stay lowercase in a title-cased technique name unless
// they're the first word — matches conventional title-case style (e.g.
// "Berimbolo from De La Riva" rather than "Berimbolo From De La Riva").
const MINOR_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'to', 'from', 'of', 'on', 'in', 'with', 'vs'])

/**
 * Title-cases a technique/edge label parsed from natural language, e.g.
 * "kipping escape" -> "Kipping Escape". The NL parser is instructed to
 * return lowercase labels (easier for the model to produce consistently
 * than getting capitalization right itself), so this is applied
 * client-side rather than relied on from the model.
 */
export function toTitleCase(text: string): string {
  const words = text.trim().split(/\s+/)
  return words
    .map((word, i) => {
      if (word.length === 0) return word
      const lower = word.toLowerCase()
      if (i > 0 && MINOR_WORDS.has(lower)) return lower
      // Preserve internal casing for things like "McKenzie" or all-caps
      // abbreviations by only forcing the first letter — but a NL-parsed
      // technique name is realistically always plain lowercase words, so
      // this simple case (capitalize first letter, lowercase the rest)
      // covers it without over-engineering for inputs that won't occur.
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}
