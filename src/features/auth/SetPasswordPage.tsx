import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Field } from '../../components/ui'

export default function SetPasswordPage() {
  const { passwordSet, session } = useAuth()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('')
    if (pw.length < 10) return setErr('Use at least 10 characters.')
    if (pw !== pw2) return setErr('The passwords do not match.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setErr(error.message)
    passwordSet()
    nav('/', { replace: true })
  }

  if (!session) return <div className="auth-page"><div className="auth-card"><p>This link has expired. Request a new one from the sign-in page.</p></div></div>
  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Choose a password</h1>
        <Field label="New password" hint="At least 10 characters."><input type="password" required autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></Field>
        <Field label="Confirm password"><input type="password" required autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} /></Field>
        {err && <div className="notice err" role="alert">{err}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
    </div>
  )
}
