export type NodeType = 'position' | 'submission'
export type Ruleset = 'gi' | 'nogi'
export type RulesetFilter = 'all' | 'gi' | 'nogi'

export interface LibraryEntry {
  id: string
  label: string
  aliases: string[]
  tags: string[]
  rulesets: Ruleset[]
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
}

export interface GraphEdge {
  id: string
  sourceId: string
  targetId: string
  label: string
  bidirectional: boolean
  notes: string
  dateAdded: string
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
}

export interface GraphExport {
  nodes: Omit<GraphNode, never>[]
  edges: Omit<GraphEdge, never>[]
  exportedAt: string
  version: 1
}
