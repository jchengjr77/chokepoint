import { useMemo, useState } from 'react'
import { library } from '../lib/library'
import type { LibraryEntry, NodeType, Ruleset, RulesetFilter } from '../types'

interface LibraryPickerModalProps {
  rulesetFilter: RulesetFilter
  existingLibraryIds: Set<string>
  onConfirm: (entries: Array<{ entry: LibraryEntry; type: NodeType }>) => void
  onCancel: () => void
}

function matchesRulesetFilter(entry: LibraryEntry, filter: RulesetFilter): boolean {
  if (filter === 'all') return true
  return entry.rulesets.includes(filter as Ruleset)
}

export function LibraryPickerModal({
  rulesetFilter,
  existingLibraryIds,
  onConfirm,
  onCancel,
}: LibraryPickerModalProps) {
  const [tab, setTab] = useState<NodeType>('position')
  const [query, setQuery] = useState('')
  const [pickerRuleset, setPickerRuleset] = useState<RulesetFilter>(rulesetFilter)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const entries = tab === 'position' ? library.positions : library.submissions

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (!matchesRulesetFilter(entry, pickerRuleset)) return false
      if (existingLibraryIds.has(entry.id)) return false
      if (!q) return true
      return (
        entry.label.toLowerCase().includes(q) ||
        entry.aliases.some((a) => a.toLowerCase().includes(q)) ||
        entry.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [entries, query, pickerRuleset, existingLibraryIds])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    const chosen = entries
      .filter((e) => selected.has(e.id))
      .map((entry) => ({ entry, type: tab }))
    onConfirm(chosen)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 sm:p-4" onClick={onCancel}>
      <div
        className="flex h-full w-full flex-col border-0 border-border bg-bg-surface sm:h-[70vh] sm:max-w-md sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-semibold uppercase text-text-primary">Add Node</h2>
          <button onClick={onCancel} className="text-[16px] text-text-secondary hover:text-text-primary">
            &times;
          </button>
        </div>

        <div className="border-b border-border px-4 py-3">
          <input
            autoFocus
            type="text"
            placeholder={`Search ${tab}s...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border-0 border-b border-border bg-transparent py-1 text-[12px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-border-focus"
          />
        </div>

        <div className="flex border-b border-border">
          {(['position', 'submission'] as NodeType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-[11px] font-medium uppercase ${
                tab === t
                  ? 'border-b-2 border-text-primary text-text-primary'
                  : 'text-text-secondary hover:bg-bg-elevated'
              }`}
            >
              {t}s
            </button>
          ))}
        </div>

        <div className="flex gap-1 border-b border-border px-4 py-2">
          {(['all', 'gi', 'nogi'] as RulesetFilter[]).map((r) => (
            <button
              key={r}
              onClick={() => setPickerRuleset(r)}
              className={`px-2 py-0.5 text-[10px] font-medium uppercase ${
                pickerRuleset === r
                  ? 'border border-text-primary text-text-primary'
                  : 'border border-transparent text-text-secondary hover:bg-bg-elevated'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-[12px] text-text-tertiary">No matches.</p>
          )}
          {filtered.map((entry) => {
            const isSelected = selected.has(entry.id)
            return (
              <button
                key={entry.id}
                onClick={() => toggle(entry.id)}
                className={`flex w-full items-center justify-between border-b border-border/50 px-4 py-2 text-left hover:bg-bg-elevated ${
                  isSelected ? 'border-l-2 border-l-node-submission bg-bg-elevated' : ''
                }`}
              >
                <span className="text-[12px] text-text-primary">
                  {isSelected && <span className="mr-1 text-node-submission">&gt;</span>}
                  {entry.label}
                </span>
                <span className="flex gap-1">
                  {entry.rulesets.includes('gi') && (
                    <span className="border border-border px-1 text-[9px] font-semibold uppercase text-text-secondary">
                      GI
                    </span>
                  )}
                  {entry.rulesets.includes('nogi') && (
                    <span className="border border-border px-1 text-[9px] font-semibold uppercase text-text-secondary">
                      NOGI
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-[11px] text-text-secondary">{selected.size} selected</span>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="border border-border px-3 py-1.5 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="border border-text-primary bg-text-primary px-3 py-1.5 text-[11px] font-medium uppercase text-black hover:bg-bg-elevated hover:text-text-primary disabled:opacity-40"
            >
              Add Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
