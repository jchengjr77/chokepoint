interface JournalButtonProps {
  onClick: () => void
}

// 12x12 pixel-grid book icon, drawn as a solid block per "on" cell so it
// reads as crisp 8-bit pixel art rather than a smooth vector glyph.
const BOOK_PIXELS: Array<[number, number]> = [
  // spine (left edge)
  [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10],
  // top cover edge
  [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1],
  // bottom cover edge
  [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10],
  // right edge
  [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], [10, 8], [10, 9],
  // center binding line
  [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [6, 7], [6, 8], [6, 9],
  // page lines, left half
  [3, 3], [4, 3], [3, 5], [4, 5], [3, 7], [4, 7],
  // page lines, right half
  [8, 3], [9, 3], [8, 5], [9, 5], [8, 7], [9, 7],
]

export function JournalButton({ onClick }: JournalButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Open training journal"
      title="Journal"
      className="group flex items-center gap-2 border border-node-submission bg-bg-surface px-3 py-2 text-[11px] font-bold uppercase text-node-submission shadow-[0_0_0_4px_var(--bg-primary)] hover:bg-node-submission hover:text-black"
    >
      <svg
        viewBox="0 0 12 12"
        width="16"
        height="16"
        shapeRendering="crispEdges"
        aria-hidden="true"
        className="shrink-0"
      >
        {BOOK_PIXELS.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
        ))}
      </svg>
      Journal
    </button>
  )
}
