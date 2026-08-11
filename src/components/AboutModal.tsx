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
      <p className="mb-6 text-[12px] leading-relaxed text-text-primary">
        Track your knowledge of positions and submissions, connected by techniques.
      </p>

      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <Feature title="Natural language input">
          Type what you trained in <b>plain English</b> (e.g. "scissor sweep from closed guard to mount, then mounted armbar") and
          your map automatically updates itself.
        </Feature>

        <Feature title="Calendar">
          Training inputs are logged into the calendar automatically. This shows what you trained on any given day.
        </Feature>

        <Feature title="Positions & Techniques">
          <b>Positions</b> and <b>Submissions</b> are nodes in the map, and
          <b>Techniques</b> connect them. Don't see something you know? Define your own!
        </Feature>

        <Feature title="Smart Layout">
          The map runs left to right by advantage: bad positions on the left, good ones on the
          right. Use <b>Auto-Layout</b> to clean up your map.
        </Feature>

        <Feature title="Themes">Pick from popular color themes and light or dark mode from the toolbar!</Feature>
      </div>
    </>
  )
}

function TeamTab() {
  return (
    <>
      <p className="mb-2 text-[16px] font-bold leading-snug text-text-primary">JJ Cheng</p>
      <p className="mb-5 text-[12px] leading-relaxed text-text-primary">
        Chokepoint is built and maintained by a single person, in whatever hours are left after training. There is
        no QA department. There is no on-call rotation. There's only JJ Cheng, who should really be learning how
        to pass a guard instead of building this thing. Maybe then he would stop falling back into leglocks all the
        time.
      </p>

      <div className="border border-border bg-bg-elevated px-3 py-3">
        <p className="mb-1 text-[12px] font-semibold text-text-primary">Jonathan Cheng</p>
        <p className="mb-2 text-[11px] text-text-secondary">
          Blue belt, training at Workshop NYC (Lower East Side). Based in New York City.
        </p>
        <div className="flex gap-3">
          <a
            href="https://github.com/jchengjr77"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-node-submission hover:underline"
          >
            github.com/jchengjr77
          </a>
          <a
            href="https://www.linkedin.com/in/jchengjr77/"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-node-submission hover:underline"
          >
            LinkedIn
          </a>
        </div>
      </div>

      <p className="mt-5 text-[12px] leading-relaxed text-text-secondary">Dirty leglockers...</p>
    </>
  )
}

export function AboutModal({ onClose }: AboutModalProps) {
  const [tab, setTab] = useState<Tab>('about')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex h-[740px] max-h-[90vh] w-full max-w-2xl flex-col border border-border bg-bg-surface"
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
              className={`flex-1 py-2 text-[11px] font-medium uppercase ${tab === t
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
