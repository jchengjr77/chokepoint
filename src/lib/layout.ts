import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force'
import { getLibraryEntry } from './library'
import type { GraphEdge, GraphNode } from '../types'

const MAX_ADVANTAGE = 5
const SUBMISSION_RANK_OFFSET = MAX_ADVANTAGE + 1

const COLUMN_WIDTH = 260 // horizontal distance between advantage columns
const DEFAULT_NODE_WIDTH = 130
const DEFAULT_NODE_HEIGHT = 40
const SIMULATION_TICKS = 300

interface SimNode {
  id: string
  rank: number
  radius: number
  x: number
  y: number
  index?: number
}

/**
 * Rank (column index) for a node's advantage: disadvantageous
 * (bottom-of-control) positions rank lowest (leftmost), neutral positions
 * sit at the zero-shifted middle, advantageous (top-of-control) positions
 * rank higher, and submissions — the ultimate winning outcome — always
 * rank beyond even the most dominant (+5) position.
 */
function nodeRank(node: GraphNode): number {
  if (node.type === 'submission') return MAX_ADVANTAGE + SUBMISSION_RANK_OFFSET
  const entry = getLibraryEntry(node.libraryId)
  return (entry?.advantage ?? 0) + MAX_ADVANTAGE
}

export interface NodeDimensions {
  width: number
  height: number
}

/**
 * Hybrid force-directed layout: nodes repel each other, connected nodes
 * pull together, and collision prevents overlap — all standard d3-force
 * behavior, which gives organic spacing that actively pushes adjacent
 * nodes apart (something dagre's crossing-minimization heuristic doesn't
 * optimize for). The left-to-right priority ordering by advantage is kept
 * exactly, in two ways: a strong forceX pulls each node toward its column
 * throughout the simulation (so nodes settle near the right place before
 * the collision/repulsion forces are even relevant), AND x is hard
 * overwritten to the exact column value in the final output — so the
 * ordering holds by construction even if the simulation hasn't fully
 * converged, not merely because the pull force usually wins.
 */
export function computeAutoLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  dimensions?: Map<string, NodeDimensions>
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map()

  const simNodes: SimNode[] = nodes.map((n) => {
    const dims = dimensions?.get(n.id)
    const width = dims?.width ?? DEFAULT_NODE_WIDTH
    const height = dims?.height ?? DEFAULT_NODE_HEIGHT
    const rank = nodeRank(n)
    return {
      id: n.id,
      rank,
      radius: Math.max(width, height) * 0.75,
      // Seed at the target column so nodes start roughly separated by
      // advantage even before the pin force has had a chance to act.
      x: rank * COLUMN_WIDTH,
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
    // Strong pull toward the exact column x — acts almost like a
    // constraint during the simulation, while still letting collision and
    // link forces determine y organically.
    .force(
      'x',
      forceX<SimNode>((d) => d.rank * COLUMN_WIDTH).strength(1)
    )
    .force('y', forceY(0).strength(0.02))
    .stop()

  for (let i = 0; i < SIMULATION_TICKS; i++) simulation.tick()

  const result = new Map<string, { x: number; y: number }>()
  for (const n of simNodes) {
    // Hard-set x to the exact column value regardless of simulation
    // drift — this is what actually guarantees the ordering, not the pull
    // force above (which only makes convergence fast and the y-spread
    // physically realistic).
    result.set(n.id, { x: n.rank * COLUMN_WIDTH, y: n.y })
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
