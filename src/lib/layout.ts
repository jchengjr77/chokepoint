import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force'
import { getLibraryEntry } from './library'
import type { GraphEdge, GraphNode } from '../types'

interface SimNode extends GraphNode {
  index?: number
}

const COLUMN_SPACING = 130
const MAX_ADVANTAGE = 5
const SUBMISSION_COLUMN_X = COLUMN_SPACING * (MAX_ADVANTAGE + 1)

/**
 * Target x-coordinate for a node's advantage column: disadvantageous
 * (bottom-of-control) positions on the left, neutral positions and guards
 * near center, advantageous (top-of-control) positions right-of-center,
 * and submissions — the ultimate winning outcome — pinned to the far right,
 * beyond even the most dominant (+5) position column.
 */
function targetColumnX(node: GraphNode): number {
  if (node.type === 'submission') return SUBMISSION_COLUMN_X

  const entry = getLibraryEntry(node.libraryId)
  const advantage = entry?.advantage ?? 0
  return advantage * COLUMN_SPACING
}

/**
 * Force-directed layout: nodes are pulled toward a horizontal column based
 * on positional advantage (losing positions left, winning positions right,
 * neutral positions center, submissions far right), while a vertical force
 * and collision keep nodes in the same column from overlapping.
 */
export function computeAutoLayout(nodes: GraphNode[], edges: GraphEdge[]): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map()

  const simNodes: SimNode[] = nodes.map((n) => ({ ...n }))
  const nodeIndex = new Map(simNodes.map((n, i) => [n.id, i]))

  const simLinks = edges
    .filter((e) => nodeIndex.has(e.sourceId) && nodeIndex.has(e.targetId))
    .map((e) => ({ source: e.sourceId, target: e.targetId }))

  const simulation = forceSimulation(simNodes)
    .force(
      'link',
      forceLink(simLinks)
        .id((d) => (d as SimNode).id)
        .distance(120)
        .strength(0.15)
    )
    .force('charge', forceManyBody().strength(-180))
    .force('collide', forceCollide(70))
    .force('x', forceX<SimNode>((d) => targetColumnX(d)).strength(0.6))
    .force('y', forceY<SimNode>(0).strength(0.05))
    .stop()

  simulation.tick(300)

  const result = new Map<string, { x: number; y: number }>()
  for (const n of simNodes) {
    result.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 })
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
