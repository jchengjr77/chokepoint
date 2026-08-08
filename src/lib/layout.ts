import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceRadial } from 'd3-force'
import type { GraphEdge, GraphNode } from '../types'

interface SimNode extends GraphNode {
  index?: number
}

/**
 * Force-directed layout: positions cluster near center, submissions are
 * pulled to the periphery via a radial force keyed on node type.
 */
export function computeAutoLayout(nodes: GraphNode[], edges: GraphEdge[]): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map()

  const simNodes: SimNode[] = nodes.map((n) => ({ ...n }))
  const nodeIndex = new Map(simNodes.map((n, i) => [n.id, i]))

  const simLinks = edges
    .filter((e) => nodeIndex.has(e.sourceId) && nodeIndex.has(e.targetId))
    .map((e) => ({ source: e.sourceId, target: e.targetId }))

  const positionCount = nodes.filter((n) => n.type === 'position').length
  const outerRadius = 260 + Math.sqrt(Math.max(nodes.length, 1)) * 40
  const innerRadius = Math.min(outerRadius * 0.45, 80 + Math.sqrt(Math.max(positionCount, 1)) * 25)

  const simulation = forceSimulation(simNodes)
    .force(
      'link',
      forceLink(simLinks)
        .id((d) => (d as SimNode).id)
        .distance(120)
        .strength(0.3)
    )
    .force('charge', forceManyBody().strength(-220))
    .force('collide', forceCollide(70))
    .force('center', forceCenter(0, 0))
    .force(
      'radial',
      forceRadial<SimNode>(
        (d) => (d.type === 'submission' ? outerRadius : innerRadius),
        0,
        0
      ).strength((d) => (d.type === 'submission' ? 0.9 : 0.15))
    )
    .stop()

  simulation.tick(300)

  const result = new Map<string, { x: number; y: number }>()
  for (const n of simNodes) {
    result.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 })
  }
  return result
}

/**
 * Placement for a single new node: near the average position of its
 * connected existing nodes, with a small random offset to avoid overlap.
 */
export function placeNearContext(
  contextNodes: Array<{ x: number; y: number }>,
  fallback: { x: number; y: number }
): { x: number; y: number } {
  if (contextNodes.length === 0) return fallback

  const avgX = contextNodes.reduce((sum, n) => sum + n.x, 0) / contextNodes.length
  const avgY = contextNodes.reduce((sum, n) => sum + n.y, 0) / contextNodes.length
  const angle = Math.random() * Math.PI * 2
  const distance = 140 + Math.random() * 40

  return {
    x: avgX + Math.cos(angle) * distance,
    y: avgY + Math.sin(angle) * distance,
  }
}
