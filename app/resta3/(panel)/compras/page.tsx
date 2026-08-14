'use client'

// Órdenes de compra a proveedores. Estado en localStorage (no persiste en Supabase aún).
import { useState, useEffect } from 'react'
import Resta3Nav from '@/app/components/Resta3Nav'
import { Icon } from '@/app/components/Icon'

const S = { bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)', text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)' }

interface PO { id: string; supplier: string; date: string; items: number; total: number; status: 'pendiente' | 'recibida' | 'cancelada'; notes: string }

const STATUS_CFG = {
  pendiente: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Pendiente' },
  recibida:  { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'Recibida' },
  cancelada: { color: '#f87171', bg: 'rgba(239,68,68,0.12)',   label: 'Cancelada' },
}

const INITIAL: PO[] = [
  { id: '1', supplier: 'Carnes El Rancho',    date: '2026-06-01', items: 5, total: 2400, status: 'recibida',  notes: '' },
  { id: '2', supplier: 'Distribuidora Fruver', date: '2026-06-02', items: 8, total: 980,  status: 'recibida',  notes: '' },
  { id: '3', supplier: 'Bebidas Corona',       date: '2026-06-03', items: 3, total: 1560, status: 'pendiente', notes: '' },
  { id: '4', supplier: 'Lácteos del Norte',    date: '2026-06-03', items: 4, total: 720,  status: 'pendiente', notes: '' },
]

const EMPTY_FORM = { supplier: '', date: '', items: '', total: '', notes: '' }

export default function ComprasPage() {
  const [orders, setOrders] = useState<PO[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('resta3_compras')
    queueMicrotask(() => setOrders(saved ? JSON.parse(saved) : INITIAL))
  }, [])

  function persist(list: PO[]) {
    setOrders(list)
    localStorage.setItem('resta3_compras', JSON.stringify(list))
  }

  function setStatus(id: string, status: PO['status']) {
    persist(orders.map(o => o.id === id ? { ...o, status } : o))
  }

  function deleteOrder(id: string) {
    if (!confirm('¿Eliminar esta orden?')) return
    persist(orders.filter(o => o.id !== id))
  }

  function saveNew() {
    if (!form.supplier.trim() || !form.date) return
    setSaving(true)
    const newOrder: PO = {
      id: Date.now().toString(),
      supplier: form.supplier.trim(),
      date: form.date,
      items: Number(form.items) || 0,
      total: Number(form.total) || 0,
      notes: form.notes.trim(),
      status: 'pendiente',
    }
    persist([newOrder, ...orders])
    setForm(EMPTY_FORM)
    setShowForm(false)
    setSaving(false)
  }

  const totalMonth = orders.filter(o => o.status === 'recibida').reduce((s, o) => s + o.total, 0)
  const pending = orders.filter(o => o.status === 'pendiente').length
  const suppliers = new Set(orders.map(o => o.supplier)).size

  return (
    <div className="min-h-screen md:ml-[240px]" style={{ backgroundColor: S.bg }}>
      <Resta3Nav />
      <div className="max-w-[900px] mx-auto p-4 space-y-4">

        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-black" style={{ color: S.text }}>Compras y Proveedores</h1>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>{orders.length} órdenes</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: S.accent, color: '#fff' }}>
            + Nueva orden
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <p className="text-xl font-black" style={{ color: S.accent }}>${totalMonth.toLocaleString()}</p>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>Total recibido</p>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: S.card, border: `1px solid rgba(245,158,11,0.3)` }}>
            <p className="text-xl font-black" style={{ color: '#f59e0b' }}>{pending}</p>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>Pendientes</p>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <p className="text-xl font-black" style={{ color: '#3b82f6' }}>{suppliers}</p>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>Proveedores</p>
          </div>
        </div>

        {/* Lista */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          {orders.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: S.sub }}>Sin órdenes de compra</div>
          ) : (
            <div className="divide-y" style={{ borderColor: S.border }}>
              {orders.map(po => {
                const cfg = STATUS_CFG[po.status]
                return (
                  <div key={po.id} className="px-4 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                      style={{ backgroundColor: `${S.accent}18`, color: S.accent }}>
                      {po.supplier.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: S.text }}>{po.supplier}</p>
                      <p className="text-xs" style={{ color: S.sub }}>{po.date} · {po.items} productos</p>
                      {po.notes && <p className="text-xs mt-0.5 italic" style={{ color: S.sub }}>{po.notes}</p>}
                    </div>
                    <p className="font-black shrink-0" style={{ color: S.accent }}>${po.total.toLocaleString()}</p>

                    {/* Estado con dropdown */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <select value={po.status} onChange={e => setStatus(po.id, e.target.value as PO['status'])}
                        className="text-xs font-bold px-2 py-1 rounded-full outline-none cursor-pointer"
                        style={{ backgroundColor: cfg.bg, color: cfg.color, border: 'none' }}>
                        <option value="pendiente">Pendiente</option>
                        <option value="recibida">Recibida</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                      <button onClick={() => deleteOrder(po.id)} aria-label="Eliminar" className="px-2 py-1 rounded-lg inline-flex items-center"
                        style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#f87171' }}><Icon name="trash" size={14} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal nueva orden */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
            style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <div className="flex items-center justify-between">
              <h2 className="font-black" style={{ color: S.text }}>Nueva orden de compra</h2>
              <button onClick={() => setShowForm(false)} aria-label="Cerrar" style={{ color: S.sub }}><Icon name="x" size={18} /></button>
            </div>
            {[
              { key: 'supplier', label: 'Proveedor *', placeholder: 'Nombre del proveedor', type: 'text' },
              { key: 'date', label: 'Fecha *', placeholder: '', type: 'date' },
              { key: 'items', label: 'Nº de productos', placeholder: '0', type: 'number' },
              { key: 'total', label: 'Total ($)', placeholder: '0.00', type: 'number' },
              { key: 'notes', label: 'Notas', placeholder: 'Detalles adicionales...', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>{f.label}</label>
                <input type={f.type} value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}`, colorScheme: 'dark' }} />
              </div>
            ))}
            <button onClick={saveNew} disabled={saving || !form.supplier.trim() || !form.date}
              className="w-full py-3 rounded-xl font-black text-sm disabled:opacity-50"
              style={{ backgroundColor: S.accent, color: '#fff' }}>
              Crear orden de compra
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
