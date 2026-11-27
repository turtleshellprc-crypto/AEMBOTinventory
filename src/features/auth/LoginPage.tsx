import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Field } from '../../components/ui'

export default function LoginPage() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  if (session) return <Navigate to="/" replace />

  const signIn = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg({ kind: 'err', text: 'Email or password is incorrect.' })
    setBusy(false)
  }
  const reset = async () => {
    if (!email) { setMsg({ kind: 'err', text: 'Enter your email first.' }); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setMsg(error ? { kind: 'err', text: error.message } : { kind: 'ok', text: 'If that email has an account, a reset link is on its way.' })
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={signIn}>
        <h1>AEMBOT 6443 team sign in</h1>
        <p className="muted">Accounts are created by invitation. Ask an administrator to invite your email address. Viewing inventory does not require an account.</p>
        <Field label="Email"><input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="Password"><input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
        {msg && <div className={`notice ${msg.kind}`} role="status">{msg.text}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <button type="button" className="btn link" onClick={reset}>Forgot your password?</button>
        <Link to="/" className="muted">Back to inventory</Link>
      </form>
    </div>
  )
}
