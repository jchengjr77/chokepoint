import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@chokepoint/shared'
// Must run before any @chokepoint/shared hook touches the Supabase client
// — this is what actually calls initSupabase() with web's env vars.
import './lib/supabase'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)
