import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { StockStatus } from '../lib/types'
import { fmtQty } from '../lib/format'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return <div className="state" role="status"><span className="spinner" aria-hidden /> {label}</div>
}

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  const msg = (error as { message?: string })?.message ?? 'Something went wrong.'
  return (
    <div className="state error" role="alert">
      <strong>Could not load this.</strong> {msg}
      {retry && <button className="btn" onClick={retry}>Try again</button>}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="state empty"><h3>{title}</h3>{children && <p>{children}</p>}</div>
}

const STATUS: Record<StockStatus, { label: string; cls: string }> = {
  ok: { label: 'In stock', cls: 'green' },
  low: { label: 'Low stock', cls: 'yellow' },
  out: { label: 'Out of stock', cls: 'red' },
}
export const StatusBadge = ({ status }: { status: StockStatus }) =>
  <span className={`badge ${STATUS[status].cls}`}>{STATUS[status].label}</span>

// The quantity bar: the full width is what the team owns. Blue is allocated, the rest is available.
export function QtyBar({ onHand, allocated, status }: { onHand: number; allocated: number; status: StockStatus }) {
  const total = Math.max(onHand, 0.000001)
  const a = Math.min(100, (allocated / total) * 100)
  const tone = status === 'ok' ? 'green' : status === 'low' ? 'yellow' : 'red'
  return (
    <span className="qtybar" aria-hidden>
      <span className="seg alloc" style={{ width: `${a}%` }} />
      <span className={`seg avail ${tone}`} style={{ width: onHand > 0 ? `${100 - a}%` : '0%' }} />
    </span>
  )
}

export function Qty({ value, unit }: { value: number; unit?: string }) {
  return <span className="num">{fmtQty(value)}{unit && unit !== 'each' ? <small> {unit}</small> : null}</span>
}

export function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  return (
    <dialog ref={ref} className={wide ? 'wide' : ''} onClose={onClose}
      onClick={e => { if (e.target === ref.current) onClose() }}>
      <div className="dialog-head">
        <h2>{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  )
}

export function ConfirmDialog(props: { title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Dialog title={props.title} onClose={props.onClose}>
      <p>{props.message}</p>
      <div className="actions">
        <button className="btn" onClick={props.onClose}>Cancel</button>
        <button className={`btn ${props.danger ? 'danger' : 'primary'}`} onClick={() => { props.onConfirm(); props.onClose() }}>{props.confirmLabel}</button>
      </div>
    </Dialog>
  )
}

type Toast = { id: number; text: string; kind: 'ok' | 'err' }
const ToastCtx = createContext<(text: string, kind?: 'ok' | 'err') => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, text, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map(t => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}
