import { supabase } from './supabase'
import type { NLParseResult } from '../types'

export async function parseNaturalLanguage(text: string, existingLibraryIds: string[]): Promise<NLParseResult> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  const { data, error } = await supabase.functions.invoke('parse-nl', {
    body: { text, existingLibraryIds },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  if (error) throw error
  return data as NLParseResult
}
