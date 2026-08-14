import { computeSessionShareStats } from './trainingStats'
import { defaultEdgeLabel } from './edgeLabel'
import { toTitleCase } from './titleCase'
import type { TrainingLogEntry } from '../hooks/useTrainingLog'
import type { NLParseResult } from '../types'

export interface SessionShareData {
  trainedAt: string
  /** Nodes touched this session that aren't part of any transition below (trained standalone). */
  standaloneChain: Array<{ label: string; type: 'position' | 'submission' }>
  transitions: Array<{ fromLabel: string; toLabel: string; label: string }>
  streakDays: number
  recentSessionsPerWeek: number
}

/**
 * Builds the share card's data straight from the just-confirmed NL result
 * — the same shape NLPreviewModal already resolves labels from — plus
 * rolling stats as of this session. Nothing here is refetched from the
 * server; it's a pure projection of what was just applied to the graph.
 */
export function buildSessionShareData(accepted: NLParseResult, entries: TrainingLogEntry[]): SessionShareData {
  const trainedAt = accepted.trainedAt ?? new Date().toISOString()
  const labelByLibraryId = new Map(accepted.nodes.map((n) => [n.libraryId, n.label]))

  const nodeIdsInTransitions = new Set<string>()
  for (const e of accepted.edges) {
    nodeIdsInTransitions.add(e.sourceLibraryId)
    nodeIdsInTransitions.add(e.targetLibraryId)
  }

  const standaloneChain = accepted.nodes
    .filter((n) => !nodeIdsInTransitions.has(n.libraryId))
    .map((n) => ({ label: n.label, type: n.type as 'position' | 'submission' }))

  // Mirrors the label resolution in App.tsx's handleApplyNlResult: a
  // named technique gets title-cased, an unnamed transition falls back to
  // "X to Y" — the share card should never show a blank label the app
  // itself wouldn't have stored.
  const transitions = accepted.edges.map((e) => {
    const fromLabel = labelByLibraryId.get(e.sourceLibraryId) ?? e.sourceLibraryId
    const toLabel = labelByLibraryId.get(e.targetLibraryId) ?? e.targetLibraryId
    const label = e.label.trim() ? toTitleCase(e.label) : defaultEdgeLabel(fromLabel, toLabel)
    return { fromLabel, toLabel, label }
  })

  const { streakDays, recentSessionsPerWeek } = computeSessionShareStats(entries, trainedAt)

  return { trainedAt, standaloneChain, transitions, streakDays, recentSessionsPerWeek }
}
