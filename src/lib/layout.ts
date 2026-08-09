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
 * Force-directed layout with a strict left-to-right advantage ordering:
 * every node's x-coordinate is fixed by its advantage column (not merely
 * pulled toward one), so the left-to-right priority ordering always holds
 * exactly. Within each column, nodes are ordered top-to-bottom using a
 * barycenter heuristic (average position of connected neighbors in
 * adjacent columns), which is the standard technique for minimizing edge
 * crossings in layered graph drawings — nodes that share neighbors end up
 * near each other vertically instead of forcing their connecting edges to
 * cross other edges.
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

  // Nodes that converge on the same neighbor (e.g. A and B both -> C) end up
  // on adjacent rows after ordering, but with uniform row spacing their
  // approach paths into that shared neighbor stay close together and read
  // as one arrow passing through several nodes. Give each node extra row
  // spacing proportional to how many of its column-neighbors share a
  // target/source with it, so convergent edges fan out more visibly.
  const extraGapAfter = new Map<string, number>()
  for (const col of sortedColumnKeys) {
    const ids = columnOrder.get(col)!
    for (let i = 0; i < ids.length - 1; i++) {
      const a = ids[i]
      const b = ids[i + 1]
      const aNeighbors = new Set(neighborsOf.get(a) ?? [])
      const bNeighbors = neighborsOf.get(b) ?? []
      const shared = bNeighbors.some((n) => aNeighbors.has(n))
      extraGapAfter.set(a, shared ? 0.6 : 0)
    }
  }

  // Center each column vertically around y=0, spacing rows evenly and
  // widening the gap wherever adjacent nodes share a neighbor.
  const result = new Map<string, { x: number; y: number }>()
  for (const col of sortedColumnKeys) {
    const ids = columnOrder.get(col)!
    const positions: number[] = []
    let cursor = 0
    ids.forEach((_id, i) => {
      if (i > 0) cursor += 1 + (extraGapAfter.get(ids[i - 1]) ?? 0)
      positions.push(cursor)
    })
    const center = (positions[0] + positions[positions.length - 1]) / 2
    ids.forEach((id, i) => {
      result.set(id, {
        x: col * COLUMN_SPACING,
        y: (positions[i] - center) * ROW_SPACING,
      })
    })
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
