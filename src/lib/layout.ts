import { getLibraryEntry } from './library'
import type { GraphEdge, GraphNode } from '../types'

const COLUMN_SPACING = 160
const ROW_SPACING = 90
const MAX_ADVANTAGE = 5
const SUBMISSION_COLUMN = MAX_ADVANTAGE + 1

/**
 * Column index for a node's advantage: disadvantageous (bottom-of-control)
 * positions on the left, neutral positions/guards near center, advantageous
 * (top-of-control) positions right-of-center, and submissions — the
 * ultimate winning outcome — pinned to the far-right column, beyond even
 * the most dominant (+5) position column.
 */
function nodeColumn(node: GraphNode): number {
  if (node.type === 'submission') return SUBMISSION_COLUMN
  const entry = getLibraryEntry(node.libraryId)
  return entry?.advantage ?? 0
}

/**
 * Layered layout with a strict left-to-right advantage ordering: every
 * node's x-coordinate is fixed by its advantage column, so the priority
 * ordering always holds exactly. Within each column, nodes are ordered
 * top-to-bottom using a barycenter heuristic (average position of
 * connected neighbors in adjacent columns) to reduce edge crossings, then
 * nudged so no node shares an exact y with a node in the column right
 * before it — otherwise an edge passing near an unrelated node in the next
 * column reads as if it passes through it.
 */
export function computeAutoLayout(nodes: GraphNode[], edges: GraphEdge[]): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map()

  const columnOf = new Map(nodes.map((n) => [n.id, nodeColumn(n)]))
  const neighborsOf = new Map<string, string[]>()
  for (const n of nodes) neighborsOf.set(n.id, [])
  for (const e of edges) {
    if (!columnOf.has(e.sourceId) || !columnOf.has(e.targetId)) continue
    neighborsOf.get(e.sourceId)?.push(e.targetId)
    neighborsOf.get(e.targetId)?.push(e.sourceId)
  }

  // Group node ids by column, sorted so we can sweep columns left-to-right
  // and right-to-left when computing barycenters.
  const columns = new Map<number, string[]>()
  for (const n of nodes) {
    const col = columnOf.get(n.id)!
    if (!columns.has(col)) columns.set(col, [])
    columns.get(col)!.push(n.id)
  }
  const sortedColumnKeys = [...columns.keys()].sort((a, b) => a - b)

  // Row position (a real number, not yet spaced/rounded) per node id.
  // Initialize by index within the column to have a stable starting order.
  const row = new Map<string, number>()
  for (const col of sortedColumnKeys) {
    columns.get(col)!.forEach((id, i) => row.set(id, i))
  }

  const BARYCENTER_PASSES = 4
  for (let pass = 0; pass < BARYCENTER_PASSES; pass++) {
    // Sweep left-to-right using already-updated left-neighbor rows, then
    // right-to-left using right-neighbor rows — alternating sweeps is the
    // standard way to let the ordering settle without bias toward one side.
    const leftToRight = pass % 2 === 0
    const sweepOrder = leftToRight ? sortedColumnKeys : [...sortedColumnKeys].reverse()

    for (const col of sweepOrder) {
      const ids = columns.get(col)!
      const barycenters = ids.map((id) => {
        const neighbors = neighborsOf.get(id) ?? []
        if (neighbors.length === 0) return row.get(id)!
        const sum = neighbors.reduce((acc, nid) => acc + (row.get(nid) ?? 0), 0)
        return sum / neighbors.length
      })

      const ordered = ids
        .map((id, i) => ({ id, key: barycenters[i] }))
        .sort((a, b) => a.key - b.key)

      ordered.forEach((entry, i) => row.set(entry.id, i))
    }
  }

  // Final row order per column, settled by the barycenter passes above.
  const columnOrder = new Map<number, string[]>()
  for (const col of sortedColumnKeys) {
    columnOrder.set(
      col,
      columns.get(col)!.slice().sort((a, b) => row.get(a)! - row.get(b)!)
    )
  }

  // Base y per node: each column centered around y=0 with even row spacing.
  const y = new Map<string, number>()
  for (const col of sortedColumnKeys) {
    const ids = columnOrder.get(col)!
    const offset = (ids.length - 1) / 2
    ids.forEach((id, i) => y.set(id, (i - offset) * ROW_SPACING))
  }

  // A node sitting at the exact same y as a node in the neighboring column
  // reads visually as if an edge passes straight through it, even when the
  // two aren't connected. Walk columns left to right and nudge any node
  // that lands on the same y as something already placed in the column
  // immediately before it, alternating quarter-row steps up/down until it
  // clears every y used in that adjacent column.
  const EPSILON = 1e-6
  for (let ci = 1; ci < sortedColumnKeys.length; ci++) {
    const col = sortedColumnKeys[ci]
    const prevIds = columnOrder.get(sortedColumnKeys[ci - 1])!
    const prevYs = new Set(prevIds.map((id) => y.get(id)!))
    const ids = columnOrder.get(col)!

    ids.forEach((id, i) => {
      const baseY = y.get(id)!
      if (![...prevYs].some((py) => Math.abs(py - baseY) < EPSILON)) return

      let candidate = baseY
      let step = 1
      let direction = i % 2 === 0 ? 1 : -1
      while ([...prevYs].some((py) => Math.abs(py - candidate) < EPSILON)) {
        candidate = baseY + direction * step * (ROW_SPACING / 4)
        direction *= -1
        if (direction === 1) step++
      }
      y.set(id, candidate)
    })
  }

  const result = new Map<string, { x: number; y: number }>()
  for (const col of sortedColumnKeys) {
    for (const id of columnOrder.get(col)!) {
      result.set(id, { x: col * COLUMN_SPACING, y: y.get(id)! })
    }
  }

  return result
}

const MIN_NODE_SPACING = 130

/**
 * Placement for a single new node: near the average position of its
 * connected context nodes (or spread from the graph's center if there's no
 * context yet), nudged away from any already-occupied position so batches
 * of new nodes don't stack on top of each other.
 */
export function placeNearContext(
  contextNodes: Array<{ x: number; y: number }>,
  fallback: { x: number; y: number },
  occupied: Array<{ x: number; y: number }> = []
): { x: number; y: number } {
  const baseX = contextNodes.length > 0 ? contextNodes.reduce((sum, n) => sum + n.x, 0) / contextNodes.length : fallback.x
  const baseY = contextNodes.length > 0 ? contextNodes.reduce((sum, n) => sum + n.y, 0) / contextNodes.length : fallback.y
  const hasBase = contextNodes.length > 0

  for (let attempt = 0; attempt < 24; attempt++) {
    const angle = Math.random() * Math.PI * 2
    const distance = hasBase ? 140 + Math.random() * 40 : attempt * 45 + Math.random() * 40
    const candidate = {
      x: baseX + Math.cos(angle) * distance,
      y: baseY + Math.sin(angle) * distance,
    }

    const collides = occupied.some(
      (o) => Math.hypot(o.x - candidate.x, o.y - candidate.y) < MIN_NODE_SPACING
    )
    if (!collides) return candidate
  }

  // Give up avoiding collisions after enough attempts; spread out along a ring instead.
  const angle = Math.random() * Math.PI * 2
  const distance = MIN_NODE_SPACING * (1 + occupied.length * 0.15)
  return { x: baseX + Math.cos(angle) * distance, y: baseY + Math.sin(angle) * distance }
}
