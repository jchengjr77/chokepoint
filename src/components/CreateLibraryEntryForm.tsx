import { useState } from 'react'
import type { Advantage, NodeType, Ruleset } from '../types'

interface CreateLibraryEntryFormProps {
  initialLabel?: string
  onCreate: (params: { label: string; type: NodeType; advantage?: Advantage; rulesets: Ruleset[] }) => void
  onCancel: () => void
}

/**
 * Inline form for defining a custom (per-user) position or submission not
 * in the curated library. Positions need an advantage value so the
 * auto-layout column logic in lib/layout.ts has something to place them
 * by; submissions don't (they're free-floating, same as curated ones).
 */
export function CreateLibraryEntryForm({ initialLabel, onCreate, onCancel }: CreateLibraryEntryFormProps) {
  const [label, setLabel] = useState(initialLabel ?? '')
  const [type, setType] = useState<NodeType>('position')
  const [advantage, setAdvantage] = useState<Advantage>(0)
  const [rulesets, setRulesets] = useState<Ruleset[]>(['gi', 'nogi'])

  const toggleRuleset = (r: Ruleset) => {
    setRulesets((prev) => {
      if (prev.includes(r)) {
        const next = prev.filter((x) => x !== r)
        return next.length > 0 ? next : prev
      }
      return [...prev, r]
    })
  }

  const canCreate = label.trim().length > 0

  return (
    <div className="border border-border-focus bg-bg-elevated p-3">
      <span className="mb-2 block text-[10px] uppercase text-text-secondary">Define new {type}</span>

      <label className="mb-2 flex flex-col gap-1">
        <span className="text-[10px] uppercase text-text-secondary">Name</span>
        <input
          autoFocus
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Twister Side Control"
          className="w-full border-0 border-b border-border bg-transparent py-1 text-[12px] text-text-primary outline-none focus:border-border-focus"
        />
      </label>

      <div className="mb-2 flex border border-border text-[11px] font-medium uppercase">
        {(['position', 'submission'] as NodeType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-1 ${
              type === t ? 'bg-text-primary text-black' : 'text-text-secondary hover:bg-bg-surface'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {type === 'position' && (
        <label className="mb-2 flex flex-col gap-1">
          <span className="text-[10px] uppercase text-text-secondary">
            Advantage ({advantage > 0 ? `+${advantage}` : advantage})
          </span>
          <input
            type="range"
            min={-5}
            max={5}
            step={1}
            value={advantage}
            onChange={(e) => setAdvantage(Number(e.target.value) as Advantage)}
            className="w-full"
          />
          <div className="flex justify-between text-[9px] uppercase text-text-tertiary">
            <span>Disadvantageous</span>
            <span>Advantageous</span>
          </div>
        </label>
      )}

      <div className="mb-3 flex gap-1">
        {(['gi', 'nogi'] as Ruleset[]).map((r) => (
          <button
            key={r}
            onClick={() => toggleRuleset(r)}
            className={`px-2 py-0.5 text-[10px] font-medium uppercase ${
              rulesets.includes(r)
                ? 'border border-text-primary text-text-primary'
                : 'border border-transparent text-text-secondary hover:bg-bg-surface'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="border border-border px-2 py-1 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-surface"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            canCreate &&
            onCreate({ label: label.trim(), type, advantage: type === 'position' ? advantage : undefined, rulesets })
          }
          disabled={!canCreate}
          className="border border-text-primary bg-text-primary px-2 py-1 text-[11px] font-medium uppercase text-black hover:bg-bg-surface hover:text-text-primary disabled:opacity-40"
        >
          Create
        </button>
      </div>
    </div>
  )
}
