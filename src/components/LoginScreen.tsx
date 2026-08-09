import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AboutModal } from './AboutModal'

export function LoginScreen() {
  const { signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showAbout, setShowAbout] = useState(false)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    const { error } = await signInWithPassword(email, password)
    setBusy(false)
    if (error) setError(error)
  }

  const handleSignUp = async () => {
    setError(null)
    setInfo(null)
    setBusy(true)
    const { error } = await signUpWithPassword(email, password)
    setBusy(false)
    if (error) setError(error)
    else setInfo('Account created. You are now signed in.')
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-sm border border-border bg-bg-surface p-6">
        <h1 className="mb-1 text-center text-[14px] font-bold uppercase tracking-wide text-text-primary">
          Chokepoint
        </h1>
        <p className="mb-6 text-center text-[11px] text-text-secondary">
          A training journal for the modern grappler.{' '}
          <button
            type="button"
            onClick={() => setShowAbout(true)}
            className="text-text-primary underline underline-offset-2 hover:text-node-submission"
          >
            What is this?
          </button>
        </p>

        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          className="mb-4 w-full border border-border bg-transparent px-3 py-2 text-[11px] font-medium uppercase text-text-primary transition-colors hover:bg-bg-elevated"
        >
          Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-2 text-text-tertiary">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] uppercase">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-text-secondary">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-0 border-b border-border bg-transparent py-1 text-[12px] text-text-primary outline-none focus:border-border-focus"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-text-secondary">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-0 border-b border-border bg-transparent py-1 text-[12px] text-text-primary outline-none focus:border-border-focus"
            />
          </label>

          {error && <p className="text-[11px] text-node-submission" style={{ color: '#ff5555' }}>{error}</p>}
          {info && <p className="text-[11px] text-text-secondary">{info}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 border border-text-primary bg-text-primary px-3 py-2 text-[11px] font-medium uppercase text-black transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:opacity-50"
            >
              Log In
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSignUp()}
              className="flex-1 border border-border bg-transparent px-3 py-2 text-[11px] font-medium uppercase text-text-primary transition-colors hover:bg-bg-elevated disabled:opacity-50"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  )
}
