import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export interface AuthProviderProps {
  children: ReactNode
  /**
   * Where Supabase should send the user back to after Google OAuth
   * completes. Defaults to the current page (web only — `window` doesn't
   * exist under React Native). Mobile must pass its own custom URL scheme
   * here (e.g. `chokepoint://`).
   */
  getOAuthRedirectUrl?: () => string
  /**
   * On web, `signInWithOAuth` triggers a full-page browser redirect on
   * its own — there's no page to navigate away from on mobile. If
   * provided, this is called with the provider's auth URL instead; it
   * should open that URL (e.g. via expo-web-browser's
   * openAuthSessionAsync) and resolve with the redirect callback URL Once
   * the user completes sign-in, or null if they cancelled.
   */
  openOAuthUrl?: (url: string) => Promise<{ url: string } | null>
}

function defaultOAuthRedirectUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin
  throw new Error('getOAuthRedirectUrl must be provided on platforms without window (e.g. React Native)')
}

export function AuthProvider({
  children,
  getOAuthRedirectUrl = defaultOAuthRedirectUrl,
  openOAuthUrl,
}: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUpWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  const signInWithGoogle = async () => {
    if (!openOAuthUrl) {
      // Web: signInWithOAuth triggers the browser redirect itself.
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getOAuthRedirectUrl() },
      })
      return
    }

    // Mobile: get the auth URL without letting supabase-js try (and fail)
    // to navigate a browser, open it ourselves, and wait for the redirect
    // back into the app's custom URL scheme.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getOAuthRedirectUrl(), skipBrowserRedirect: true },
    })
    if (error || !data.url) return

    const result = await openOAuthUrl(data.url)
    if (!result) return // user cancelled

    const url = new URL(result.url)
    // Supabase returns tokens in the URL fragment (#access_token=...), not
    // the query string — hash params still parse fine via URLSearchParams
    // once the leading '#' is stripped.
    const params = new URLSearchParams(url.hash.replace(/^#/, ''))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signInWithPassword,
        signUpWithPassword,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
