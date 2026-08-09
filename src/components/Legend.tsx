export function Legend() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-3 border border-border bg-bg-surface px-3 py-1.5 text-[10px] uppercase text-text-secondary">
      <div className="flex items-center gap-1.5">
        <span className="text-text-tertiary">Less advantageous</span>
        <span aria-hidden className="text-text-tertiary">
          &larr;
        </span>
        <span className="h-px w-8 bg-gradient-to-r from-text-tertiary to-node-position" />
        <span aria-hidden className="text-text-secondary">
          &rarr;
        </span>
        <span className="text-text-secondary">More advantageous</span>
      </div>

      <span className="h-3 w-px bg-border" />

      <div className="flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-2.5 border border-node-submission" />
        <span>Submissions</span>
      </div>
    </div>
  )
}
