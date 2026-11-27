import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from './types'

// Invite and password-reset emails land here with a token in the URL hash.
// Capture that before the Supabase client clears it, so we can ask for a password.
const landedFromEmailLink = /type=(invite|recovery)/.test(window.location.hash)

type AuthState = {
  session: Session | null
  loading: boolean
  profile: Profile | null
  can: (permission: string) => boolean
  needsPassword: boolean
  passwordSet: () => void
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [perms, setPerms] = useState<Set<string>>(new Set())
  const [needsPassword, setNeedsPassword] = useState(landedFromEmailLink)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setNeedsPassword(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id
  useEffect(() => {
    if (!uid) { setProfile(null); setPerms(new Set()); return }
    let cancelled = false
    ;(async () => {
      const [p, r] = await Promise.all([
        supabase.from('profiles').select('id,email,display_name,is_active').eq('id', uid).maybeSingle(),
        supabase.rpc('my_permissions'),
      ])
      if (cancelled) return
      setProfile((p.data as Profile) ?? null)
      setPerms(new Set((r.data as string[] | null) ?? []))
    })()
    return () => { cancelled = true }
  }, [uid])

  const value = useMemo<AuthState>(() => ({
    session, loading, profile,
    can: (k: string) => perms.has(k),
    needsPassword,
    passwordSet: () => setNeedsPassword(false),
    signOut: async () => { await supabase.auth.signOut() },
  }), [session, loading, profile, perms, needsPassword])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}

export const useSignedIn = () => {
  const { session, profile } = useAuth()
  return Boolean(session && profile?.is_active)
}

