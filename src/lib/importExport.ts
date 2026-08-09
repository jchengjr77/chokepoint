import type { GraphEdge, GraphExport, GraphNode } from '../types'
import { getLibraryEntry } from './library'

export function exportGraph(nodes: GraphNode[], edges: GraphEdge[]): void {
  const payload: GraphExport = {
    nodes,
    edges,
    exportedAt: new Date().toISOString(),
    version: 1,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chokepoint-graph-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export interface ImportValidationResult {
  valid: boolean
  errors: string[]
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export function validateImport(raw: unknown): ImportValidationResult {
  const errors: string[] = []

  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, errors: ['File is not a valid JSON object.'], nodes: [], edges: [] }
  }

  const data = raw as Partial<GraphExport>
  if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    return { valid: false, errors: ['Missing nodes[] or edges[] arrays.'], nodes: [], edges: [] }
  }

  const validNodes: GraphNode[] = []
  const nodeIds = new Set<string>()

  for (const n of data.nodes) {
    if (!n || typeof n !== 'object') continue
    const node = n as Partial<GraphNode>
    if (!node.libraryId || !getLibraryEntry(node.libraryId)) {
      errors.push(`Unknown library_id "${node.libraryId}" — skipped.`)
      continue
    }
    if (!node.id || (node.type !== 'position' && node.type !== 'submission')) {
      errors.push(`Malformed node entry — skipped.`)
      continue
    }
    validNodes.push({
      id: node.id,
      libraryId: node.libraryId,
      type: node.type,
      label: node.label ?? getLibraryEntry(node.libraryId)!.label,
      notes: node.notes ?? '',
      x: typeof node.x === 'number' ? node.x : 0,
      y: typeof node.y === 'number' ? node.y : 0,
      dateAdded: node.dateAdded ?? new Date().toISOString(),
      proficiency: typeof node.proficiency === 'number' ? node.proficiency : 0,
    })
    nodeIds.add(node.id)
  }

  const validEdges: GraphEdge[] = []
  for (const e of data.edges) {
    if (!e || typeof e !== 'object') continue
    const edge = e as Partial<GraphEdge>
    if (!edge.id || !edge.sourceId || !edge.targetId) {
      errors.push('Malformed edge entry — skipped.')
      continue
    }
    if (!nodeIds.has(edge.sourceId) || !nodeIds.has(edge.targetId)) {
      errors.push(`Edge references missing node — skipped.`)
      continue
    }
    validEdges.push({
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      label: edge.label ?? '',
      bidirectional: Boolean(edge.bidirectional),
      notes: edge.notes ?? '',
      dateAdded: edge.dateAdded ?? new Date().toISOString(),
      proficiency: typeof edge.proficiency === 'number' ? edge.proficiency : 0,
    })
  }

  return { valid: true, errors, nodes: validNodes, edges: validEdges }
}
