import { useState, type FormEvent } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/inventory', label: 'All Inventory' },
  { to: '/locations', label: 'Storage Locations' },
  { to: '/settings', label: 'Settings', auth: true },
]

export default function Layout() {
  const { session, profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const [params] = useSearchParams()
  const [q, setQ] = useState(loc.pathname === '/inventory' ? params.get('q') ?? '' : '')

  const roles = useQuery({
    queryKey: ['my-roles', session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('roles(name,color)').eq('user_id', session!.user.id)
      if (error) throw error
      return (data as unknown as { roles: { name: string; color: string } }[]).map(r => r.roles)
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    nav(q.trim() ? `/inventory?q=${encodeURIComponent(q.trim())}` : '/inventory')
    setOpen(false)
  }

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">6443</span>
          <span className="brand-name">AEMBOT<small>Inventory</small></span>
        </div>
        <nav>
          {NAV.filter(n => !n.auth || session).map(n => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}>{n.label}</NavLink>
          ))}
        </nav>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu" onClick={() => setOpen(o => !o)} aria-label="Toggle navigation">☰</button>
          <form className="search" onSubmit={submit} role="search">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search parts, part numbers, materials…" aria-label="Search inventory" />
          </form>
          <div className="user">
            {session && profile ? (
              <>
                <div className="who">
                  <strong>{profile.display_name}</strong>
                  <span className="roles">
                    {roles.data?.map(r => <span key={r.name} className="role" style={{ ['--c' as string]: r.color }}>{r.name}</span>)}
                  </span>
                </div>
                <button className="btn" onClick={signOut}>Sign out</button>
              </>
            ) : <Link className="btn primary" to="/login">Team sign in</Link>}
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  )
}
