import { getLibraryEntry } from './library'
import type { GraphEdge, GraphNode } from '../types'
import type { TrainingLogEntry } from '../hooks/useTrainingLog'

export interface TrainingSummary {
  totalPositions: number
  totalSubmissions: number
  totalTechniques: number
  totalSessions: number
  /** Sessions per week, averaged over the span from first to last logged session. Null if fewer than 2 distinct training days. */
  sessionsPerWeek: number | null
  /** Distinct calendar days with at least one logged session. */
  activeDays: number
  firstTrainedAt: string | null
  lastTrainedAt: string | null
  mostTrainedPosition: RankedItem | null
  mostTrainedSubmission: RankedItem | null
  mostTrainedTechnique: RankedItem | null
  leastTrainedPositions: RankedItem[]
  advantageTierBreakdown: AdvantageTierStat[]
  submissionCategoryBreakdown: CategoryStat[]
  busiestWeekday: WeekdayStat | null
}

export interface RankedItem {
  id: string
  label: string
  proficiency: number
}

export interface AdvantageTierStat {
  tier: 'disadvantageous' | 'neutral' | 'advantageous'
  nodeCount: number
  averageProficiency: number
}

export interface CategoryStat {
  tag: string
  nodeCount: number
  averageProficiency: number
}

export interface WeekdayStat {
  weekday: number // 0 = Sunday
  sessionCount: number
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export { WEEKDAY_NAMES }

function toRankedItem(node: GraphNode): RankedItem {
  return { id: node.id, label: node.label, proficiency: node.proficiency }
}

function advantageTier(advantage: number | undefined): AdvantageTierStat['tier'] {
  const a = advantage ?? 0
  if (a < 0) return 'disadvantageous'
  if (a > 0) return 'advantageous'
  return 'neutral'
}

/**
 * Computes the full training summary from the current graph plus its
 * training log. Everything here is a pure function of data already in
 * memory (nodes/edges from useGraphStore, entries from useTrainingLog)
 * — no extra queries, so this is cheap enough to recompute on every
 * render via useMemo in the modal.
 */
export function computeTrainingSummary(
  nodes: GraphNode[],
  edges: GraphEdge[],
  entries: TrainingLogEntry[]
): TrainingSummary {
  const positions = nodes.filter((n) => n.type === 'position')
  const submissions = nodes.filter((n) => n.type === 'submission')

  const sortedByProficiencyDesc = <T extends { proficiency: number }>(items: T[]) =>
    [...items].sort((a, b) => b.proficiency - a.proficiency)

  const trainedPositions = positions.filter((n) => n.proficiency > 0)
  const mostTrainedPosition = sortedByProficiencyDesc(trainedPositions)[0]
    ? toRankedItem(sortedByProficiencyDesc(trainedPositions)[0])
    : null

  const trainedSubmissions = submissions.filter((n) => n.proficiency > 0)
  const mostTrainedSubmission = sortedByProficiencyDesc(trainedSubmissions)[0]
    ? toRankedItem(sortedByProficiencyDesc(trainedSubmissions)[0])
    : null

  const trainedEdges = edges.filter((e) => e.proficiency > 0)
  const topEdge = sortedByProficiencyDesc(trainedEdges)[0]
  const mostTrainedTechnique = topEdge
    ? { id: topEdge.id, label: topEdge.label || 'Untitled technique', proficiency: topEdge.proficiency }
    : null

  // Positions the user has actually added to their graph but trained the
  // least (proficiency could be 0, meaning "added but never logged again")
  // — surfaces gaps rather than just celebrating strengths.
  const leastTrainedPositions = [...positions]
    .sort((a, b) => a.proficiency - b.proficiency)
    .slice(0, 3)
    .map(toRankedItem)

  const tierGroups = new Map<AdvantageTierStat['tier'], { count: number; totalProficiency: number }>()
  for (const node of positions) {
    const entry = getLibraryEntry(node.libraryId)
    const tier = advantageTier(entry?.advantage)
    const group = tierGroups.get(tier) ?? { count: 0, totalProficiency: 0 }
    group.count += 1
    group.totalProficiency += node.proficiency
    tierGroups.set(tier, group)
  }
  const advantageTierBreakdown: AdvantageTierStat[] = (['disadvantageous', 'neutral', 'advantageous'] as const)
    .map((tier) => {
      const group = tierGroups.get(tier)
      return {
        tier,
        nodeCount: group?.count ?? 0,
        averageProficiency: group && group.count > 0 ? group.totalProficiency / group.count : 0,
      }
    })
    .filter((stat) => stat.nodeCount > 0)

  const categoryGroups = new Map<string, { count: number; totalProficiency: number }>()
  const CATEGORY_TAGS = ['choke', 'joint-lock', 'leglock']
  for (const node of submissions) {
    const entry = getLibraryEntry(node.libraryId)
    const tag = entry?.tags.find((t) => CATEGORY_TAGS.includes(t))
    if (!tag) continue
    const group = categoryGroups.get(tag) ?? { count: 0, totalProficiency: 0 }
    group.count += 1
    group.totalProficiency += node.proficiency
    categoryGroups.set(tag, group)
  }
  const submissionCategoryBreakdown: CategoryStat[] = [...categoryGroups.entries()]
    .map(([tag, group]) => ({
      tag,
      nodeCount: group.count,
      averageProficiency: group.count > 0 ? group.totalProficiency / group.count : 0,
    }))
    .sort((a, b) => b.averageProficiency - a.averageProficiency)

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.trainedAt).getTime() - new Date(b.trainedAt).getTime()
  )
  const firstTrainedAt = sortedEntries[0]?.trainedAt ?? null
  const lastTrainedAt = sortedEntries[sortedEntries.length - 1]?.trainedAt ?? null

  const activeDayKeys = new Set(
    entries.map((e) => {
      const d = new Date(e.trainedAt)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )
  const activeDays = activeDayKeys.size

  let sessionsPerWeek: number | null = null
  if (firstTrainedAt && lastTrainedAt && activeDays >= 2) {
    const spanMs = new Date(lastTrainedAt).getTime() - new Date(firstTrainedAt).getTime()
    const spanWeeks = spanMs / (1000 * 60 * 60 * 24 * 7)
    // Guard against a same-day/near-zero span collapsing this to a huge
    // or infinite number — treat anything under a week as exactly one
    // week for averaging purposes.
    sessionsPerWeek = entries.length / Math.max(spanWeeks, 1)
  }

  const weekdayCounts = new Map<number, number>()
  for (const entry of entries) {
    const weekday = new Date(entry.trainedAt).getDay()
    weekdayCounts.set(weekday, (weekdayCounts.get(weekday) ?? 0) + 1)
  }
  let busiestWeekday: WeekdayStat | null = null
  for (const [weekday, sessionCount] of weekdayCounts.entries()) {
    if (!busiestWeekday || sessionCount > busiestWeekday.sessionCount) {
      busiestWeekday = { weekday, sessionCount }
    }
  }

  return {
    totalPositions: positions.length,
    totalSubmissions: submissions.length,
    totalTechniques: edges.length,
    totalSessions: entries.length,
    sessionsPerWeek,
    activeDays,
    firstTrainedAt,
    lastTrainedAt,
    mostTrainedPosition,
    mostTrainedSubmission,
    mostTrainedTechnique,
    leastTrainedPositions,
    advantageTierBreakdown,
    submissionCategoryBreakdown,
    busiestWeekday,
  }
}
