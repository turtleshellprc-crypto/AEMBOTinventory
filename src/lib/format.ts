import type { Location } from './types'

export const fmtQty = (n: number | null | undefined) =>
  n == null ? '0' : Number(n).toLocaleString(undefined, { maximumFractionDigits: 3 })

export const fmtDate = (s: string) =>
  new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function locationPath(id: string | null, locations: Location[]): string {
  if (!id) return ''
  const byId = new Map(locations.map(l => [l.id, l]))
  const parts: string[] = []
  let cur = byId.get(id)
  let guard = 0
  while (cur && guard++ < 20) {
    parts.unshift(cur.name)
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined
  }
  return parts.join(' › ')
}

export function descendantIds(id: string, locations: Location[]): string[] {
  const out = [id]
  for (let i = 0; i < out.length; i++) {
    for (const l of locations) if (l.parent_id === out[i]) out.push(l.id)
  }
  return out
}

export function friendlyError(e: unknown): string {
  const err = e as { message?: string; code?: string } | null
  const msg = err?.message ?? 'Something went wrong'
  if (err?.code === '23505') return 'That name or part number already exists.'
  if (err?.code === '23503') return 'This is still in use. Move or remove the items that reference it first.'
  if (err?.code === '42501' || /row-level security|permission denied/i.test(msg))
    return 'You do not have permission to do that.'
  return msg
}
