import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface TrainingLogEntry {
  id: string
  nodeId: string | null
  edgeId: string | null
  trainedAt: string
}

interface DbTrainingLogRow {
  id: string
  node_id: string | null
  edge_id: string | null
  trained_at: string
}

function rowToEntry(row: DbTrainingLogRow): TrainingLogEntry {
  return { id: row.id, nodeId: row.node_id, edgeId: row.edge_id, trainedAt: row.trained_at }
}

/**
 * Loads the full training log for the current user on demand (not part of
 * the main graph store, since it isn't needed for rendering the graph
 * itself and can grow large over time).
 */
export function useTrainingLog(enabled: boolean) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<TrainingLogEntry[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('training_log')
      .select('*')
      .eq('user_id', user.id)
      .order('trained_at', { ascending: false })
    if (data) setEntries(data.map(rowToEntry))
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (enabled) void refresh()
  }, [enabled, refresh])

  return { entries, loading, refresh }
}
