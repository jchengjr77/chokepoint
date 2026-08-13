import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export const WEEKLY_PARSE_LIMIT = 40
// Keep in sync with the same allowlist in supabase/functions/parse-nl —
// exempt accounts have no real cap, so there's nothing meaningful to show.
const UNLIMITED_EMAILS = new Set(['jonathanchengjr77@gmail.com'])

function currentWeekStart(): string {
  // Monday-anchored calendar week, matching parse-nl's currentWeekStart().
  const now = new Date()
  const day = now.getUTCDay()
  const diffToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday))
  return monday.toISOString().slice(0, 10)
}

/**
 * Tracks how many of this week's free NL parses the current user has
 * used, for a subtle "X of 40 left this week" display above the input
 * bar. Purely informational — the actual cap is enforced server-side in
 * the parse-nl edge function regardless of what this shows.
 */
export function useNlpUsage(refreshToken: number) {
  const { user } = useAuth()
  const [used, setUsed] = useState<number | null>(null)
  const unlimited = Boolean(user?.email && UNLIMITED_EMAILS.has(user.email))

  const refresh = useCallback(async () => {
    if (!user || unlimited) return
    const { data } = await supabase
      .from('nlp_usage')
      .select('parse_count')
      .eq('user_id', user.id)
      .eq('week_start', currentWeekStart())
      .maybeSingle()
    setUsed(data?.parse_count ?? 0)
  }, [user, unlimited])

  useEffect(() => {
    void refresh()
  }, [refresh, refreshToken])

  return { used, limit: WEEKLY_PARSE_LIMIT, unlimited }
}
