import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force'
import { getLibraryEntry } from './library'
import type { GraphEdge, GraphNode } from '../types'

const COLUMN_WIDTH = 260 // horizontal distance between advantage columns
const DEFAULT_NODE_WIDTH = 130
const DEFAULT_NODE_HEIGHT = 40
const SIMULATION_TICKS = 300

interface SimNode {
  id: string
  columnX: number | null // null = no horizontal pin (submissions)
  radius: number
  x: number
  y: number
  index?: number
}

export interface NodeDimensions {
  width: number
  height: number
}

/**
 * Position nodes get a relative column: only the distinct advantage values
 * actually present on the graph get a column, densely packed left to
 * right in ascending order. Two positions three advantage-points apart
 * still land in adjacent columns if nothing with an in-between value is on
 * the graph yet — a node with an intermediate value inserts its own
 * column between them once it's added, rather than columns being fixed to
 * the absolute -5..5 advantage scale regardless of what's actually there.
 *
 * Submissions don't participate in this at all: they can be reached from
 * almost any position (an armbar works as well from bottom side control
 * as from top mount), so forcing them into a column would misrepresent
 * them as "more advantageous" than whatever they're attacking from. They
 * get no horizontal pin and are placed purely by their link springs to
 * whatever position(s) they connect to.
 */
function buildColumnLookup(nodes: GraphNode[]): Map<number, number> {
  const advantages = new Set<number>()
  for (const n of nodes) {
    if (n.type === 'submission') continue
    const entry = getLibraryEntry(n.libraryId)
    advantages.add(entry?.advantage ?? 0)
  }
  const sorted = [...advantages].sort((a, b) => a - b)
  return new Map(sorted.map((adv, i) => [adv, i]))
}

/**
 * Hybrid force-directed layout: nodes repel each other, connected nodes
 * pull together, and collision prevents overlap — all standard d3-force
 * behavior, which gives organic spacing that actively pushes adjacent
 * nodes apart (something a pure crossing-minimization heuristic doesn't
 * optimize for). Position nodes keep a strict left-to-right ordering by
 * relative advantage column, enforced two ways: a strong forceX pulls
 * each position toward its column throughout the simulation, AND x is
 * hard overwritten to the exact column value for positions in the final
 * output — so the ordering holds by construction even if the simulation
 * hasn't fully converged. Submissions have no such pin and settle purely
 * from link/collision forces.
 */
export function computeAutoLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  dimensions?: Map<string, NodeDimensions>
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map()

  const columnOf = buildColumnLookup(nodes)
  const columnCount = columnOf.size

  const simNodes: SimNode[] = nodes.map((n) => {
    const dims = dimensions?.get(n.id)
    const width = dims?.width ?? DEFAULT_NODE_WIDTH
    const height = dims?.height ?? DEFAULT_NODE_HEIGHT

    let columnX: number | null = null
    if (n.type !== 'submission') {
      const entry = getLibraryEntry(n.libraryId)
      const column = columnOf.get(entry?.advantage ?? 0) ?? 0
      columnX = column * COLUMN_WIDTH
    }

    return {
      id: n.id,
      columnX,
      radius: Math.max(width, height) * 0.75,
      // Seed positions at their target column; seed submissions roughly
      // centered over the column span so they start near the graph
      // instead of at a meaningless x=0 default.
      x: columnX ?? ((columnCount - 1) / 2) * COLUMN_WIDTH,
      y: (Math.random() - 0.5) * 60,
    }
  })

  const nodeIds = new Set(nodes.map((n) => n.id))
  const links = edges
    .filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId) && e.sourceId !== e.targetId)
    .map((e) => ({ source: e.sourceId, target: e.targetId }))

  const simulation = forceSimulation(simNodes)
    .force('charge', forceManyBody().strength(-300))
    .force(
      'link',
      forceLink(links)
        .id((d) => (d as SimNode).id)
        .distance(150)
        .strength(0.3)
    )
    .force(
      'collide',
      forceCollide<SimNode>((d) => d.radius).strength(1)
    )
    // Strong pull toward the exact column x for positions only — acts
    // almost like a constraint during the simulation. Submissions (null
    // columnX) get no horizontal pin at all, just link/collision forces.
    .force(
      'x',
      forceX<SimNode>((d) => d.columnX ?? d.x).strength((d) => (d.columnX === null ? 0 : 1))
    )
    .force('y', forceY(0).strength(0.02))
    .stop()

  for (let i = 0; i < SIMULATION_TICKS; i++) simulation.tick()

  const result = new Map<string, { x: number; y: number }>()
  for (const n of simNodes) {
    // Hard-set x to the exact column value for positions regardless of
    // simulation drift — this is what actually guarantees the ordering.
    // Submissions keep whatever x the simulation settled on.
    result.set(n.id, { x: n.columnX ?? n.x, y: n.y })
  }
  return result
}

