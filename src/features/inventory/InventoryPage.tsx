import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Item } from '../../lib/types'
import { useCategories, useLocations } from '../../lib/queries'
import { descendantIds, fmtQty, locationPath } from '../../lib/format'
import { useAuth } from '../../lib/auth'
import { Empty, ErrorBox, Qty, QtyBar, Spinner, StatusBadge } from '../../components/ui'
import ItemForm from './ItemForm'
import ItemDetail from './ItemDetail'

const PAGE = 50

export default function InventoryPage() {
  const { can, session } = useAuth()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const location = params.get('location') ?? ''
  const status = params.get('status') ?? ''
  const source = params.get('source') ?? ''
  const archived = params.get('archived') === '1'
  const [page, setPage] = useState(0)
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const cats = useCategories()
  const locs = useLocations()

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v); else next.delete(k)
    setParams(next, { replace: true }); setPage(0)
  }

  const locIds = useMemo(
    () => (location && locs.data ? descendantIds(location, locs.data) : null),
    [location, locs.data])

  const list = useQuery({
    queryKey: ['inventory', { q, category, location, status, source, archived, page, locIds }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let query = supabase.from('inventory_list').select('*', { count: 'exact' })
        .order('name').range(page * PAGE, page * PAGE + PAGE - 1)
      if (!archived) query = query.is('archived_at', null)
      if (category) query = query.eq('category_id', category)
      if (locIds) query = query.in('location_id', locIds)
      if (status) query = query.eq('stock_status', status)
      if (source) query = query.eq('source', source)
      const s = q.replace(/[%,()*\\]/g, ' ').trim()
      if (s) {
        const cols = ['name', 'part_number', 'manufacturer_part_number', 'description', 'manufacturer', 'material', 'category_name', 'location_name']
        query = query.or(cols.map(c => `${c}.ilike.%${s}%`).join(','))
      }
      const { data, error, count } = await query
      if (error) throw error
      return { rows: data as Item[], count: count ?? 0 }
    },
  })

  const filtered = Boolean(q || category || location || status || source)
  const total = list.data?.count ?? 0

  return (
    <div className="stack">
      <div className="page-head">
        <h1>All inventory</h1>
        {can('inventory.add') && <button className="btn primary" onClick={() => setAdding(true)}>Add item</button>}
      </div>

      <div className="filters">
        <input value={q} onChange={e => set('q', e.target.value)} placeholder="Filter by name, part number, material…" aria-label="Search" />
        <select value={category} onChange={e => set('category', e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {cats.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={location} onChange={e => set('location', e.target.value)} aria-label="Storage location">
          <option value="">All locations</option>
          {locs.data?.map(l => <option key={l.id} value={l.id}>{locationPath(l.id, locs.data!)}</option>)}
        </select>
        <select value={status} onChange={e => set('status', e.target.value)} aria-label="Stock status">
          <option value="">Any stock level</option>
          <option value="ok">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <select value={source} onChange={e => set('source', e.target.value)} aria-label="Source">
          <option value="">Any source</option>
          <option value="manual">Added manually</option>
          <option value="fusion">Imported from Fusion</option>
          <option value="csv">Imported from CSV</option>
        </select>
        {session && <label className="check"><input type="checkbox" checked={archived} onChange={e => set('archived', e.target.checked ? '1' : '')} /> Show archived</label>}
      </div>

      {list.isLoading ? <Spinner /> : list.error ? <ErrorBox error={list.error} retry={list.refetch} /> :
        total === 0 ? (
          filtered
            ? <Empty title="No parts match these filters">Clear a filter or try a different search.</Empty>
            : <Empty title="No inventory yet">{can('inventory.add') ? 'Use “Add item” to enter your first part.' : 'A team member with permission can add the first part.'}</Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Part</th><th>Category</th><th>Location</th>
                  <th className="r">On hand</th><th className="r">Allocated</th><th className="r">Available</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {list.data!.rows.map(i => (
                    <tr key={i.id} className={i.archived_at ? 'archived' : ''} tabIndex={0}
                      onClick={() => setOpenId(i.id)} onKeyDown={e => { if (e.key === 'Enter') setOpenId(i.id) }}>
                      <td><strong>{i.name}</strong>{i.archived_at && <span className="badge gray">Archived</span>}
                        <div className="muted small">{i.part_number || 'No part number'}</div></td>
                      <td>{i.category_name ?? <span className="muted">None</span>}</td>
                      <td>{i.location_name ? locationPath(i.location_id, locs.data ?? []) || i.location_name : <span className="muted">Unassigned</span>}</td>
                      <td className="r"><Qty value={i.quantity_on_hand} unit={i.unit} />
                        <QtyBar onHand={i.quantity_on_hand} allocated={i.quantity_allocated} status={i.stock_status} /></td>
                      <td className="r"><Qty value={i.quantity_allocated} /></td>
                      <td className="r"><Qty value={i.quantity_available} /></td>
                      <td><StatusBadge status={i.stock_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span className="muted">{fmtQty(total)} part{total === 1 ? '' : 's'}</span>
              <span>
                <button className="btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button className="btn" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)}>Next</button>
              </span>
            </div>
          </>
        )}

      {adding && <ItemForm onClose={() => setAdding(false)} />}
      {openId && <ItemDetail id={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}
