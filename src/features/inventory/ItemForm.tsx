import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Item } from '../../lib/types'
import { useCategories, useLocations } from '../../lib/queries'
import { friendlyError, locationPath } from '../../lib/format'
import { Dialog, Field, useToast } from '../../components/ui'

const UNITS = ['each', 'ft', 'in', 'm', 'lb', 'oz', 'kg', 'g', 'sheet', 'box', 'pack', 'roll']

export default function ItemForm({ item, onClose }: { item?: Item; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const cats = useCategories()
  const locs = useLocations()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [f, setF] = useState({
    name: item?.name ?? '', part_number: item?.part_number ?? '', description: item?.description ?? '',
    category_id: item?.category_id ?? '', location_id: item?.location_id ?? '',
    manufacturer: item?.manufacturer ?? '', manufacturer_part_number: item?.manufacturer_part_number ?? '',
    material: item?.material ?? '', specifications: item?.specifications ?? '',
    image_url: item?.image_url ?? '', supplier_url: item?.supplier_url ?? '', notes: item?.notes ?? '',
    unit: item?.unit ?? 'each', min_stock_threshold: String(item?.min_stock_threshold ?? 0),
    quantity_on_hand: '0',
  })
  const up = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(p => ({ ...p, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('')
    const min = Number(f.min_stock_threshold)
    const qty = Number(f.quantity_on_hand)
    if (!f.name.trim()) return setErr('Part name is required.')
    if (!(min >= 0)) return setErr('Minimum stock must be zero or more.')
    if (!item && !(qty >= 0)) return setErr('Starting quantity must be zero or more.')
    const nz = (s: string) => (s.trim() === '' ? null : s.trim())
    const base = {
      name: f.name.trim(), part_number: nz(f.part_number), description: nz(f.description),
      category_id: f.category_id || null, location_id: f.location_id || null,
      manufacturer: nz(f.manufacturer), manufacturer_part_number: nz(f.manufacturer_part_number),
      material: nz(f.material), specifications: nz(f.specifications),
      image_url: nz(f.image_url), supplier_url: nz(f.supplier_url), notes: nz(f.notes),
      unit: f.unit, min_stock_threshold: min,
    }
    setBusy(true)
    const { error } = item
      ? await supabase.from('inventory_items').update(base).eq('id', item.id)
      : await supabase.from('inventory_items').insert({ ...base, quantity_on_hand: qty })
    setBusy(false)
    if (error) return setErr(friendlyError(error))
    toast(item ? 'Changes saved.' : 'Item added.')
    qc.invalidateQueries({ queryKey: ['inventory'] }); qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['transactions'] })
    onClose()
  }

  return (
    <Dialog title={item ? 'Edit part' : 'Add part'} onClose={onClose} wide>
      <form onSubmit={submit} className="form-grid">
        <Field label="Part name *"><input required value={f.name} onChange={up('name')} /></Field>
        <Field label="Part number" hint="Must be unique if set."><input value={f.part_number} onChange={up('part_number')} /></Field>
        <Field label="Category">
          <select value={f.category_id} onChange={up('category_id')}>
            <option value="">None</option>{cats.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Storage location">
          <select value={f.location_id} onChange={up('location_id')}>
            <option value="">Unassigned</option>{locs.data?.map(l => <option key={l.id} value={l.id}>{locationPath(l.id, locs.data!)}</option>)}
          </select>
        </Field>
        {!item && <Field label="Starting quantity" hint="Later changes are logged as adjustments."><input type="number" min="0" step="any" value={f.quantity_on_hand} onChange={up('quantity_on_hand')} /></Field>}
        <Field label="Unit">
          <select value={f.unit} onChange={up('unit')}>{UNITS.map(u => <option key={u}>{u}</option>)}</select>
        </Field>
        <Field label="Minimum stock" hint="Flag as low when available drops below this."><input type="number" min="0" step="any" value={f.min_stock_threshold} onChange={up('min_stock_threshold')} /></Field>
        <Field label="Manufacturer"><input value={f.manufacturer} onChange={up('manufacturer')} /></Field>
        <Field label="Manufacturer part number"><input value={f.manufacturer_part_number} onChange={up('manufacturer_part_number')} /></Field>
        <Field label="Material"><input value={f.material} onChange={up('material')} /></Field>
        <Field label="Dimensions / specifications"><input value={f.specifications} onChange={up('specifications')} /></Field>
        <Field label="Image URL"><input type="url" value={f.image_url} onChange={up('image_url')} /></Field>
        <Field label="Supplier URL" hint="Only visible to signed-in team members."><input type="url" value={f.supplier_url} onChange={up('supplier_url')} /></Field>
        <div className="span2"><Field label="Description"><textarea rows={2} value={f.description} onChange={up('description')} /></Field></div>
        <div className="span2"><Field label="Notes" hint="Only visible to signed-in team members."><textarea rows={2} value={f.notes} onChange={up('notes')} /></Field></div>
        {err && <div className="notice err span2" role="alert">{err}</div>}
        <div className="actions span2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : item ? 'Save changes' : 'Add item'}</button>
        </div>
      </form>
    </Dialog>
  )
}
