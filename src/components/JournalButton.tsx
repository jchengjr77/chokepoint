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
      className="flex items-center gap-2.5 border-2 border-node-submission bg-bg-surface px-4 py-3 text-[13px] font-bold uppercase text-node-submission shadow-[0_0_0_4px_var(--bg-primary)] hover:bg-node-submission hover:text-black"
    >
      <BookOpen size={20} strokeWidth={2.25} aria-hidden="true" className="shrink-0" />
      Journal
    </button>
  )
}
