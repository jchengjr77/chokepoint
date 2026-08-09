import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { DEFAULT_MODE, DEFAULT_THEME, type ThemeId, type ThemeMode } from '../lib/themes'
import type { GraphEdge, GraphNode, NodeType, RulesetFilter } from '../types'

interface DbNodeRow {
  id: string
  library_id: string
  type: NodeType
  label: string
  notes: string
  x: number
  y: number
  date_added: string
  proficiency: number
}

interface DbEdgeRow {
  id: string
  source_id: string
  target_id: string
  label: string
  bidirectional: boolean
  notes: string
  date_added: string
  proficiency: number
}

function rowToNode(row: DbNodeRow): GraphNode {
  return {
    id: row.id,
    libraryId: row.library_id,
    type: row.type,
    label: row.label,
    notes: row.notes ?? '',
    x: row.x,
    y: row.y,
    dateAdded: row.date_added,
    proficiency: row.proficiency ?? 0,
  }
}

function rowToEdge(row: DbEdgeRow): GraphEdge {
  return {
    id: row.id,
    sourceId: row.source_id,
    targetId: row.target_id,
    label: row.label ?? '',
    bidirectional: row.bidirectional,
    notes: row.notes ?? '',
    dateAdded: row.date_added,
    proficiency: row.proficiency ?? 0,
  }
}

interface GraphStoreValue {
  nodes: GraphNode[]
  edges: GraphEdge[]
  loading: boolean
  online: boolean
  rulesetFilter: RulesetFilter
  setRulesetFilter: (filter: RulesetFilter) => Promise<void>
  theme: ThemeId
  themeMode: ThemeMode
  setTheme: (theme: ThemeId) => Promise<void>
  setThemeMode: (mode: ThemeMode) => Promise<void>
  addNode: (params: { libraryId: string; type: NodeType; label: string; x: number; y: number }) => Promise<GraphNode | null>
  updateNodePosition: (id: string, x: number, y: number) => Promise<void>
  updateNodeNotes: (id: string, notes: string) => Promise<void>
  incrementNodeProficiency: (id: string) => Promise<void>
  deleteNode: (id: string) => Promise<void>
  addEdge: (params: {
    sourceId: string
    targetId: string
    label: string
    bidirectional: boolean
  }) => Promise<GraphEdge | null>
  updateEdge: (id: string, updates: Partial<Pick<GraphEdge, 'label' | 'bidirectional' | 'notes'>>) => Promise<void>
  incrementEdgeProficiency: (id: string) => Promise<void>
  deleteEdge: (id: string) => Promise<void>
  replaceGraph: (nodes: GraphNode[], edges: GraphEdge[]) => Promise<void>
  refresh: () => Promise<void>
}

const GraphStoreContext = createContext<GraphStoreValue | null>(null)

