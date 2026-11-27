import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabase'
import type { DashboardStats } from '../../lib/types'
import { Empty, ErrorBox, Qty, Spinner, StatusBadge } from '../../components/ui'
import { fmtDate, fmtQty } from '../../lib/format'
import { useAuth } from '../../lib/auth'

const TYPE_LABEL: Record<string, string> = {
  initial: 'Added', count: 'Counted', received: 'Received', damaged: 'Removed (damaged)', correction: 'Corrected',
}

export default function Dashboard() {
  const { can } = useAuth()
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_stats')
      if (error) throw error
      return data as DashboardStats
    },
  })

  if (isLoading) return <Spinner />
  if (error) return <ErrorBox error={error} retry={refetch} />
  const s = data!

  if (s.unique_items === 0) {
    return (
      <Empty title="No inventory yet">
        {can('inventory.add')
          ? <>Add your first part on the <Link to="/inventory">All Inventory</Link> page. Start with categories and storage locations if you want them set up first.</>
          : 'Nothing has been added yet. Once a team member adds parts, totals and charts will appear here.'}
      </Empty>
    )
  }

  const stats = [
    ['Unique items', s.unique_items],
    ['Total quantity', s.total_quantity],
    ['Allocated', s.total_allocated],
    ['Available', s.total_available],
    ['Low stock', s.low_count],
    ['Out of stock', s.zero_available_count],
  ] as const

  return (
    <div className="stack">
      <h1>Shop inventory</h1>
      <div className="stats">
        {stats.map(([label, v]) => (
          <div key={label} className="stat">
            <span className="stat-n num">{fmtQty(v)}</span>
            <span className="stat-l">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid2">
        <section className="panel">
          <h2>Quantity by category</h2>
          <div style={{ height: Math.max(180, s.by_category.length * 34) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.by_category} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="#D3D9DF" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmtQty(Number(v))} />
                <Bar dataKey="quantity" name="On hand" fill="#1D4ED8" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="muted small">Quantities across different units (each, ft, lb) are added together here, so compare items within a category rather than reading this as a precise total.</p>
        </section>

        <section className="panel">
          <h2>Allocated vs available</h2>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'All parts', allocated: s.total_allocated, available: s.total_available }]} layout="vertical" margin={{ right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip formatter={(v) => fmtQty(Number(v))} />
                <Bar dataKey="allocated" stackId="a" fill="#1D4ED8" name="Allocated" />
                <Bar dataKey="available" stackId="a" fill="#1A7F4B" name="Available" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="muted small">Allocation to subsystems arrives in Stage 2. Until then every part counts as available.</p>
        </section>
      </div>

      <div className="grid2">
        <section className="panel">
          <h2>Needs attention</h2>
          {s.low_items.length === 0 ? <p className="muted">Nothing is low or out of stock.</p> : (
            <ul className="list">
              {s.low_items.map(i => (
                <li key={i.id}>
                  <div><Link to={`/inventory?q=${encodeURIComponent(i.part_number || i.name)}`}>{i.name}</Link>
                    <div className="muted small">Min {fmtQty(i.min_stock_threshold)}</div></div>
                  <div className="right"><Qty value={i.quantity_available} unit={i.unit} /> <StatusBadge status={i.stock_status} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Recent activity</h2>
          {s.recent_activity.length === 0 ? (
            <p className="muted">Sign in as a team member to see recent changes.</p>
          ) : (
            <ul className="list">
              {s.recent_activity.map(a => (
                <li key={a.id}>
                  <div>{a.item_name}<div className="muted small">{TYPE_LABEL[a.type] ?? a.type} by {a.user_name ?? 'unknown'} · {fmtDate(a.created_at)}</div></div>
                  <div className={`right num ${a.quantity_change < 0 ? 'neg' : 'pos'}`}>{a.quantity_change > 0 ? '+' : ''}{fmtQty(a.quantity_change)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
