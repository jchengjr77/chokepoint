import { useRef, useState } from 'react'
import { exportGraph, validateImport } from '../lib/importExport'
import { useGraphStore } from '../hooks/useGraphStore'
import type { GraphEdge, GraphNode } from '../types'

interface ImportExportModalProps {
  onClose: () => void
}

export function ImportExportModal({ onClose }: ImportExportModalProps) {
  const { nodes, edges, replaceGraph } = useGraphStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ nodes: GraphNode[]; edges: GraphEdge[]; errors: string[] } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    try {
      const text = await file.text()
      const raw = JSON.parse(text)
      const result = validateImport(raw)
      if (!result.valid) {
        setImportError(result.errors.join(' '))
        return
      }
      setPending({ nodes: result.nodes, edges: result.edges, errors: result.errors })
    } catch {
      setImportError('Could not parse that file as JSON.')
    }
  }

  const handleMerge = async () => {
    if (!pending) return
    await replaceGraph([...nodes, ...pending.nodes], [...edges, ...pending.edges])
    onClose()
  }

  const handleReplace = async () => {
    if (!pending) return
    await replaceGraph(pending.nodes, pending.edges)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm border border-border bg-bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase text-text-primary">Import / Export</h2>
          <button onClick={onClose} className="text-[16px] text-text-secondary hover:text-text-primary">
            &times;
          </button>
        </div>

        <button
          onClick={() => exportGraph(nodes, edges)}
          className="mb-4 w-full border border-border px-3 py-2 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
        >
          Export Graph as JSON
        </button>

        <div className="mb-2 h-px bg-border" />

        <label className="mb-2 block text-[10px] uppercase text-text-secondary">Import from JSON</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={(e) => void handleFileSelect(e)}
          className="mb-2 w-full text-[11px] text-text-secondary"
        />

        {importError && <p className="mb-2 text-[11px]" style={{ color: '#ff5555' }}>{importError}</p>}

        {pending && (
          <div className="mt-2 border border-border p-3">
            <p className="mb-3 text-[11px] text-text-secondary">
              Found {pending.nodes.length} node{pending.nodes.length === 1 ? '' : 's'} and {pending.edges.length}{' '}
              edge{pending.edges.length === 1 ? '' : 's'}.
              {pending.errors.length > 0 && ` ${pending.errors.length} entries skipped.`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => void handleMerge()}
                className="flex-1 border border-border px-2 py-1.5 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
              >
                Merge
              </button>
              <button
                onClick={() => void handleReplace()}
                className="flex-1 border px-2 py-1.5 text-[11px] font-medium uppercase hover:bg-bg-elevated"
                style={{ borderColor: '#ff5555', color: '#ff5555' }}
              >
                Replace All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
