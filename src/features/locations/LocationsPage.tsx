import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Location } from '../../lib/types'
import { useLocations } from '../../lib/queries'
import { descendantIds, friendlyError, locationPath } from '../../lib/format'
import { useAuth } from '../../lib/auth'
import { ConfirmDialog, Dialog, Empty, ErrorBox, Field, Spinner, useToast } from '../../components/ui'

type Editing = { mode: 'add'; parent: string | null } | { mode: 'rename'; loc: Location } | null

export default function LocationsPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const { data, error, isLoading, refetch } = useLocations()
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<Location | null>(null)
  const canEdit = can('inventory.edit_details')

  const remove = async (l: Location) => {
    const { error } = await supabase.from('storage_locations').delete().eq('id', l.id)
    if (error) return toast(friendlyError(error).replace('This is still in use.', `“${l.name}” still contains sub-locations or parts.`), 'err')
    toast(`Deleted ${l.name}.`)
    qc.invalidateQueries({ queryKey: ['locations'] }); qc.invalidateQueries({ queryKey: ['inventory'] })
  }

  const renderLevel = (parent: string | null, depth: number) =>
    data!.filter(l => l.parent_id === parent).map(l => (
      <li key={l.id}>
        <div className="loc-row" style={{ paddingLeft: depth * 22 }}>
          <Link to={`/inventory?location=${l.id}`}>{l.name}</Link>
          {canEdit && (
            <span className="row-actions">
              <button className="btn small" onClick={() => setEditing({ mode: 'add', parent: l.id })}>Add inside</button>
              <button className="btn small" onClick={() => setEditing({ mode: 'rename', loc: l })}>Rename</button>
              <button className="btn small danger-text" onClick={() => setDeleting(l)}>Delete</button>
            </span>
          )}
        </div>
        <ul>{renderLevel(l.id, depth + 1)}</ul>
      </li>
    ))

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Storage locations</h1>
        {canEdit && <button className="btn primary" onClick={() => setEditing({ mode: 'add', parent: null })}>Add location</button>}
      </div>
      {isLoading ? <Spinner /> : error ? <ErrorBox error={error} retry={refetch} /> :
        data!.length === 0 ? <Empty title="No storage locations yet">{canEdit ? 'Add a top-level location like “Main Hardware Cabinet”, then add drawers and compartments inside it.' : 'A team member with permission can add locations.'}</Empty> :
          <div className="panel"><ul className="tree">{renderLevel(null, 0)}</ul></div>}
      {editing && <LocationForm editing={editing} locations={data ?? []} onClose={() => setEditing(null)} />}
      {deleting && <ConfirmDialog danger title={`Delete ${deleting.name}?`} confirmLabel="Delete location"
        message="This only works if the location has no sub-locations and no parts assigned. Move them first if the delete is refused."
        onConfirm={() => remove(deleting)} onClose={() => setDeleting(null)} />}
    </div>
  )
}

function LocationForm({ editing, locations, onClose }: { editing: NonNullable<Editing>; locations: Location[]; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const isRename = editing.mode === 'rename'
  const [name, setName] = useState(isRename ? editing.loc.name : '')
  const [parent, setParent] = useState<string>(isRename ? editing.loc.parent_id ?? '' : editing.parent ?? '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const blocked = isRename ? new Set(descendantIds(editing.loc.id, locations)) : new Set<string>()

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('')
    if (!name.trim()) return setErr('Enter a name.')
    setBusy(true)
    const row = { name: name.trim(), parent_id: parent || null }
    const { error } = isRename
      ? await supabase.from('storage_locations').update(row).eq('id', editing.loc.id)
      : await supabase.from('storage_locations').insert(row)
    setBusy(false)
    if (error) return setErr(friendlyError(error))
    toast(isRename ? 'Location updated.' : 'Location added.')
    qc.invalidateQueries({ queryKey: ['locations'] }); qc.invalidateQueries({ queryKey: ['inventory'] })
    onClose()
  }

  return (
    <Dialog title={isRename ? 'Edit location' : 'Add location'} onClose={onClose}>
      <form onSubmit={submit} className="stack-sm">
        <Field label="Name"><input autoFocus required value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Inside">
          <select value={parent} onChange={e => setParent(e.target.value)}>
            <option value="">Top level</option>
            {locations.filter(l => !blocked.has(l.id)).map(l => <option key={l.id} value={l.id}>{locationPath(l.id, locations)}</option>)}
          </select>
        </Field>
        {err && <div className="notice err" role="alert">{err}</div>}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save location'}</button>
        </div>
      </form>
    </Dialog>
  )
}
