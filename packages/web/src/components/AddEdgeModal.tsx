import { useState } from 'react'
import type { GraphNode } from '@chokepoint/shared'

interface AddEdgeModalProps {
  source: GraphNode
  target: GraphNode
  suggestedLabel?: string
  onConfirm: (label: string, bidirectional: boolean) => void
  onCancel: () => void
}

export function AddEdgeModal({ source, target, suggestedLabel, onConfirm, onCancel }: AddEdgeModalProps) {
  const [label, setLabel] = useState(suggestedLabel ?? '')
  const [bidirectional, setBidirectional] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm border border-border bg-bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-[13px] font-semibold uppercase text-text-primary">Connect Nodes</h2>

        <p className="mb-4 flex items-center gap-2 text-[12px] text-text-primary">
          <span>{source.label}</span>
          <span className="text-text-tertiary">{bidirectional ? '↔' : '→'}</span>
          <span>{target.label}</span>
        </p>

        <label className="mb-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase text-text-secondary">Technique (optional)</span>
          <input
            autoFocus
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. scissor sweep"
            className="w-full border-0 border-b border-border bg-transparent py-1 text-[12px] text-text-primary outline-none focus:border-border-focus"
          />
        </label>

        <label className="mb-4 flex items-center gap-2">
          <input type="checkbox" checked={bidirectional} onChange={(e) => setBidirectional(e.target.checked)} />
          <span className="text-[11px] text-text-secondary">Bidirectional</span>
        </label>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="border border-border px-3 py-1.5 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(label, bidirectional)}
            className="border border-text-primary bg-text-primary px-3 py-1.5 text-[11px] font-medium uppercase text-black hover:bg-bg-elevated hover:text-text-primary"
          >
            Add Edge
          </button>
        </div>
      </div>
    </div>
  )
}
