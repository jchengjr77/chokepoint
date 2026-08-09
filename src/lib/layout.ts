import dagre from '@dagrejs/dagre'
import { getLibraryEntry } from './library'
import type { GraphEdge, GraphNode } from '../types'

const MAX_ADVANTAGE = 5
const SUBMISSION_RANK_OFFSET = MAX_ADVANTAGE + 1

// dagre already accounts for each node's actual width/height when spacing
// ranks/rows — these are the extra gaps on top of that.
const RANK_SEP = 70 // horizontal gap between advantage columns
const NODE_SEP = 130 // vertical gap between nodes within a column
const DEFAULT_NODE_WIDTH = 130
const DEFAULT_NODE_HEIGHT = 40

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
 * Layered (Sugiyama-style) layout via dagre. dagre's own minRank/maxRank
 * node constraints turned out to NOT reliably pin a node's rank once the
 * graph has enough edges/nodes for its ranking algorithm to renumber ranks
 * — verified with a repro before writing this workaround, so don't
 * reintroduce minRank/maxRank pinning without re-testing against a dense,
 * multi-parent graph like the one in that repro.
 *
 * Instead: let dagre assign ranks and coordinates completely on its own
 * (which still gives good, crossing-minimized y-ordering from its usual
 * algorithm), then overwrite x for every node using our own rank derived
 * directly from positional advantage. Since x is a simple linear function
 * of rank, this guarantees the left-to-right priority ordering holds
 * exactly, independent of whatever dagre decided internally.
 */
export function computeAutoLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  dimensions?: Map<string, NodeDimensions>
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map()

  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: 'LR', nodesep: NODE_SEP, ranksep: RANK_SEP })
  graph.setDefaultEdgeLabel(() => ({}))

  for (const n of nodes) {
    const dims = dimensions?.get(n.id)
    graph.setNode(n.id, {
      width: dims?.width ?? DEFAULT_NODE_WIDTH,
      height: dims?.height ?? DEFAULT_NODE_HEIGHT,
    })
  }

  const nodeIds = new Set(nodes.map((n) => n.id))
  for (const e of edges) {
    if (!nodeIds.has(e.sourceId) || !nodeIds.has(e.targetId)) continue
    // Self-loops (a node connected to itself) aren't meaningful positions
    // here and dagre doesn't need them for layout.
    if (e.sourceId === e.targetId) continue
    graph.setEdge(e.sourceId, e.targetId)
  }

  dagre.layout(graph)

  const columnWidth = RANK_SEP + DEFAULT_NODE_WIDTH
  const result = new Map<string, { x: number; y: number }>()
  for (const n of nodes) {
    const placed = graph.node(n.id)
    if (!placed) continue
    result.set(n.id, { x: nodeRank(n) * columnWidth, y: placed.y })
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
