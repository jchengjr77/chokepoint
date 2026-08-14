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
  fx?: number | null // d3-force: pins the node in place when set
  fy?: number | null
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

/**
 * Same force-directed layout as computeAutoLayout, but only returns new
 * positions for newNodeIds — every other node is pinned in place (d3-force
 * fx/fy) so it still participates in collision/link forces (new nodes push
 * off of and connect to it normally) without ever being moved itself. This
 * is what backs "auto-layout new nodes on add": a user's manual
 * arrangement of their existing graph is never disturbed, but nodes that
 * just got added land in a sensible, non-overlapping spot via the same
 * column/force logic as a full auto-layout run.
 */
export function computeAutoLayoutForNewNodes(
  nodes: GraphNode[],
  edges: Array<{ sourceId: string; targetId: string }>,
  newNodeIds: Set<string>,
  dimensions?: Map<string, NodeDimensions>
): Map<string, { x: number; y: number }> {
  const newNodes = nodes.filter((n) => newNodeIds.has(n.id))
  if (newNodes.length === 0) return new Map()

  const columnOf = buildColumnLookup(nodes)
  const columnCount = columnOf.size

  const simNodes: SimNode[] = nodes.map((n) => {
    const dims = dimensions?.get(n.id)
    const width = dims?.width ?? DEFAULT_NODE_WIDTH
    const height = dims?.height ?? DEFAULT_NODE_HEIGHT
    const isNew = newNodeIds.has(n.id)

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
      x: isNew ? (columnX ?? ((columnCount - 1) / 2) * COLUMN_WIDTH) : n.x,
      y: isNew ? (Math.random() - 0.5) * 60 + n.y : n.y,
      // Existing nodes are pinned at their current position; only new
      // nodes are free to move.
      fx: isNew ? undefined : n.x,
      fy: isNew ? undefined : n.y,
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
    .force(
      'x',
      forceX<SimNode>((d) => d.columnX ?? d.x).strength((d) => (d.columnX === null ? 0 : 1))
    )
    .force('y', forceY(0).strength(0.02))
    .stop()

  for (let i = 0; i < SIMULATION_TICKS; i++) simulation.tick()

  const result = new Map<string, { x: number; y: number }>()
  for (const n of simNodes) {
    if (!newNodeIds.has(n.id)) continue
    result.set(n.id, { x: n.columnX ?? n.x, y: n.y })
  }
  return result
}

