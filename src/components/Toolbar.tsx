import { useState } from 'react'
import type { RulesetFilter } from '../types'
import { useAuth } from '../hooks/useAuth'

interface ToolbarProps {
  rulesetFilter: RulesetFilter
  onRulesetFilterChange: (filter: RulesetFilter) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  onAddNode: () => void
  onResetView: () => void
  onAutoLayout: () => void
}

export function Toolbar({
  rulesetFilter,
  onRulesetFilterChange,
  searchQuery,
  onSearchQueryChange,
  onAddNode,
  onResetView,
  onAutoLayout,
}: ToolbarProps) {
  const { user, signOut } = useAuth()
  const [confirmingLayout, setConfirmingLayout] = useState(false)

  return (
    <div className="flex h-12 shrink-0 items-center gap-4 overflow-x-auto border-b border-border bg-bg-surface px-3">

      <span className="shrink-0 text-[14px] font-bold uppercase tracking-wide text-text-primary">Chokepoint</span>

      <div className="flex shrink-0 border border-border text-[11px] font-medium uppercase">
        {(['all', 'gi', 'nogi'] as RulesetFilter[]).map((r) => (
          <button
            key={r}
            onClick={() => onRulesetFilterChange(r)}
            className={`px-2 py-1 ${
              rulesetFilter === r
                ? 'border border-text-primary bg-transparent text-text-primary'
                : 'border border-transparent text-text-secondary hover:bg-bg-elevated'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Search nodes..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        className="w-32 shrink-0 border-0 border-b border-border bg-transparent py-1 text-[12px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-border-focus sm:w-40"
      />

      <button
        onClick={onAddNode}
        className="shrink-0 border border-border px-2 py-1 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
      >
        Add Node
      </button>

      <button
        onClick={onResetView}
        className="shrink-0 border border-border px-2 py-1 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
      >
        Reset View
      </button>

      {confirmingLayout ? (
        <div className="flex shrink-0 items-center gap-1 text-[11px]">
          <span className="text-text-secondary">Overwrite manual layout?</span>
          <button
            onClick={() => {
              onAutoLayout()
              setConfirmingLayout(false)
            }}
            className="border border-node-submission px-2 py-1 uppercase text-node-submission hover:bg-bg-elevated"
          >
            Confirm
          </button>
          <button
            onClick={() => setConfirmingLayout(false)}
            className="border border-border px-2 py-1 uppercase text-text-secondary hover:bg-bg-elevated"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingLayout(true)}
          className="shrink-0 border border-border px-2 py-1 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
        >
          Auto-Layout
        </button>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="hidden text-[11px] text-text-secondary sm:inline">{user?.email}</span>
        <button
          onClick={() => void signOut()}
          className="shrink-0 border border-border px-2 py-1 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
