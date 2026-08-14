import { FunctionsHttpError } from '@supabase/supabase-js'
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

  if (error) {
    // The edge function returns a friendly message in a JSON body (e.g.
    // the weekly usage cap), but supabase-js doesn't surface that body on
    // error.message by default — it has to be read from error.context.
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null)
      if (typeof body?.error === 'string') throw new Error(body.error)
    }
    throw error
  }
  return data as NLParseResult
}
