const STORAGE_KEY = 'chokepoint-tutorial-seen'

export function hasSeenTutorial(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export function markTutorialSeen(): void {
  localStorage.setItem(STORAGE_KEY, '1')
}

interface TutorialModalProps {
  onClose: () => void
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 border border-border bg-bg-elevated px-3 py-2.5">
      <h3 className="mb-0.5 text-[11px] font-semibold uppercase text-node-submission">{title}</h3>
      <p className="text-[12px] leading-relaxed text-text-secondary">{children}</p>
    </div>
  )
}

export function TutorialModal({ onClose }: TutorialModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col border border-border bg-bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-semibold uppercase text-text-primary">Tutorial</h2>
          <button onClick={onClose} className="text-[16px] text-text-secondary hover:text-text-primary">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Step title="Log training">
            Type what you drilled at the bottom bar, e.g. "scissor sweep from closed guard to mount, then armbar" —
            Chokepoint adds it to your map for you.
          </Step>

          <Step title="Calendar">
            Bottom-right: <b>Calendar</b> shows what you trained each day.
          </Step>

          <Step title="Layout">
            Positions run left to right by advantage — worse on the left, better on the right. Hit{' '}
            <b>Auto-Layout</b> to tidy things up anytime.
          </Step>

          <Step title="Training Stats">
            Bottom-right: <b>Training Stats</b> shows your overall progress.
          </Step>

          <Step title="Add manually">
            Use <b>Add Position</b> and <b>Add Transition</b> to build your map by hand instead.
          </Step>
        </div>

        <div className="flex justify-end border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            className="border border-node-submission bg-node-submission px-3 py-1.5 text-[11px] font-bold uppercase text-black hover:bg-bg-elevated hover:text-node-submission"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
