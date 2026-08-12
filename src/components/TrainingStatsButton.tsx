import { BarChart3 } from 'lucide-react'

interface TrainingStatsButtonProps {
  onClick: () => void
}

// Smaller and less prominent than CalendarButton — the calendar is the
// more important of the two floating "log" actions, this is secondary.
export function TrainingStatsButton({ onClick }: TrainingStatsButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Open training stats"
      title="Training Stats"
      className="flex items-center gap-1.5 border border-node-submission bg-bg-surface px-2.5 py-1.5 text-[10px] font-bold uppercase text-node-submission shadow-[0_0_0_4px_var(--bg-primary)] hover:bg-node-submission hover:text-black"
    >
      <BarChart3 size={14} strokeWidth={2.25} aria-hidden="true" className="shrink-0" />
      Training Stats
    </button>
  )
}
