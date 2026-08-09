import { useMemo, useState } from 'react'
import type { GraphEdge, GraphNode, NLParseResult } from '../types'

interface NLPreviewModalProps {
  result: NLParseResult
  existingNodes: GraphNode[]
  existingEdges: GraphEdge[]
  onConfirm: (accepted: NLParseResult) => void
  onCancel: () => void
}

export function NLPreviewModal({ result, existingNodes, existingEdges, onConfirm, onCancel }: NLPreviewModalProps) {
  const [excludedNodes, setExcludedNodes] = useState<Set<string>>(new Set())
  const [excludedEdges, setExcludedEdges] = useState<Set<number>>(new Set())

  const newNodeCount = useMemo(
    () => result.nodes.filter((n) => !n.alreadyOnGraph && !excludedNodes.has(n.libraryId)).length,
    [result.nodes, excludedNodes]
  )
  const trainedNodeCount = useMemo(
    () => result.nodes.filter((n) => n.alreadyOnGraph && !excludedNodes.has(n.libraryId)).length,
    [result.nodes, excludedNodes]
  )
  const acceptedNodeCount = newNodeCount + trainedNodeCount
  const acceptedEdgeCount = result.edges.length - excludedEdges.size

  const edgeAlreadyExists = (sourceLibraryId: string, targetLibraryId: string): boolean => {
    const sourceId = existingNodes.find((n) => n.libraryId === sourceLibraryId)?.id
    const targetId = existingNodes.find((n) => n.libraryId === targetLibraryId)?.id
    if (!sourceId || !targetId) return false
    return existingEdges.some(
      (e) =>
        (e.sourceId === sourceId && e.targetId === targetId) ||
        (e.bidirectional && e.sourceId === targetId && e.targetId === sourceId)
    )
  }

  const trainedEdgeCount = useMemo(
    () =>
      result.edges.filter(
        (e, idx) => !excludedEdges.has(idx) && edgeAlreadyExists(e.sourceLibraryId, e.targetLibraryId)
      ).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result.edges, excludedEdges, existingNodes, existingEdges]
  )

  const toggleNode = (id: string) => {
    setExcludedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleEdge = (idx: number) => {
    setExcludedEdges((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleConfirm = () => {
    onConfirm({
      nodes: result.nodes.filter((n) => !excludedNodes.has(n.libraryId)),
      edges: result.edges.filter((_, idx) => !excludedEdges.has(idx)),
      unrecognized: result.unrecognized,
    })
  }

  const nothingToAdd = acceptedNodeCount === 0 && acceptedEdgeCount === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col border border-border bg-bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-semibold uppercase text-text-primary">Review Changes</h2>
          <p className="mt-1 text-[11px] text-text-secondary">
            Add {newNodeCount} node{newNodeCount === 1 ? '' : 's'} and {acceptedEdgeCount - trainedEdgeCount} new
            transition{acceptedEdgeCount - trainedEdgeCount === 1 ? '' : 's'}
            {trainedNodeCount + trainedEdgeCount > 0 && (
              <>
                , log training on {trainedNodeCount + trainedEdgeCount} existing item
                {trainedNodeCount + trainedEdgeCount === 1 ? '' : 's'}
              </>
            )}
            . Confirm?
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {result.nodes.length > 0 && (
            <div className="mb-4">
              <span className="mb-2 block text-[10px] uppercase text-text-secondary">Nodes</span>
              <div className="flex flex-col gap-1">
                {result.nodes.map((n) => (
                  <label
                    key={n.libraryId}
                    className="flex items-center gap-2 border border-border px-2 py-1.5 text-[12px] text-text-primary"
                  >
                    <input
                      type="checkbox"
                      checked={!excludedNodes.has(n.libraryId)}
                      onChange={() => toggleNode(n.libraryId)}
                    />
                    <span>{n.label}</span>
                    <span className="text-[10px] uppercase text-text-tertiary">{n.type}</span>
                    {n.alreadyOnGraph && (
                      <span className="ml-auto text-[10px] uppercase text-node-submission">+1 rep</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {result.edges.length > 0 && (
            <div className="mb-4">
              <span className="mb-2 block text-[10px] uppercase text-text-secondary">Transitions</span>
              <div className="flex flex-col gap-1">
                {result.edges.map((e, idx) => {
                  const sourceLabel = result.nodes.find((n) => n.libraryId === e.sourceLibraryId)?.label ?? e.sourceLibraryId
                  const targetLabel = result.nodes.find((n) => n.libraryId === e.targetLibraryId)?.label ?? e.targetLibraryId
                  const alreadyExists = edgeAlreadyExists(e.sourceLibraryId, e.targetLibraryId)
                  return (
                    <label
                      key={idx}
                      className="flex items-center gap-2 border border-border px-2 py-1.5 text-[12px] text-text-primary"
                    >
                      <input type="checkbox" checked={!excludedEdges.has(idx)} onChange={() => toggleEdge(idx)} />
                      <span>
                        {sourceLabel} {e.bidirectional ? '↔' : '→'} {targetLabel}
                      </span>
                      {e.label && <span className="text-[10px] text-text-tertiary">({e.label})</span>}
                      {alreadyExists && (
                        <span className="ml-auto text-[10px] uppercase text-node-submission">+1 rep</span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {result.unrecognized.length > 0 && (
            <div>
              <span className="mb-2 block text-[10px] uppercase text-text-secondary">Unrecognized</span>
              <div className="flex flex-col gap-1">
                {result.unrecognized.map((term, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 border px-2 py-1.5 text-[12px] text-text-secondary"
                    style={{ borderColor: '#664400' }}
                  >
                    <span style={{ color: '#ffaa00' }}>&#9888;</span>
                    <span>{term}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.nodes.length === 0 && result.edges.length === 0 && result.unrecognized.length === 0 && (
            <p className="text-[12px] text-text-tertiary">Nothing was recognized in that input.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            onClick={onCancel}
            className="border border-border px-3 py-1.5 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={nothingToAdd}
            className="border border-text-primary bg-text-primary px-3 py-1.5 text-[11px] font-medium uppercase text-black hover:bg-bg-elevated hover:text-text-primary disabled:opacity-40"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
