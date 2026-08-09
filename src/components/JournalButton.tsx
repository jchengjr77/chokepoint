import { BookOpen } from 'lucide-react'

interface JournalButtonProps {
  onClick: () => void
}

export function JournalButton({ onClick }: JournalButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Open training journal"
      title="Journal"
      className="flex items-center gap-2 border border-node-submission bg-bg-surface px-3 py-2 text-[11px] font-bold uppercase text-node-submission shadow-[0_0_0_4px_var(--bg-primary)] hover:bg-node-submission hover:text-black"
    >
      <BookOpen size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      Journal
    </button>
  )
}
