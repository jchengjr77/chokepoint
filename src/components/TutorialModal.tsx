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

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-node-submission text-[11px] font-bold text-node-submission">
        {number}
      </span>
      <div>
        <h3 className="mb-1 text-[11px] font-semibold uppercase text-text-primary">{title}</h3>
        <div className="text-[12px] leading-relaxed text-text-secondary">{children}</div>
      </div>
    </div>
  )
}

export function TutorialModal({ onClose }: TutorialModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex h-[740px] max-h-[90vh] w-full max-w-2xl flex-col border border-border bg-bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-semibold uppercase text-text-primary">Tutorial</h2>
          <button onClick={onClose} className="text-[16px] text-text-secondary hover:text-text-primary">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-6 text-[12px] leading-relaxed text-text-primary">
            Chokepoint builds a map of your grappling knowledge as you train. Here's how it works.
          </p>

          <Step number={1} title="Log training in plain English">
            <p className="mb-2">
              Type what you drilled into the text bar at the bottom of the screen, then hit Send. For example:
            </p>
            <p className="mb-2 border border-border bg-bg-elevated px-2 py-1.5 text-[12px] text-text-primary">
              "scissor sweep from closed guard to mount, then mounted armbar"
            </p>
            <p>
              Chokepoint reads that and works out the positions, submissions, and transitions you mentioned. You'll
              see a preview of what it found before anything is added — review it, uncheck anything wrong, and
              confirm. New positions/submissions and the connections between them are added to your map
              automatically, and training you've already logged before just gets another rep counted.
            </p>
          </Step>

          <Step number={2} title="Or build the map by hand">
            <p>
              Prefer to add things manually? Use <b>Add Position</b> to pick from the library, and{' '}
              <b>Add Transition</b> to connect two positions already on your map and name the technique that links
              them. Don't see a position or submission you know? Both let you define your own.
            </p>
          </Step>

          <Step number={3} title="Read the layout: left to right, by advantage">
            <p>
              Your map is ordered left to right by how advantageous a position is — the worst spots (stuck on
              bottom, no control) sit on the far left, and the best spots (dominant control, finishing
              entanglements) sit on the far right. Submissions aren't pinned to a column — they sit wherever
              they're reachable from, since the same submission can often be hit from more than one position.
            </p>
            <p className="mt-2">
              As you add more to your map, positions can end up overlapping or the layout can get messy. Hit{' '}
              <b>Auto-Layout</b> (bottom-left) to automatically re-arrange everything while keeping that same
              left-to-right ordering — it only moves things around, nothing you've logged is lost.
            </p>
          </Step>

          <Step number={4} title="Track your training over time">
            <p className="mb-2">
              Every logged rep — whether typed in or added manually — gets timestamped automatically. Two places
              to see that history, both floating in the bottom-right corner of the map:
            </p>
            <p className="mb-1">
              <b className="text-node-submission">Calendar</b> — see what you trained on any given day, with a
              plain-English summary of the sequence (e.g. "Closed Guard → Mount → Armbar").
            </p>
            <p>
              <b className="text-node-submission">Training Stats</b> — an overview of your training: total
              sessions, how often you're training, your most-trained positions and techniques, and which areas
              could use more reps.
            </p>
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