const MIN_NODE_SPACING = 130

/**
 * Same relative-column x used by computeAutoLayout, but derived only from
 * nodes already on the graph — inserting one more node must never shift
 * where existing nodes' columns land, so this does not add the new node's
 * own advantage value into the lookup before reading it back out.
 *
 * When no existing node shares this exact advantage, the new node gets a
 * fractional x strictly between its neighboring columns (or just outside
 * the first/last column if it's more extreme than anything on the graph)
 * rather than snapping onto an adjacent column's exact x, which would
 * visually overlap that column as if it belonged there. Auto-layout will
 * normalize this into a real column next time it runs.
 */
function columnXForExisting(existingNodes: GraphNode[], advantage: number): number {
  const columnOf = buildColumnLookup(existingNodes)
  if (columnOf.size === 0) return 0
  if (columnOf.has(advantage)) {
    return (columnOf.get(advantage) ?? 0) * COLUMN_WIDTH
  }

  const sorted = [...columnOf.keys()].sort((a, b) => a - b)
  const lowerCount = sorted.filter((a) => a < advantage).length
  const higherCount = sorted.length - lowerCount

  if (lowerCount === 0) return -0.5 * COLUMN_WIDTH
  if (higherCount === 0) return (sorted.length - 1 + 0.5) * COLUMN_WIDTH
  return (lowerCount - 0.5) * COLUMN_WIDTH
}

/**
 * Placement for a single new node. Positions are pinned to their
 * advantage column (matching auto-layout's left=disadvantageous,
 * right=advantageous convention) and only search vertically for a free
 * spot near their connected context. Submissions have no column (they can
 * be reached from anywhere) and search radially near context in both
 * axes, same as before. Existing nodes are never moved — the column is
 * computed purely from the current graph, and collision avoidance only
 * ever repositions the new node being placed.
 */
export function placeNearContext(
  contextNodes: Array<{ x: number; y: number }>,
  fallback: { x: number; y: number },
  occupied: Array<{ x: number; y: number }> = [],
  newNode?: { type: 'position' | 'submission'; libraryId: string },
  existingNodes: GraphNode[] = []
): { x: number; y: number } {
  const baseY = contextNodes.length > 0 ? contextNodes.reduce((sum, n) => sum + n.y, 0) / contextNodes.length : fallback.y

  if (newNode && newNode.type === 'position') {
    const entry = getLibraryEntry(newNode.libraryId)
    const columnX = columnXForExisting(existingNodes, entry?.advantage ?? 0)

    for (let attempt = 0; attempt < 24; attempt++) {
      const offset = attempt === 0 ? 0 : Math.ceil(attempt / 2) * 70 * (attempt % 2 === 0 ? 1 : -1)
      const candidate = { x: columnX, y: baseY + offset }
      const collides = occupied.some(
        (o) => Math.hypot(o.x - candidate.x, o.y - candidate.y) < MIN_NODE_SPACING
      )
      if (!collides) return candidate
    }

    return { x: columnX, y: baseY + occupied.length * 70 }
  }

  const baseX = contextNodes.length > 0 ? contextNodes.reduce((sum, n) => sum + n.x, 0) / contextNodes.length : fallback.x
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
