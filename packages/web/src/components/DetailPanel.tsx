import { useState, useEffect } from 'react'
import type { GraphEdge, GraphNode } from '@chokepoint/shared'
import { useGraphStore } from '@chokepoint/shared'

interface EdgePair {
  sourceId: string
  targetId: string
}

interface DetailPanelProps {
  node: GraphNode | null
  edgePair: EdgePair | null
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

function TechniqueRow({
  edge,
  otherLabel,
  arrow,
  onSelect,
}: {
  edge: GraphEdge
  otherLabel: string
  arrow: string
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="flex w-full items-center justify-between border border-border px-2 py-1.5 text-left text-[11px] text-text-primary hover:bg-bg-elevated"
    >
      <span className="flex items-center gap-1">
        <span className="text-text-tertiary">{arrow}</span>
        {edge.label || <span className="text-text-tertiary">(untitled)</span>}
      </span>
      <span className="flex items-center gap-2 text-[10px] uppercase text-text-tertiary">
        {otherLabel}
        <span className="text-node-submission">{edge.proficiency} session{edge.proficiency === 1 ? '' : 's'}</span>
      </span>
    </button>
  )
}

function TechniqueEditor({ edge, onBack }: { edge: GraphEdge; onBack: () => void }) {
  const { edges, updateEdge, deleteEdge, incrementEdgeProficiency, decrementEdgeProficiency } = useGraphStore()
  const live = edges.find((e) => e.id === edge.id) ?? edge

  const [label, setLabel] = useState(edge.label)
  const [bidirectional, setBidirectional] = useState(edge.bidirectional)
  const [notes, setNotes] = useState(edge.notes)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    setLabel(edge.label)
    setBidirectional(edge.bidirectional)
    setNotes(edge.notes)
    setConfirmingDelete(false)
  }, [edge])

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-3 flex items-center gap-1 text-[10px] uppercase text-text-secondary hover:text-text-primary"
      >
        &larr; All techniques
      </button>

      <div className="mb-4 flex items-center justify-between border border-border px-3 py-2">
        <div>
          <span className="block text-[10px] uppercase text-text-secondary">Proficiency</span>
          <span className="text-[16px] font-semibold text-text-primary">{live.proficiency}</span>
          <span className="ml-1 text-[10px] uppercase text-text-tertiary">sessions</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => void decrementEdgeProficiency(edge.id)}
            disabled={live.proficiency <= 0}
            aria-label="Remove a logged session"
            title="Remove a logged session"
            className="border border-border px-2 py-1 text-[11px] font-medium uppercase text-text-secondary hover:bg-bg-elevated disabled:opacity-40"
          >
            &minus;
          </button>
          <button
            onClick={() => void incrementEdgeProficiency(edge.id)}
            className="border border-node-submission px-2 py-1 text-[11px] font-medium uppercase text-node-submission hover:bg-bg-elevated"
          >
            + Log Training
          </button>
        </div>
      </div>

      <label className="mb-3 flex flex-col gap-1">
        <span className="text-[10px] uppercase text-text-secondary">Label</span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => void updateEdge(edge.id, { label })}
          className="w-full border-0 border-b border-border bg-transparent py-1 text-[12px] text-text-primary outline-none focus:border-border-focus"
          placeholder="technique name"
        />
      </label>

      <label className="mb-3 flex items-center gap-2">
        <input
          type="checkbox"
          checked={bidirectional}
          onChange={(e) => {
            setBidirectional(e.target.checked)
            void updateEdge(edge.id, { bidirectional: e.target.checked })
          }}
        />
        <span className="text-[11px] text-text-secondary">Bidirectional</span>
      </label>

      <label className="mb-4 flex flex-col gap-1">
        <span className="text-[10px] uppercase text-text-secondary">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => void updateEdge(edge.id, { notes })}
          rows={4}
          className="w-full resize-none border border-border bg-transparent p-2 text-[12px] text-text-primary outline-none focus:border-border-focus"
        />
      </label>

      {confirmingDelete ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-text-secondary">Delete this technique?</span>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmingDelete(false)}
              className="border border-border px-2 py-1 text-[11px] uppercase text-text-primary hover:bg-bg-elevated"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                void deleteEdge(edge.id)
                onBack()
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
          Delete This Technique
        </button>
      )}
    </div>
  )
}