export function GraphStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [rulesetFilter, setRulesetFilterState] = useState<RulesetFilter>('all')
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME)
  const [themeMode, setThemeModeState] = useState<ThemeMode>(DEFAULT_MODE)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [nodesRes, edgesRes, prefsRes] = await Promise.all([
      supabase.from('user_nodes').select('*').eq('user_id', user.id),
      supabase.from('user_edges').select('*').eq('user_id', user.id),
      supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle(),
    ])

    if (nodesRes.data) setNodes(nodesRes.data.map(rowToNode))
    if (edgesRes.data) setEdges(edgesRes.data.map(rowToEdge))
    if (prefsRes.data) {
      setRulesetFilterState(prefsRes.data.ruleset_filter as RulesetFilter)
      setThemeState((prefsRes.data.theme as ThemeId) ?? DEFAULT_THEME)
      setThemeModeState((prefsRes.data.theme_mode as ThemeMode) ?? DEFAULT_MODE)
    } else if (!prefsRes.error) {
      await supabase
        .from('user_preferences')
        .insert({ user_id: user.id, ruleset_filter: 'all', theme: DEFAULT_THEME, theme_mode: DEFAULT_MODE })
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) void refresh()
    else {
      setNodes([])
      setEdges([])
      setLoading(false)
    }
  }, [user, refresh])

  const setRulesetFilter = useCallback(
    async (filter: RulesetFilter) => {
      if (!user) return
      setRulesetFilterState(filter)
      await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, ruleset_filter: filter, updated_at: new Date().toISOString() })
    },
    [user]
  )

  const setTheme = useCallback(
    async (newTheme: ThemeId) => {
      if (!user) return
      setThemeState(newTheme)
      await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, theme: newTheme, updated_at: new Date().toISOString() })
    },
    [user]
  )

  const setThemeMode = useCallback(
    async (mode: ThemeMode) => {
      if (!user) return
      setThemeModeState(mode)
      await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, theme_mode: mode, updated_at: new Date().toISOString() })
    },
    [user]
  )

  const addNode = useCallback(
    async (params: { libraryId: string; type: NodeType; label: string; x: number; y: number }) => {
      if (!user) return null
      const { data, error } = await supabase
        .from('user_nodes')
        .insert({
          user_id: user.id,
          library_id: params.libraryId,
          type: params.type,
          label: params.label,
          x: params.x,
          y: params.y,
        })
        .select()
        .single()

      if (error || !data) return null
      const node = rowToNode(data)
      setNodes((prev) => [...prev, node])
      return node
    },
    [user]
  )

  const updateNodePosition = useCallback(async (id: string, x: number, y: number) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)))
    await supabase.from('user_nodes').update({ x, y }).eq('id', id)
  }, [])

  const updateNodeNotes = useCallback(async (id: string, notes: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, notes } : n)))
    await supabase.from('user_nodes').update({ notes }).eq('id', id)
  }, [])

  const incrementNodeProficiency = useCallback(
    async (id: string) => {
      const node = nodes.find((n) => n.id === id)
      if (!node) return
      const proficiency = node.proficiency + 1
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, proficiency } : n)))
      await supabase.from('user_nodes').update({ proficiency }).eq('id', id)
    },
    [nodes]
  )

  const deleteNode = useCallback(async (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setEdges((prev) => prev.filter((e) => e.sourceId !== id && e.targetId !== id))
    await supabase.from('user_nodes').delete().eq('id', id)
  }, [])

  const addEdge = useCallback(
    async (params: { sourceId: string; targetId: string; label: string; bidirectional: boolean }) => {
      if (!user) return null
      const { data, error } = await supabase
        .from('user_edges')
        .insert({
          user_id: user.id,
          source_id: params.sourceId,
          target_id: params.targetId,
          label: params.label,
          bidirectional: params.bidirectional,
        })
        .select()
        .single()

      if (error || !data) return null
      const edge = rowToEdge(data)
      setEdges((prev) => [...prev, edge])
      return edge
    },
    [user]
  )

  const updateEdge = useCallback(
    async (id: string, updates: Partial<Pick<GraphEdge, 'label' | 'bidirectional' | 'notes'>>) => {
      setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)))
      await supabase.from('user_edges').update(updates).eq('id', id)
    },
    []
  )

  const incrementEdgeProficiency = useCallback(
    async (id: string) => {
      const edge = edges.find((e) => e.id === id)
      if (!edge) return
      const proficiency = edge.proficiency + 1
      setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, proficiency } : e)))
      await supabase.from('user_edges').update({ proficiency }).eq('id', id)
    },
    [edges]
  )

  const deleteEdge = useCallback(async (id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id))
    await supabase.from('user_edges').delete().eq('id', id)
  }, [])

  const replaceGraph = useCallback(
    async (newNodes: GraphNode[], newEdges: GraphEdge[]) => {
      if (!user) return
      await supabase.from('user_edges').delete().eq('user_id', user.id)
      await supabase.from('user_nodes').delete().eq('user_id', user.id)

      if (newNodes.length > 0) {
        const { data: insertedNodes } = await supabase
          .from('user_nodes')
          .insert(
            newNodes.map((n) => ({
              user_id: user.id,
              library_id: n.libraryId,
              type: n.type,
              label: n.label,
              notes: n.notes,
              x: n.x,
              y: n.y,
              proficiency: n.proficiency,
            }))
          )
          .select()

        if (insertedNodes) {
          const idMap = new Map(newNodes.map((n, i) => [n.id, insertedNodes[i].id as string]))
          const mappedEdges = newEdges
            .filter((e) => idMap.has(e.sourceId) && idMap.has(e.targetId))
            .map((e) => ({
              user_id: user.id,
              source_id: idMap.get(e.sourceId)!,
              target_id: idMap.get(e.targetId)!,
              label: e.label,
              bidirectional: e.bidirectional,
              notes: e.notes,
              proficiency: e.proficiency,
            }))

          if (mappedEdges.length > 0) {
            await supabase.from('user_edges').insert(mappedEdges)
          }
        }
      }

      await refresh()
    },
    [user, refresh]
  )

  return (
    <GraphStoreContext.Provider
      value={{
        nodes,
        edges,
        loading,
        online,
        rulesetFilter,
        setRulesetFilter,
        theme,
        themeMode,
        setTheme,
        setThemeMode,
        addNode,
        updateNodePosition,
        updateNodeNotes,
        incrementNodeProficiency,
        deleteNode,
        addEdge,
        updateEdge,
        incrementEdgeProficiency,
        deleteEdge,
        replaceGraph,
        refresh,
      }}
    >
      {children}
    </GraphStoreContext.Provider>
  )
}

export function useGraphStore() {
  const ctx = useContext(GraphStoreContext)
  if (!ctx) throw new Error('useGraphStore must be used within GraphStoreProvider')
  return ctx
}
