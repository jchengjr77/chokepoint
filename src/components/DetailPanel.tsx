import { useState, useEffect } from 'react'
import type { GraphEdge, GraphNode } from '../types'
import { useGraphStore } from '../hooks/useGraphStore'

interface DetailPanelProps {
  node: GraphNode | null
  edge: GraphEdge | null
  allNodes: GraphNode[]
  onClose: () => void
  onSelectNode: (id: string) => void
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

export function DetailPanel({ node, edge, allNodes, onClose, onSelectNode }: DetailPanelProps) {
  const { updateNodeNotes, deleteNode, updateEdge, deleteEdge, edges } = useGraphStore()
  const [notes, setNotes] = useState('')
  const [edgeLabel, setEdgeLabel] = useState('')
  const [edgeBidirectional, setEdgeBidirectional] = useState(false)
  const [edgeNotes, setEdgeNotes] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    setNotes(node?.notes ?? '')
    setConfirmingDelete(false)
  }, [node])

  useEffect(() => {
    setEdgeLabel(edge?.label ?? '')
    setEdgeBidirectional(edge?.bidirectional ?? false)
    setEdgeNotes(edge?.notes ?? '')
    setConfirmingDelete(false)
  }, [edge])

  if (!node && !edge) return null

  const open = Boolean(node || edge)

  const connectedEdges = node
    ? edges.filter((e) => e.sourceId === node.id || e.targetId === node.id)
    : []

  return (
    <div
      className={`panel-transition fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border bg-bg-surface sm:w-80 ${
        open ? 'translate-x-0' : 'translate-x-full'
      } max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:h-[70vh] max-sm:border-l-0 max-sm:border-t`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-[13px] font-semibold uppercase text-text-primary">
          {node ? 'Node' : 'Edge'}
        </h2>
        <button onClick={onClose} className="text-[16px] text-text-secondary hover:text-text-primary">
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {node && (
          <>
            <p className="mb-1 text-[14px] font-semibold text-text-primary">{node.label}</p>
            <p className="mb-4 text-[11px] uppercase text-text-secondary">
              {node.type} &middot; added {formatDate(node.dateAdded)}
            </p>

            <label className="mb-4 flex flex-col gap-1">
              <span className="text-[10px] uppercase text-text-secondary">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => void updateNodeNotes(node.id, notes)}
                rows={4}
                className="w-full resize-none border border-border bg-transparent p-2 text-[12px] text-text-primary outline-none focus:border-border-focus"
                placeholder="Personal notes, details, tips..."
              />
            </label>

            <div className="mb-4">
              <span className="mb-1 block text-[10px] uppercase text-text-secondary">
                Connected ({connectedEdges.length})
              </span>
              <div className="flex flex-col gap-1">
                {connectedEdges.map((e) => {
                  const otherId = e.sourceId === node.id ? e.targetId : e.sourceId
                  const other = allNodes.find((n) => n.id === otherId)
                  const arrow = e.sourceId === node.id ? '→' : '←'
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelectNode(otherId)}
                      className="flex items-center gap-1 border border-border px-2 py-1 text-left text-[11px] text-text-primary hover:bg-bg-elevated"
                    >
                      <span className="text-text-tertiary">{arrow}</span>
                      {other?.label ?? 'Unknown'}
                      {e.label && <span className="text-text-tertiary">({e.label})</span>}
                    </button>
                  )
                })}
                {connectedEdges.length === 0 && (
                  <p className="text-[11px] text-text-tertiary">No connections yet.</p>
                )}
              </div>
            </div>
          </>
        )}

        {edge && (
          <>
            <label className="mb-3 flex flex-col gap-1">
              <span className="text-[10px] uppercase text-text-secondary">Label</span>
              <input
                type="text"
                value={edgeLabel}
                onChange={(e) => setEdgeLabel(e.target.value)}
                onBlur={() => void updateEdge(edge.id, { label: edgeLabel })}
                className="w-full border-0 border-b border-border bg-transparent py-1 text-[12px] text-text-primary outline-none focus:border-border-focus"
                placeholder="technique name"
              />
            </label>

            <label className="mb-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={edgeBidirectional}
                onChange={(e) => {
                  setEdgeBidirectional(e.target.checked)
                  void updateEdge(edge.id, { bidirectional: e.target.checked })
                }}
              />
              <span className="text-[11px] text-text-secondary">Bidirectional</span>
            </label>

            <label className="mb-4 flex flex-col gap-1">
              <span className="text-[10px] uppercase text-text-secondary">Notes</span>
              <textarea
                value={edgeNotes}
                onChange={(e) => setEdgeNotes(e.target.value)}
                onBlur={() => void updateEdge(edge.id, { notes: edgeNotes })}
                rows={4}
                className="w-full resize-none border border-border bg-transparent p-2 text-[12px] text-text-primary outline-none focus:border-border-focus"
              />
            </label>
          </>
        )}
      </div>

      <div className="border-t border-border px-4 py-3">
        {confirmingDelete ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-text-secondary">Delete permanently?</span>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="border border-border px-2 py-1 text-[11px] uppercase text-text-primary hover:bg-bg-elevated"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (node) void deleteNode(node.id)
                  if (edge) void deleteEdge(edge.id)
                  onClose()
                }}
                className="border px-2 py-1 text-[11px] uppercase hover:bg-bg-elevated"
                style={{ borderColor: '#ff5555', color: '#ff5555' }}
              >
                Confirm
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="w-full border px-3 py-2 text-[11px] font-medium uppercase hover:bg-bg-elevated"
            style={{ borderColor: '#ff5555', color: '#ff5555' }}
          >
            Delete {node ? 'Node' : 'Edge'}
          </button>
        )}
      </div>
    </div>
  )
}
