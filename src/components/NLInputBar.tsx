import { useState, type FormEvent } from 'react'
import { parseNaturalLanguage } from '../lib/nlParse'
import type { LibraryEntry, NLParseResult } from '../types'

interface NLInputBarProps {
  existingLibraryIds: string[]
  customEntries: LibraryEntry[]
  onResult: (result: NLParseResult) => void
}

export function NLInputBar({ existingLibraryIds, customEntries, onResult }: NLInputBarProps) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await parseNaturalLanguage(text, existingLibraryIds, customEntries)
      const nothingFound = result.nodes.length === 0 && result.edges.length === 0 && result.unrecognized.length === 0
      if (nothingFound) {
        // Off-topic or unrelated input (e.g. a random question) — don't
        // open the review modal for a no-op, just say so inline.
        setError("Didn't recognize any BJJ training in that — try describing what you drilled.")
        return
      }
      onResult(result)
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse input')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex h-14 shrink-0 items-center gap-2 border-t border-border bg-bg-surface px-3"
    >
      <span className="font-semibold text-node-submission">&gt;</span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What did you learn today?"
        disabled={busy}
        className="flex-1 border-0 bg-transparent py-1 text-[12px] text-text-primary outline-none placeholder:text-text-tertiary disabled:opacity-50"
        style={{ caretColor: '#ffffff' }}
      />
      {error && <span className="text-[11px]" style={{ color: '#ff5555' }}>{error}</span>}
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="border border-border px-3 py-1.5 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated disabled:opacity-40"
      >
        {busy ? 'Parsing...' : 'Send'}
      </button>
    </form>
  )
}
