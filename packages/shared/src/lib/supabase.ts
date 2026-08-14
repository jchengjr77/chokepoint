import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * Each platform calls this once at startup with its own env values and
 * (for React Native) a storage adapter for session persistence, since
 * supabase-js defaults to `localStorage`, which doesn't exist under
 * Hermes. Everything else in this package imports the `supabase` export
 * below, which is why this has to run before any of those hooks mount.
 */
export function initSupabase(
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: SupabaseClientOptions<'public'>
): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL/anon key are missing — Supabase calls will fail until they are configured.')
  }
  client = createClient(supabaseUrl, supabaseAnonKey, options)
  return client
}

/**
 * A Proxy so `supabase` can be imported at module-load time (before
 * initSupabase has necessarily run) without capturing a stale/null
 * reference — every property access is forwarded to whichever client is
 * live at call time.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!client) {
      throw new Error('initSupabase() must be called before using the Supabase client — see App entry point.')
    }
    return Reflect.get(client, prop, receiver)
  },
})
