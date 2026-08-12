import { useMemo } from 'react'
import { useTrainingLog } from '../hooks/useTrainingLog'
import { computeTrainingSummary, WEEKDAY_NAMES, type RankedItem } from '../lib/trainingStats'
import type { GraphEdge, GraphNode } from '../types'

interface TrainingSummaryModalProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onClose: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-border bg-bg-elevated px-3 py-2">
      <span className="block text-[10px] uppercase text-text-secondary">{label}</span>
      <span className="text-[18px] font-semibold text-text-primary">{value}</span>
      {sub && <span className="block text-[10px] text-text-tertiary">{sub}</span>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-[11px] font-semibold uppercase text-text-secondary">{title}</h3>
      {children}
    </div>
  )
}

function RankedRow({ item }: { item: RankedItem }) {
  return (
    <div className="flex items-center justify-between border border-border px-2 py-1.5 text-[12px] text-text-primary">
      <span>{item.label}</span>
      <span className="text-[10px] uppercase text-node-submission">
        {item.proficiency} session{item.proficiency === 1 ? '' : 's'}
      </span>
    </div>
  )
}

const TIER_LABELS: Record<string, string> = {
  disadvantageous: 'Disadvantageous',
  neutral: 'Neutral',
  advantageous: 'Advantageous',
}

const CATEGORY_LABELS: Record<string, string> = {
  choke: 'Chokes',
  'joint-lock': 'Joint Locks',
  leglock: 'Leglocks',
}

export function TrainingSummaryModal({ nodes, edges, onClose }: TrainingSummaryModalProps) {
  const { entries, loading } = useTrainingLog(true)
  const summary = useMemo(() => computeTrainingSummary(nodes, edges, entries), [nodes, edges, entries])

  const nothingLogged = summary.totalSessions === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex h-[700px] max-h-[90vh] w-full max-w-2xl flex-col border border-border bg-bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-semibold uppercase text-text-primary">Training Stats</h2>
          <button onClick={onClose} className="text-[16px] text-text-secondary hover:text-text-primary">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && <p className="mb-3 text-[11px] text-text-tertiary">Loading...</p>}

          {!loading && nothingLogged && (
            <p className="text-[12px] text-text-tertiary">
              Nothing logged yet — add positions and transitions, or train something via the text bar, to see your
              stats here.
            </p>
          )}

          {!loading && !nothingLogged && (
            <>
              <Section title="Overview">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <StatCard label="Positions" value={String(summary.totalPositions)} />
                  <StatCard label="Submissions" value={String(summary.totalSubmissions)} />
                  <StatCard label="Techniques" value={String(summary.totalTechniques)} />
                  <StatCard label="Sessions" value={String(summary.totalSessions)} />
                </div>
              </Section>

              <Section title="Training Frequency">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <StatCard
                    label="Avg. Frequency"
                    value={summary.sessionsPerWeek !== null ? `${summary.sessionsPerWeek.toFixed(1)}/wk` : '—'}
                    sub={summary.sessionsPerWeek === null ? 'Needs 2+ training days' : undefined}
                  />
                  <StatCard label="Active Days" value={String(summary.activeDays)} />
                  <StatCard
                    label="Busiest Day"
                    value={summary.busiestWeekday ? WEEKDAY_NAMES[summary.busiestWeekday.weekday] : '—'}
                    sub={
                      summary.busiestWeekday
                        ? `${summary.busiestWeekday.sessionCount} session${summary.busiestWeekday.sessionCount === 1 ? '' : 's'}`
                        : undefined
                    }
                  />
                </div>
                {summary.firstTrainedAt && summary.lastTrainedAt && (
                  <p className="mt-2 text-[10px] uppercase text-text-tertiary">
                    {formatDate(summary.firstTrainedAt)} &mdash; {formatDate(summary.lastTrainedAt)}
                  </p>
                )}
              </Section>

              {(summary.mostTrainedPosition || summary.mostTrainedSubmission || summary.mostTrainedTechnique) && (
                <Section title="Most Trained">
                  <div className="flex flex-col gap-1">
                    {summary.mostTrainedPosition && <RankedRow item={summary.mostTrainedPosition} />}
                    {summary.mostTrainedSubmission && <RankedRow item={summary.mostTrainedSubmission} />}
                    {summary.mostTrainedTechnique && <RankedRow item={summary.mostTrainedTechnique} />}
                  </div>
                </Section>
              )}

              {summary.leastTrainedPositions.length > 0 && (
                <Section title="Could Use More Reps">
                  <div className="flex flex-col gap-1">
                    {summary.leastTrainedPositions.map((item) => (
                      <RankedRow key={item.id} item={item} />
                    ))}
                  </div>
                </Section>
              )}

              {summary.advantageTierBreakdown.length > 0 && (
                <Section title="Strength by Position Type">
                  <div className="flex flex-col gap-1">
                    {summary.advantageTierBreakdown.map((stat) => (
                      <div
                        key={stat.tier}
                        className="flex items-center justify-between border border-border px-2 py-1.5 text-[12px] text-text-primary"
                      >
                        <span>{TIER_LABELS[stat.tier]}</span>
                        <span className="flex items-center gap-2 text-[10px] uppercase text-text-tertiary">
                          <span>
                            {stat.nodeCount} position{stat.nodeCount === 1 ? '' : 's'}
                          </span>
                          <span className="text-node-submission">
                            avg {stat.averageProficiency.toFixed(1)} session{stat.averageProficiency === 1 ? '' : 's'}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {summary.submissionCategoryBreakdown.length > 0 && (
                <Section title="Submission Focus">
                  <div className="flex flex-col gap-1">
                    {summary.submissionCategoryBreakdown.map((stat) => (
                      <div
                        key={stat.tag}
                        className="flex items-center justify-between border border-border px-2 py-1.5 text-[12px] text-text-primary"
                      >
                        <span>{CATEGORY_LABELS[stat.tag] ?? stat.tag}</span>
                        <span className="flex items-center gap-2 text-[10px] uppercase text-text-tertiary">
                          <span>
                            {stat.nodeCount} submission{stat.nodeCount === 1 ? '' : 's'}
                          </span>
                          <span className="text-node-submission">
                            avg {stat.averageProficiency.toFixed(1)} session{stat.averageProficiency === 1 ? '' : 's'}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            className="border border-border px-3 py-1.5 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
