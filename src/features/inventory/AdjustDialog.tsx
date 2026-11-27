import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Item } from '../../lib/types'
import { fmtQty, friendlyError } from '../../lib/format'
import { Dialog, Field, useToast } from '../../components/ui'

type Mode = 'set' | 'add' | 'remove'

export default function AdjustDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [mode, setMode] = useState<Mode>('set')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('count')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const n = Number(amount)
  const preview = amount === '' || Number.isNaN(n) ? null
    : mode === 'set' ? n : mode === 'add' ? item.quantity_on_hand + n : item.quantity_on_hand - n

  const changeMode = (m: Mode) => {
    setMode(m)
    setType(m === 'set' ? 'count' : m === 'add' ? 'received' : 'damaged')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('')
    if (amount === '' || !(n >= 0)) return setErr('Enter a quantity of zero or more.')
    if (preview !== null && preview < 0) return setErr(`That would leave a negative quantity. Only ${fmtQty(item.quantity_on_hand)} on hand.`)
    setBusy(true)
    const { error } = await supabase.rpc('adjust_quantity', {
      p_item_id: item.id,
      p_new_quantity: mode === 'set' ? n : null,
      p_delta: mode === 'add' ? n : mode === 'remove' ? -n : null,
      p_type: type,
      p_notes: notes.trim() || null,
      p_expected: mode === 'set' ? item.quantity_on_hand : null,
    })
    setBusy(false)
    if (error) return setErr(friendlyError(error))
    toast(`${item.name} is now ${fmtQty(preview)} ${item.unit}.`)
    qc.invalidateQueries({ queryKey: ['inventory'] }); qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['transactions'] })
    onClose()
  }

  return (
    <Dialog title="Adjust quantity" onClose={onClose}>
      <form onSubmit={submit} className="stack-sm">
        <p><strong>{item.name}</strong><br /><span className="muted">On hand now: {fmtQty(item.quantity_on_hand)} {item.unit}</span></p>
        <div className="segmented" role="radiogroup" aria-label="Adjustment type">
          {([['set', 'Set count'], ['add', 'Add'], ['remove', 'Remove']] as const).map(([m, label]) => (
            <button type="button" key={m} role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => changeMode(m)}>{label}</button>
          ))}
        </div>
        <Field label={mode === 'set' ? 'Counted quantity' : mode === 'add' ? 'Quantity to add' : 'Quantity to remove'}>
          <input type="number" min="0" step="any" required autoFocus value={amount} onChange={e => setAmount(e.target.value)} />
        </Field>
        <Field label="Reason">
          <select value={type} onChange={e => setType(e.target.value)}>
            {mode === 'set' && <option value="count">Inventory count</option>}
            {mode === 'add' && <option value="received">Received from supplier</option>}
            {mode === 'remove' && <option value="damaged">Damaged or lost</option>}
            <option value="correction">Correction</option>
          </select>
        </Field>
        <Field label="Notes (optional)"><input value={notes} onChange={e => setNotes(e.target.value)} /></Field>
        {preview !== null && <p className="preview">New quantity: <strong className="num">{fmtQty(preview)}</strong> {item.unit}</p>}
        {err && <div className="notice err" role="alert">{err}</div>}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save quantity'}</button>
        </div>
      </form>
    </Dialog>
  )
}
