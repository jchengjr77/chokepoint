interface AboutModalProps {
  onClose: () => void
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="mb-1 text-[11px] font-semibold uppercase text-text-primary">{title}</h3>
      <p className="text-[12px] leading-relaxed text-text-secondary">{children}</p>
    </div>
  )
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col border border-border bg-bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-semibold uppercase text-text-primary">About Chokepoint</h2>
          <button onClick={onClose} className="text-[16px] text-text-secondary hover:text-text-primary">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-2 text-[16px] font-bold leading-snug text-text-primary">
            The modern grappler's training journal.
          </p>
          <p className="mb-5 text-[12px] leading-relaxed text-text-primary">
            Build your knowledge map with positions and submissions, connected by techniques.
          </p>

          <Feature title="Natural language input">
            Type what you trained in plain English — "scissor sweep from closed guard to mount, then armbar" — and
            Chokepoint updates your knowledge map for you.
          </Feature>

          <Feature title="Calendar">
            Training inputs are logged into the calendar automatically. This shows what you trained on any given
            day.
          </Feature>

          <Feature title="Positions & Techniques">
            Positions and <span className="text-node-submission">Submissions</span> are nodes in the map, and
            Techniques connect them. Don't see something you know? Define your own!
          </Feature>

          <Feature title="Layout">
            The graph runs left to right by advantage: disadvantageous positions on the left, advantageous ones on
            the right.
          </Feature>

          <Feature title="Auto-Layout">
            Automatically re-arranges your graph while preserving the advantage ordering.
          </Feature>

          <Feature title="Themes">
            Pick a color theme and light or dark mode from the toolbar.
          </Feature>
        </div>

        <div className="flex justify-end border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            className="border border-border px-3 py-1.5 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
