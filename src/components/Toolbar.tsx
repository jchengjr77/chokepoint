import { useState } from 'react'
import type { RulesetFilter } from '../types'
import { useAuth } from '../hooks/useAuth'
import { THEMES, type ThemeId, type ThemeMode } from '../lib/themes'
import { Dropdown } from './Dropdown'
import { ConfirmModal } from './ConfirmModal'

interface ToolbarProps {
  rulesetFilter: RulesetFilter
  onRulesetFilterChange: (filter: RulesetFilter) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  onAddNode: () => void
  onResetView: () => void
  onAutoLayout: () => void
  theme: ThemeId
  themeMode: ThemeMode
  onThemeChange: (theme: ThemeId) => void
  onThemeModeChange: (mode: ThemeMode) => void
}

export function Toolbar({
  rulesetFilter,
  onRulesetFilterChange,
  searchQuery,
  onSearchQueryChange,
  onAddNode,
  onResetView,
  onAutoLayout,
  theme,
  themeMode,
  onThemeChange,
  onThemeModeChange,
}: ToolbarProps) {
  const { user, signOut } = useAuth()
  const [confirmingLayout, setConfirmingLayout] = useState(false)
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)

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
        <Dropdown
          value={theme}
          options={THEMES.map((t) => ({ value: t.id, label: t.label }))}
          onChange={onThemeChange}
          ariaLabel="Theme"
          className="w-32"
        />

        <button
          onClick={() => onThemeModeChange(themeMode === 'dark' ? 'light' : 'dark')}
          role="switch"
          aria-checked={themeMode === 'light'}
          aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="relative shrink-0 border border-border bg-transparent p-0.5 hover:bg-bg-elevated"
          style={{ width: 44, height: 22 }}
        >
          <span
            className="absolute top-0.5 flex h-[16px] w-[16px] items-center justify-center bg-text-primary text-bg-primary transition-transform duration-150 ease-out"
            style={{ transform: themeMode === 'light' ? 'translateX(22px)' : 'translateX(2px)' }}
          >
            {themeMode === 'dark' ? (
              <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true">
                <path d="M8 1.5a6.5 6.5 0 1 0 6.5 7.86A5.5 5.5 0 0 1 8 1.5Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true">
                <circle cx="8" cy="8" r="3.2" />
                <path
                  strokeWidth="1.4"
                  stroke="currentColor"
                  strokeLinecap="round"
                  d="M8 0.8v1.6M8 13.6v1.6M15.2 8h-1.6M2.4 8H0.8M12.9 3.1l-1.13 1.13M4.23 11.77 3.1 12.9M12.9 12.9l-1.13-1.13M4.23 4.23 3.1 3.1"
                />
              </svg>
            )}
          </span>
        </button>

        <span className="hidden text-[11px] text-text-secondary sm:inline">{user?.email}</span>
        <button
          onClick={() => setConfirmingSignOut(true)}
          className="shrink-0 border border-border px-2 py-1 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
        >
          Sign Out
        </button>
      </div>

      {confirmingSignOut && (
        <ConfirmModal
          title="Sign Out"
          message="Are you sure you want to sign out?"
          confirmLabel="Sign Out"
          danger
          onConfirm={() => {
            setConfirmingSignOut(false)
            void signOut()
          }}
          onCancel={() => setConfirmingSignOut(false)}
        />
      )}
    </div>
  )
}
