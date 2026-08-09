import { useMemo, useState } from 'react'
import { useTrainingLog } from '../hooks/useTrainingLog'
import type { GraphEdge, GraphNode } from '../types'

interface CalendarModalProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onClose: () => void
  onSelectNode: (id: string) => void
  onSelectEdge: (id: string) => void
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/**
 * A short natural-language summary of a logged edge, e.g. "Knee Lever
 * from Bottom Half Guard" for a submission entry, or "Scissor Sweep:
 * Closed Guard to Mount" for a position-to-position transition. Falls
 * back to a plain "Source to Target" when the technique has no label.
 */
function summarizeEdge(edge: GraphEdge, sourceLabel: string, targetLabel: string, targetIsSubmission: boolean): string {
  if (targetIsSubmission) {
    return edge.label ? `${edge.label} from ${sourceLabel}` : `${targetLabel} from ${sourceLabel}`
  }
  const arrow = edge.bidirectional ? '↔' : '→'
  return edge.label ? `${edge.label}: ${sourceLabel} ${arrow} ${targetLabel}` : `${sourceLabel} ${arrow} ${targetLabel}`
}

export function CalendarModal({ nodes, edges, onClose, onSelectNode, onSelectEdge }: CalendarModalProps) {
  const { entries, loading } = useTrainingLog(true)
  const today = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const edgeById = useMemo(() => new Map(edges.map((e) => [e.id, e])), [edges])

  const entriesByDay = useMemo(() => {
    const map = new Map<string, typeof entries>()
    for (const entry of entries) {
      const key = dayKey(new Date(entry.trainedAt))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }
    return map
  }, [entries])

  const firstOfMonth = new Date(viewYear, viewMonth, 1)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startWeekday = firstOfMonth.getDay()

  const cells: Array<{ day: number; key: string } | null> = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, key: dayKey(new Date(viewYear, viewMonth, d)) })
  }

  const goPrevMonth = () => {
    setSelectedDay(null)
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const goNextMonth = () => {
    setSelectedDay(null)
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const todayKey = dayKey(today)
  const selectedEntries = selectedDay ? entriesByDay.get(selectedDay) ?? [] : []

  const selectedSummaries = useMemo(
    () =>
      selectedEntries.map((entry) => {
        if (entry.nodeId) {
          const node = nodeById.get(entry.nodeId)
          return node ? node.label : 'Deleted node'
        }
        const edge = entry.edgeId ? edgeById.get(entry.edgeId) : undefined
        if (!edge) return 'Deleted technique'
        const sourceNode = nodeById.get(edge.sourceId)
        const targetNode = nodeById.get(edge.targetId)
        return summarizeEdge(
          edge,
          sourceNode?.label ?? '?',
          targetNode?.label ?? '?',
          targetNode?.type === 'submission'
        )
      }),
    [selectedEntries, nodeById, edgeById]
  )

  const daySummary = useMemo(() => {
    // De-dupe in case the same item was trained more than once that day.
    const unique = [...new Set(selectedSummaries)]
    if (unique.length === 0) return ''
    if (unique.length === 1) return unique[0]
    if (unique.length === 2) return `${unique[0]} and ${unique[1]}`
    return `${unique.slice(0, -1).join(', ')}, and ${unique[unique.length - 1]}`
  }, [selectedSummaries])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col border border-border bg-bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-semibold uppercase text-text-primary">Training Journal</h2>
          <button onClick={onClose} className="text-[16px] text-text-secondary hover:text-text-primary">
            &times;
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button
            onClick={goPrevMonth}
            className="border border-border px-2 py-1 text-[11px] uppercase text-text-primary hover:bg-bg-elevated"
          >
            &larr;
          </button>
          <span className="text-[12px] font-medium uppercase text-text-primary">
            {monthLabel(viewYear, viewMonth)}
          </span>
          <button
            onClick={goNextMonth}
            className="border border-border px-2 py-1 text-[11px] uppercase text-text-primary hover:bg-bg-elevated"
          >
            &rarr;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading && <p className="mb-2 text-[11px] text-text-tertiary">Loading...</p>}

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="text-[10px] uppercase text-text-tertiary">
                {label}
              </span>
            ))}
            {cells.map((cell, i) => {
              if (!cell) return <span key={i} />
              const hasActivity = entriesByDay.has(cell.key)
              const isToday = cell.key === todayKey
              const isSelected = cell.key === selectedDay
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : cell.key)}
                  className={`flex aspect-square items-center justify-center border text-[11px] hover:opacity-80 ${
                    hasActivity
                      ? 'border-node-submission bg-node-submission text-black'
                      : isSelected
                        ? 'border-node-submission text-node-submission hover:bg-bg-elevated'
                        : isToday
                          ? 'border-border-focus text-text-primary hover:bg-bg-elevated'
                          : 'border-border text-text-secondary hover:bg-bg-elevated'
                  } ${isSelected && hasActivity ? 'ring-1 ring-inset ring-text-primary' : ''}`}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {selectedDay && (
            <div className="mt-4 border-t border-border pt-3">
              <span className="mb-1 block text-[10px] uppercase text-text-secondary">Trained on {selectedDay}</span>

              {daySummary && (
                <p className="mb-3 border border-border bg-bg-elevated px-2 py-2 text-[12px] leading-snug text-text-primary">
                  {daySummary}
                </p>
              )}

              <span className="mb-2 block text-[10px] uppercase text-text-secondary">
                Log ({selectedEntries.length})
              </span>
              <div className="flex flex-col gap-1">
                {selectedEntries.length === 0 && (
                  <p className="text-[11px] text-text-tertiary">Nothing logged this day.</p>
                )}
                {selectedEntries.map((entry, i) => {
                  const summary = selectedSummaries[i]
                  const time = new Date(entry.trainedAt).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })

                  if (entry.nodeId) {
                    const node = nodeById.get(entry.nodeId)
                    return (
                      <button
                        key={entry.id}
                        onClick={() => node && onSelectNode(node.id)}
                        disabled={!node}
                        className="flex items-center justify-between border border-border px-2 py-1.5 text-left text-[11px] text-text-primary hover:bg-bg-elevated disabled:opacity-50"
                      >
                        <span>{summary}</span>
                        <span className="text-[10px] uppercase text-text-tertiary">{time}</span>
                      </button>
                    )
                  }
                  const edge = entry.edgeId ? edgeById.get(entry.edgeId) : undefined
                  return (
                    <button
                      key={entry.id}
                      onClick={() => edge && onSelectEdge(edge.id)}
                      disabled={!edge}
                      className="flex items-center justify-between border border-border px-2 py-1.5 text-left text-[11px] text-text-primary hover:bg-bg-elevated disabled:opacity-50"
                    >
                      <span>{summary}</span>
                      <span className="text-[10px] uppercase text-text-tertiary">{time}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
