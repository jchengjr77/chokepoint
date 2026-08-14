export type NodeType = 'position' | 'submission'
export type Ruleset = 'gi' | 'nogi'
export type RulesetFilter = 'all' | 'gi' | 'nogi'

/**
 * Positional advantage on a -5..5 scale, used to order the graph left
 * (disadvantageous, e.g. bottom of a dominant control position) to right
 * (advantageous, e.g. top of a dominant control position or a finishing
 * entanglement). 0 is neutral (standing, contested guards/entanglements)
 * and sits at the horizontal center. Magnitudes are kept symmetric between
 * a position's top/bottom variants where both exist.
 */
export type Advantage = -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5

export interface LibraryEntry {
  id: string
  label: string
  aliases: string[]
  tags: string[]
  rulesets: Ruleset[]
  advantage?: Advantage
}

export interface LibraryTransition {
  sourceId: string
  targetId: string
  label: string
}

export interface Library {
  positions: LibraryEntry[]
  submissions: LibraryEntry[]
  knownTransitions: LibraryTransition[]
}

export interface GraphNode {
  id: string
  libraryId: string
  type: NodeType
  label: string
  notes: string
  x: number
  y: number
  dateAdded: string
  proficiency: number
}

export interface GraphEdge {
  id: string
  sourceId: string
  targetId: string
  label: string
  bidirectional: boolean
  notes: string
  dateAdded: string
  proficiency: number
}

export interface UserPreferences {
  rulesetFilter: RulesetFilter
}

export interface NLParseResultNode {
  libraryId: string
  label: string
  type: NodeType
  alreadyOnGraph: boolean
}

export interface NLParseResultEdge {
  sourceLibraryId: string
  targetLibraryId: string
  label: string
  bidirectional: boolean
}

export interface NLParseResult {
  nodes: NLParseResultNode[]
  edges: NLParseResultEdge[]
  unrecognized: string[]
  /** Backfilled training date as YYYY-MM-DD, or null to mean "now". */
  trainedAt: string | null
}

export interface GraphExport {
  nodes: Omit<GraphNode, never>[]
  edges: Omit<GraphEdge, never>[]
  exportedAt: string
  version: 1
}
