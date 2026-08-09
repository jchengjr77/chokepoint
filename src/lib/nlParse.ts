import { supabase } from './supabase'
import type { LibraryEntry, NLParseResult } from '../types'

export async function parseNaturalLanguage(
  text: string,
  existingLibraryIds: string[],
  customEntries: LibraryEntry[] = []
): Promise<NLParseResult> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  const { data, error } = await supabase.functions.invoke('parse-nl', {
    body: {
      text,
      existingLibraryIds,
      customEntries: customEntries.map((e) => ({ id: e.id, label: e.label, type: e.advantage !== undefined ? 'position' : 'submission' })),
    },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  if (error) throw error
  return data as NLParseResult
}
