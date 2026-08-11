import { useEffect, useState, type FormEvent } from 'react'
import { parseNaturalLanguage } from '../lib/nlParse'
import type { LibraryEntry, NLParseResult } from '../types'

interface NLInputBarProps {
  existingLibraryIds: string[]
  customEntries: LibraryEntry[]
  onResult: (result: NLParseResult) => void
  /** Bumped by the parent once the previewed result is actually applied
   * (confirmed, not canceled) — only then is the input cleared. If the
   * user cancels the preview instead, the text stays so they can tweak
   * and resubmit without retyping everything. */
  clearToken: number
}

export function NLInputBar({ existingLibraryIds, customEntries, onResult, clearToken }: NLInputBarProps) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setText('')
  }, [clearToken])

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
        setError("Didn't recognize any grappling training in that — try describing what you trained.")
        return
      }
      // Text is intentionally kept until the parent confirms the result
      // was applied (see clearToken) — canceling the preview should let
      // the user edit and resubmit, not retype from scratch.
      onResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse input')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative shrink-0 border-t border-border bg-bg-surface">
      {error && (
        <p
          className="border-b border-border px-3 py-1.5 text-[11px] leading-snug sm:absolute sm:-top-8 sm:left-0 sm:right-0 sm:border sm:bg-bg-surface sm:px-3 sm:py-1"
          style={{ color: '#ff5555' }}
        >
          {error}
        </p>
      )}
      <form onSubmit={(e) => void handleSubmit(e)} className="flex h-14 items-center gap-2 px-3">
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
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="border border-border px-3 py-1.5 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated disabled:opacity-40"
        >
          {busy ? 'Parsing...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
