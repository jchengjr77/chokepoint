import { useState } from 'react'
import type { RulesetFilter } from '../types'
import { useAuth } from '../hooks/useAuth'
import { THEMES, type ThemeId, type ThemeMode } from '../lib/themes'
import { randomToolbarMessage } from '../lib/toolbarMessages'
import { Dropdown } from './Dropdown'
import { ConfirmModal } from './ConfirmModal'
import { AboutModal } from './AboutModal'
import { OverflowMenu } from './OverflowMenu'

const REPORT_BUG_URL = 'https://github.com/jchengjr77/chokepoint/issues/new'
const RULESET_OPTIONS: RulesetFilter[] = ['all', 'gi', 'nogi']

interface ToolbarProps {
  rulesetFilter: RulesetFilter
  onRulesetFilterChange: (filter: RulesetFilter) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  onOpenImportExport: () => void
  theme: ThemeId
  themeMode: ThemeMode
  onThemeChange: (theme: ThemeId) => void
  onThemeModeChange: (mode: ThemeMode) => void
}

function ThemeModeSwitch({ themeMode, onThemeModeChange }: { themeMode: ThemeMode; onThemeModeChange: (mode: ThemeMode) => void }) {
  return (
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
  )
}

export function Toolbar({
  rulesetFilter,
  onRulesetFilterChange,
  searchQuery,
  onSearchQueryChange,
  onOpenImportExport,
  theme,
  themeMode,
  onThemeChange,
  onThemeModeChange,
}: ToolbarProps) {
  const { user, signOut } = useAuth()
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [toolbarMessage] = useState(randomToolbarMessage)

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 overflow-x-auto border-b border-border bg-bg-surface px-3 sm:gap-4">

      <span className="shrink-0 text-[14px] font-bold uppercase tracking-wide text-text-primary">Chokepoint</span>

      {/* Ruleset: segmented control on desktop; folded into the mobile menu below */}
      <div className="hidden shrink-0 border border-border text-[11px] font-medium uppercase sm:flex">
        {RULESET_OPTIONS.map((r) => (
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

      {/* Search isn't essential on small screens and eats too much of the toolbar's width there */}
      <input
        type="text"
        placeholder="Search nodes..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        className="hidden w-32 shrink-0 border-0 border-b border-border bg-transparent py-1 text-[12px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-border-focus sm:block sm:w-40"
      />

      <span className="hidden flex-1 select-none truncate text-center text-[11px] italic text-text-tertiary md:block">
        {toolbarMessage}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {/* Desktop: everything inline */}
        <button
          onClick={() => setShowAbout(true)}
          aria-label="About Chokepoint"
          title="About"
          className="hidden shrink-0 border border-border px-2 py-1 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated sm:block"
        >
          About
        </button>

        {/* Theme picker and dark/light switch stay visible outside the collapsed menu at every size */}
        <Dropdown
          value={theme}
          options={THEMES.map((t) => ({ value: t.id, label: t.label }))}
          onChange={onThemeChange}
          ariaLabel="Theme"
          className="w-24 sm:w-32"
        />

        <ThemeModeSwitch themeMode={themeMode} onThemeModeChange={onThemeModeChange} />

        <span className="hidden text-[11px] text-text-secondary sm:inline">{user?.email}</span>

        <div className="hidden sm:block">
          <OverflowMenu
            items={[
              { label: 'Import / Export', onClick: onOpenImportExport },
              { label: 'Report Bug', onClick: () => window.open(REPORT_BUG_URL, '_blank', 'noopener,noreferrer') },
              { label: 'Sign Out', onClick: () => setConfirmingSignOut(true), danger: true },
            ]}
          />
        </div>

        {/* Mobile: ruleset, About, and account actions collapse into one menu (issue #7) */}
        <div className="sm:hidden">
          <OverflowMenu
            ariaLabel="Menu"
            items={[
              { label: 'About', onClick: () => setShowAbout(true) },
              { label: 'Import / Export', onClick: onOpenImportExport },
              { label: 'Report Bug', onClick: () => window.open(REPORT_BUG_URL, '_blank', 'noopener,noreferrer') },
              { label: 'Sign Out', onClick: () => setConfirmingSignOut(true), danger: true },
            ]}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase text-text-secondary">Ruleset</span>
              <Dropdown
                value={rulesetFilter}
                options={RULESET_OPTIONS.map((r) => ({ value: r, label: r }))}
                onChange={onRulesetFilterChange}
                ariaLabel="Ruleset filter"
                className="w-24"
              />
            </div>
          </OverflowMenu>
        </div>
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

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  )
}
