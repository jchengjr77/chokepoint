export function Legend() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-10 flex w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center justify-center gap-1 whitespace-nowrap border border-border bg-bg-surface px-2 py-1.5 text-[8px] uppercase text-text-secondary sm:w-auto sm:max-w-[calc(100vw-2rem)] sm:gap-3 sm:px-3 sm:text-[10px]">
      <div className="flex items-center gap-1 sm:gap-1.5">
        <span className="text-text-tertiary">
          <span className="sm:hidden">Less adv.</span>
          <span className="hidden sm:inline">Less advantageous</span>
        </span>
        <span aria-hidden className="text-text-tertiary">
          &larr;
        </span>
        <span className="h-px w-4 bg-gradient-to-r from-text-tertiary to-node-position sm:w-8" />
        <span aria-hidden className="text-text-secondary">
          &rarr;
        </span>
        <span className="text-text-secondary">
          <span className="sm:hidden">More adv.</span>
          <span className="hidden sm:inline">More advantageous</span>
        </span>
      </div>

      <span className="h-3 w-px bg-border" />

      <div className="flex items-center gap-1 sm:gap-1.5">
        <span aria-hidden className="chokepoint-sharp h-2.5 w-2.5 border border-node-submission" />
        <span>Submissions</span>
      </div>
    </div>
  )
}