export function DetailPanel({ node, edgePair, allNodes, onClose, onSelectNode }: DetailPanelProps) {
  const { nodes, edges, updateNodeNotes, deleteNode, incrementNodeProficiency, decrementNodeProficiency } =
    useGraphStore()

  const liveNode = node ? nodes.find((n) => n.id === node.id) ?? node : null
  const [notes, setNotes] = useState('')
  const [confirmingDeleteNode, setConfirmingDeleteNode] = useState(false)
  const [editingTechniqueId, setEditingTechniqueId] = useState<string | null>(null)

  useEffect(() => {
    setNotes(node?.notes ?? '')
    setConfirmingDeleteNode(false)
  }, [node])

  useEffect(() => {
    setEditingTechniqueId(null)
  }, [edgePair])

  if (!node && !edgePair) return null

  const open = Boolean(node || edgePair)

  const connectedEdges = node
    ? edges.filter((e) => e.sourceId === node.id || e.targetId === node.id)
    : []

  const techniques = edgePair
    ? edges.filter(
        (e) =>
          (e.sourceId === edgePair.sourceId && e.targetId === edgePair.targetId) ||
          (e.sourceId === edgePair.targetId && e.targetId === edgePair.sourceId)
      )
    : []
  const editingTechnique = techniques.find((e) => e.id === editingTechniqueId) ?? null
  const sourceNode = edgePair ? allNodes.find((n) => n.id === edgePair.sourceId) : null
  const targetNode = edgePair ? allNodes.find((n) => n.id === edgePair.targetId) : null

  return (
    <div
      className={`panel-transition fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border bg-bg-surface sm:w-80 ${
        open ? 'translate-x-0' : 'translate-x-full'
      } max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:h-[70vh] max-sm:border-l-0 max-sm:border-t`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-[13px] font-semibold uppercase text-text-primary">
          {node ? 'Node' : 'Techniques'}
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

            <div className="mb-4 flex items-center justify-between border border-border px-3 py-2">
              <div>
                <span className="block text-[10px] uppercase text-text-secondary">Proficiency</span>
                <span className="text-[16px] font-semibold text-text-primary">{liveNode?.proficiency ?? 0}</span>
                <span className="ml-1 text-[10px] uppercase text-text-tertiary">sessions</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => void decrementNodeProficiency(node.id)}
                  disabled={(liveNode?.proficiency ?? 0) <= 0}
                  aria-label="Remove a logged session"
                  title="Remove a logged session"
                  className="border border-border px-2 py-1 text-[11px] font-medium uppercase text-text-secondary hover:bg-bg-elevated disabled:opacity-40"
                >
                  &minus;
                </button>
                <button
                  onClick={() => void incrementNodeProficiency(node.id)}
                  className="border border-node-submission px-2 py-1 text-[11px] font-medium uppercase text-node-submission hover:bg-bg-elevated"
                >
                  + Log Training
                </button>
              </div>
            </div>

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

        {edgePair && editingTechnique && (
          <TechniqueEditor edge={editingTechnique} onBack={() => setEditingTechniqueId(null)} />
        )}

        {edgePair && !editingTechnique && (
          <>
            <p className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-text-primary">
              <span>{sourceNode?.label ?? 'Unknown'}</span>
              <span className="text-text-tertiary">&harr;</span>
              <span>{targetNode?.label ?? 'Unknown'}</span>
            </p>

            <span className="mb-2 block text-[10px] uppercase text-text-secondary">
              Techniques ({techniques.length})
            </span>
            <div className="flex flex-col gap-1">
              {techniques.map((e) => {
                const forward = e.sourceId === edgePair.sourceId
                const arrow = e.bidirectional ? '↔' : forward ? '→' : '←'
                const otherLabel = forward ? targetNode?.label ?? '?' : sourceNode?.label ?? '?'
                return (
                  <TechniqueRow
                    key={e.id}
                    edge={e}
                    otherLabel={otherLabel}
                    arrow={arrow}
                    onSelect={() => setEditingTechniqueId(e.id)}
                  />
                )
              })}
              {techniques.length === 0 && (
                <p className="text-[11px] text-text-tertiary">No techniques logged between these nodes.</p>
              )}
            </div>
          </>
        )}
      </div>

      {node && (
        <div className="border-t border-border px-4 py-3">
          {confirmingDeleteNode ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-text-secondary">Delete permanently?</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingDeleteNode(false)}
                  className="border border-border px-2 py-1 text-[11px] uppercase text-text-primary hover:bg-bg-elevated"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    void deleteNode(node.id)
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
              onClick={() => setConfirmingDeleteNode(true)}
              className="w-full border px-3 py-2 text-[11px] font-medium uppercase hover:bg-bg-elevated"
              style={{ borderColor: '#ff5555', color: '#ff5555' }}
            >
              Delete Node
            </button>
          )}
        </div>
      )}
    </div>
  )
}
