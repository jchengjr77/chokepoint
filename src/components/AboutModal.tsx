import { useState } from 'react'

interface AboutModalProps {
  onClose: () => void
}

type Tab = 'about' | 'team'

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="mb-1 text-[11px] font-semibold uppercase text-text-primary">{title}</h3>
      <p className="text-[12px] leading-relaxed text-text-secondary">{children}</p>
    </div>
  )
}

function AboutTab() {
  return (
    <>
      <p className="mb-2 text-[16px] font-bold leading-snug text-text-primary">
        The modern grappler's training journal.
      </p>
      <p className="mb-5 text-[12px] leading-relaxed text-text-primary">
        Build your map with positions and submissions, connected by techniques.
      </p>

      <Feature title="Natural language input">
        Type what you trained in plain English — "scissor sweep from closed guard to mount, then armbar" — and
        Chokepoint updates your map for you.
      </Feature>

      <Feature title="Calendar">
        Training inputs are logged into the calendar automatically. This shows what you trained on any given day.
      </Feature>

      <Feature title="Positions & Techniques">
        Positions and <span className="text-node-submission">Submissions</span> are nodes in the map, and
        Techniques connect them. Don't see something you know? Define your own!
      </Feature>

      <Feature title="Layout">
        The map runs left to right by advantage: disadvantageous positions on the left, advantageous ones on the
        right.
      </Feature>

      <Feature title="Auto-Layout">Automatically re-arranges your map while preserving the advantage ordering.</Feature>

      <Feature title="Themes">Pick a color theme and light or dark mode from the toolbar!</Feature>
    </>
  )
}

function TeamTab() {
  return (
    <>
      <p className="mb-2 text-[16px] font-bold leading-snug text-text-primary">Team of one.</p>
      <p className="mb-5 text-[12px] leading-relaxed text-text-primary">
        Chokepoint is built and maintained by a single person, in whatever hours are left after training. There is
        no QA department. There is no on-call rotation. There is just one guy who really should be doing hip
        escapes right now instead of fixing a CSS bug.
      </p>

      <div className="mb-5 border border-border bg-bg-elevated px-3 py-3">
        <p className="mb-1 text-[12px] font-semibold text-text-primary">Jonathan Cheng</p>
        <p className="mb-2 text-[11px] text-text-secondary">
          Blue belt, training at Workshop NYC (Lower East Side). Based in New York City.
        </p>
        <a
          href="https://github.com/jchengjr77"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-node-submission hover:underline"
        >
          github.com/jchengjr77
        </a>
      </div>

      <p className="text-[12px] leading-relaxed text-text-secondary">
        So: this is a solo endeavor. If something breaks, it's not a conspiracy — it's just one person's
        weekend project holding a triangle on a production database. Bear with the bugs, and{' '}
        <span className="font-medium text-text-primary">please, for the love of all that is holy, report them</span>{' '}
        so they can get squashed before your next training log gets choked out.
      </p>
    </>
  )
}

export function AboutModal({ onClose }: AboutModalProps) {
  const [tab, setTab] = useState<Tab>('about')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex h-[600px] max-h-[85vh] w-full max-w-lg flex-col border border-border bg-bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-semibold uppercase text-text-primary">Chokepoint</h2>
          <button onClick={onClose} className="text-[16px] text-text-secondary hover:text-text-primary">
            &times;
          </button>
        </div>

        <div className="flex border-b border-border">
          {([
            ['about', 'About'],
            ['team', 'Team'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-[11px] font-medium uppercase ${
                tab === t
                  ? 'border-b-2 border-text-primary text-text-primary'
                  : 'text-text-secondary hover:bg-bg-elevated'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">{tab === 'about' ? <AboutTab /> : <TeamTab />}</div>

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
