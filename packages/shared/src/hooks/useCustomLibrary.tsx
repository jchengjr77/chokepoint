import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { setCustomLibraryEntries } from '../lib/library'
import { useAuth } from './useAuth'
import type { Advantage, LibraryEntry, NodeType, Ruleset } from '../types'

interface DbCustomLibraryRow {
  id: string
  label: string
  type: NodeType
  advantage: number | null
  rulesets: string[]
}

function rowToEntry(row: DbCustomLibraryRow): LibraryEntry {
  return {
    id: row.id,
    label: row.label,
    aliases: [],
    tags: [],
    rulesets: row.rulesets as Ruleset[],
    advantage: row.type === 'position' ? ((row.advantage ?? 0) as Advantage) : undefined,
  }
}

/**
 * Loads the current user's custom (non-curated) library entries and keeps
 * the module-level lookup in lib/library.ts mirrored to them, so
 * getLibraryEntry resolves custom ids the same as it resolves entries
 * from the bundled library.json everywhere else in the app.
 */
export function useCustomLibrary() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LibraryEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('user_library_entries').select('*').eq('user_id', user.id)
    const loaded = (data ?? []).map(rowToEntry)
    setEntries(loaded)
    setCustomLibraryEntries(loaded)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) void refresh()
    else {
      setEntries([])
      setCustomLibraryEntries([])
      setLoading(false)
    }
  }, [user, refresh])

  const createEntry = useCallback(
    async (params: { label: string; type: NodeType; advantage?: Advantage; rulesets: Ruleset[] }): Promise<LibraryEntry | null> => {
      if (!user) return null
      const id = `custom-${crypto.randomUUID()}`
      const { data, error } = await supabase
        .from('user_library_entries')
        .insert({
          id,
          user_id: user.id,
          label: params.label,
          type: params.type,
          advantage: params.type === 'position' ? (params.advantage ?? 0) : null,
          rulesets: params.rulesets,
        })
        .select()
        .single()

      if (error || !data) return null
      const entry = rowToEntry(data)
      const next = [...entries, entry]
      setEntries(next)
      setCustomLibraryEntries(next)
      return entry
    },
    [user, entries]
  )

  return { entries, loading, createEntry, refresh }
}
