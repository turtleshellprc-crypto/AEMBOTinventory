import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Item, Transaction } from '../../lib/types'
import { useLocations } from '../../lib/queries'
import { fmtDate, fmtQty, friendlyError, locationPath } from '../../lib/format'
import { useAuth } from '../../lib/auth'
import { ConfirmDialog, Dialog, ErrorBox, Qty, QtyBar, Spinner, StatusBadge, useToast } from '../../components/ui'
import ItemForm from './ItemForm'
import AdjustDialog from './AdjustDialog'

const TYPE_LABEL: Record<string, string> = {
  initial: 'Created', count: 'Count', received: 'Received', damaged: 'Damaged or lost', correction: 'Correction',
}

export default function ItemDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { can, session } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const locs = useLocations()
  const [editing, setEditing] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const item = useQuery({
    queryKey: ['inventory', 'item', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventory_list').select('*').eq('id', id).single()
      if (error) throw error
      return data as Item
    },
  })
  const history = useQuery({
    queryKey: ['transactions', id],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase.from('inventory_transactions')
        .select('id,type,previous_quantity,new_quantity,quantity_change,notes,created_at,profiles(display_name)')
        .eq('item_id', id).order('created_at', { ascending: false }).limit(50)
      if (error) throw error
      return data as unknown as Transaction[]
    },
  })

  const toggleArchive = async () => {
    const i = item.data!
    const { error } = await supabase.from('inventory_items')
      .update({ archived_at: i.archived_at ? null : new Date().toISOString() }).eq('id', id)
    if (error) return toast(friendlyError(error), 'err')
    toast(i.archived_at ? 'Item restored.' : 'Item archived.')
    qc.invalidateQueries({ queryKey: ['inventory'] }); qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const i = item.data
  return (
    <Dialog title={i?.name ?? 'Part'} onClose={onClose} wide>
      {item.isLoading ? <Spinner /> : item.error || !i ? <ErrorBox error={item.error} retry={item.refetch} /> : (
        <div className="stack">
          <div className="qty-summary">
            <div><span className="muted">On hand</span><Qty value={i.quantity_on_hand} unit={i.unit} /></div>
            <div><span className="muted">Allocated</span><Qty value={i.quantity_allocated} /></div>
            <div><span className="muted">Available</span><Qty value={i.quantity_available} /></div>
            <div><span className="muted">Minimum</span><Qty value={i.min_stock_threshold} /></div>
            <StatusBadge status={i.stock_status} />
          </div>
          <QtyBar onHand={i.quantity_on_hand} allocated={i.quantity_allocated} status={i.stock_status} />

          <div className="actions left">
            {can('inventory.edit_quantity') && <button className="btn primary" onClick={() => setAdjusting(true)}>Adjust quantity</button>}
            {(can('inventory.edit_details')) && <button className="btn" onClick={() => setEditing(true)}>Edit details</button>}
            {can('inventory.archive') && <button className="btn" onClick={() => i.archived_at ? toggleArchive() : setConfirmArchive(true)}>{i.archived_at ? 'Restore' : 'Archive'}</button>}
          </div>

          <dl className="details">
            <dt>Part number</dt><dd>{i.part_number || '—'}</dd>
            <dt>Category</dt><dd>{i.category_name || '—'}</dd>
            <dt>Location</dt><dd>{locationPath(i.location_id, locs.data ?? []) || '—'}</dd>
            <dt>Manufacturer</dt><dd>{[i.manufacturer, i.manufacturer_part_number].filter(Boolean).join(' · ') || '—'}</dd>
            <dt>Material</dt><dd>{i.material || '—'}</dd>
            <dt>Specifications</dt><dd>{i.specifications || '—'}</dd>
            <dt>Description</dt><dd>{i.description || '—'}</dd>
            {session && <><dt>Supplier</dt><dd>{i.supplier_url ? <a href={i.supplier_url} target="_blank" rel="noreferrer noopener">{i.supplier_url}</a> : '—'}</dd>
              <dt>Notes</dt><dd>{i.notes || '—'}</dd></>}
            <dt>Added</dt><dd>{fmtDate(i.created_at)}</dd>
            <dt>Last updated</dt><dd>{fmtDate(i.updated_at)}</dd>
          </dl>

          {session && (
            <section>
              <h3>Quantity history</h3>
              {history.isLoading ? <Spinner /> : history.error ? <ErrorBox error={history.error} retry={history.refetch} /> :
                history.data!.length === 0 ? <p className="muted">No history yet.</p> : (
                  <div className="table-wrap"><table className="compact">
                    <thead><tr><th>When</th><th>Type</th><th className="r">Before</th><th className="r">After</th><th className="r">Change</th><th>By</th><th>Notes</th></tr></thead>
                    <tbody>{history.data!.map(t => (
                      <tr key={t.id}><td>{fmtDate(t.created_at)}</td><td>{TYPE_LABEL[t.type]}</td>
                        <td className="r num">{fmtQty(t.previous_quantity)}</td><td className="r num">{fmtQty(t.new_quantity)}</td>
                        <td className={`r num ${t.quantity_change < 0 ? 'neg' : 'pos'}`}>{t.quantity_change > 0 ? '+' : ''}{fmtQty(t.quantity_change)}</td>
                        <td>{t.profiles?.display_name ?? '—'}</td><td>{t.notes ?? ''}</td></tr>
                    ))}</tbody>
                  </table></div>
                )}
            </section>
          )}
        </div>
      )}
      {editing && i && <ItemForm item={i} onClose={() => { setEditing(false); item.refetch() }} />}
      {adjusting && i && <AdjustDialog item={i} onClose={() => { setAdjusting(false); item.refetch() }} />}
      {confirmArchive && <ConfirmDialog title="Archive this part?" danger confirmLabel="Archive"
        message="Archived parts are hidden from the public list and from totals. Their history is kept and you can restore them later."
        onConfirm={toggleArchive} onClose={() => setConfirmArchive(false)} />}
    </Dialog>
  )
}
