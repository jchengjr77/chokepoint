import { defaultEdgeLabel } from './edgeLabel'
import { toTitleCase } from './titleCase'
import type { GraphEdge, GraphNode, NLParseResult } from '../types'

export interface ApplyNlResultDeps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  addNode: (params: {
    libraryId: string
    type: GraphNode['type']
    label: string
    x: number
    y: number
    trainedAt?: string | null
  }) => Promise<GraphNode | null>
  addEdge: (params: {
    sourceId: string
    targetId: string
    label: string
    bidirectional: boolean
    trainedAt?: string | null
  }) => Promise<GraphEdge | null>
  incrementNodeProficiency: (id: string, trainedAt?: string | null) => Promise<void>
  incrementEdgeProficiency: (id: string, trainedAt?: string | null) => Promise<void>
  /** Called with every newly-created node once all writes finish — e.g. web's canvas positions them via auto-layout; callers with no positional UI (mobile's list view) can omit this. */
  onNodesCreated?: (createdNodes: GraphNode[], createdEdges: Array<{ sourceId: string; targetId: string }>) => Promise<void>
}

/**
 * Applies a confirmed NLParseResult to the graph store: existing
 * (already-on-graph) nodes/edges get a proficiency bump, new ones get
 * created. Shared between web (which then auto-layouts the new nodes on
 * its canvas) and mobile (whose placeholder list view has no positions to
 * compute) — this is the actual apply logic, not just parsing.
 */
export async function applyNlResult(accepted: NLParseResult, deps: ApplyNlResultDeps): Promise<void> {
  const { nodes, edges, addNode, addEdge, incrementNodeProficiency, incrementEdgeProficiency, onNodesCreated } = deps

  const idByLibraryId = new Map<string, string>()
  for (const existing of nodes) idByLibraryId.set(existing.libraryId, existing.id)

  const createdNodes: GraphNode[] = []

  for (const n of accepted.nodes) {
    const existingId = idByLibraryId.get(n.libraryId)
    if (existingId) {
      // Already on the graph — training it again bumps its proficiency.
      await incrementNodeProficiency(existingId, accepted.trainedAt)
      continue
    }
    const created = await addNode({
      libraryId: n.libraryId,
      type: n.type,
      label: n.label,
      x: 0,
      y: 0,
      trainedAt: accepted.trainedAt,
    })
    if (created) {
      idByLibraryId.set(n.libraryId, created.id)
      createdNodes.push(created)
    }
  }

  const createdEdges: Array<{ sourceId: string; targetId: string }> = []
  const nodeById = new Map([...nodes, ...createdNodes].map((n) => [n.id, n]))

  for (const e of accepted.edges) {
    const sourceId = idByLibraryId.get(e.sourceLibraryId)
    const targetId = idByLibraryId.get(e.targetLibraryId)
    if (!sourceId || !targetId) continue

    const existingEdge = edges.find(
      (edge) =>
        (edge.sourceId === sourceId && edge.targetId === targetId) ||
        (edge.bidirectional && edge.sourceId === targetId && edge.targetId === sourceId)
    )
    if (existingEdge) {
      await incrementEdgeProficiency(existingEdge.id, accepted.trainedAt)
      continue
    }

    const label = e.label.trim()
      ? toTitleCase(e.label)
      : defaultEdgeLabel(nodeById.get(sourceId)?.label ?? '?', nodeById.get(targetId)?.label ?? '?')
    await addEdge({ sourceId, targetId, label, bidirectional: e.bidirectional, trainedAt: accepted.trainedAt })
    createdEdges.push({ sourceId, targetId })
  }

  if (onNodesCreated) await onNodesCreated(createdNodes, createdEdges)
}
