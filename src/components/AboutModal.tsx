interface AboutModalProps {
  onClose: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-[11px] font-semibold uppercase text-text-secondary">{title}</h3>
      <div className="flex flex-col gap-2 text-[12px] leading-relaxed text-text-primary">{children}</div>
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
          <p className="mb-5 text-[12px] leading-relaxed text-text-secondary">
            Chokepoint is a personal BJJ knowledge graph. It maps the positions and submissions you know as a
            pannable, zoomable node diagram — connected by the transitions you've actually drilled — so your
            game becomes something you can see, not just remember.
          </p>

          <Section title="Positions & Submissions">
            <p>
              Positions are the control points of a match (guard, mount, side control, turtle...). Submissions are
              finishing holds — always shown in <span className="text-node-submission">green</span> — and sit
              wherever they're reachable from on the graph, since the same submission can often be hit from more
              than one position.
            </p>
            <p>
              Left-to-right position on the graph reflects advantage: disadvantageous positions (bottom of a
              dominant control) sit on the left, advantageous ones (top control, finishing entanglements) sit on
              the right.
            </p>
          </Section>

          <Section title="Building your graph">
            <p>
              <span className="font-medium">Add Position</span> opens a searchable list of the curated position
              library. <span className="font-medium">Add Transition</span> lets you connect two nodes you've
              already added and name the technique that links them (a sweep, a pass, a submission entry).
            </p>
            <p>
              If a position or submission you know isn't in the curated list, use{' '}
              <span className="font-medium">+ Define new...</span> inside either picker to add your own — it's
              private to your account and works everywhere the curated library does.
            </p>
          </Section>

          <Section title="Natural language input">
            <p>
              The text bar at the bottom parses free-text training notes — e.g. "hit a scissor sweep from closed
              guard to mount, then armbar" — into nodes and transitions automatically. You'll always see a preview
              before anything is added, and can back-date the entry if you're logging something from a past
              session ("yesterday I drilled...").
            </p>
          </Section>

          <Section title="Training journal">
            <p>
              Every rep — a node you add, a transition you draw, a repeat from natural language input — is logged
              with a timestamp. The journal (calendar icon) shows what you trained on any given day, with a plain
              English summary.
            </p>
          </Section>

          <Section title="Everything else">
            <p>
              <span className="font-medium">Auto-Layout</span> re-arranges the graph automatically while
              respecting the advantage ordering. <span className="font-medium">Reset View</span> re-centers the
              camera. The <span className="font-medium">All / Gi / Nogi</span> toggle dims positions that don't
              apply to the selected ruleset without removing them. <span className="font-medium">Import / Export</span>{' '}
              in the top bar lets you back up or move your graph as a JSON file.
            </p>
          </Section>
        </div>

        <div className="flex justify-end border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            className="border border-text-primary bg-text-primary px-3 py-1.5 text-[11px] font-medium uppercase text-black hover:bg-bg-elevated hover:text-text-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
