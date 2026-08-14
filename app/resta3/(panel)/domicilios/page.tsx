'use client'

// Registro de envíos a domicilio: lista los pedidos de delivery (notes con prefijo
// [GOGO]/[RAPPI]/[UBEREATS]/[DOMICILIO]) con su domicilio/referencias y su estado.
// Permite avanzar el estado: en cocina/listo → enviado → entregado.
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Resta3Nav from '@/app/components/Resta3Nav'
import { useRightRail } from '@/app/components/RightRail'
import { Icon, type IconName } from '@/app/components/Icon'

const S = { bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)', text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)' }

interface OrderItem { name: string; quantity: number; price: number }
interface Order { id: string; customerName: string; tableNumber?: string; status: string; items: OrderItem[]; notes?: string; createdAt: string; total: number }

const PLATFORMS: Record<string, { label: string; icon: IconName; color: string; bg: string; border: string }> = {
  GOGO:      { label: 'Gogo',       icon: 'heart', color: '#ff6b35', bg: 'rgba(255,107,53,0.12)', border: 'rgba(255,107,53,0.4)' },
  RAPPI:     { label: 'Rappi',      icon: 'heart', color: '#ff441b', bg: 'rgba(255,68,27,0.12)',  border: 'rgba(255,68,27,0.4)' },
  UBEREATS:  { label: 'Uber Eats',  icon: 'heart', color: '#06c167', bg: 'rgba(6,193,103,0.12)',  border: 'rgba(6,193,103,0.4)' },
  DOMICILIO: { label: 'A domicilio', icon: 'home', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.4)' },
}

// Estado del envío. 'enviado' es texto libre (la columna status admite cadenas arbitrarias).
const DSTATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'En cocina', color: '#f59e0b' },
  preparing: { label: 'En cocina', color: '#3b82f6' },
  ready:     { label: 'Listo para enviar', color: '#22c55e' },
  enviado:   { label: 'Enviado', color: '#0ea5e9' },
  delivered: { label: 'Entregado', color: '#a855f7' },
}

function platformOf(notes?: string) {
  const key = notes?.match(/^\[(\w+)\]/)?.[1]
  return key ? PLATFORMS[key] ?? null : null
}
function isDelivery(o: Order) { return platformOf(o.notes) !== null }
function noteField(notes: string | undefined, key: string): string {
  const m = notes?.match(new RegExp(`${key}:\\s*([^·]+)`, 'i'))
  return m ? m[1].trim() : ''
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

type Filter = 'curso' | 'entregados' | 'todos'

export default function DomiciliosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('curso')
  const { mount, setFilled, setTitle } = useRightRail()

  async function load() {
    const r = await fetch('/api/orders')
    if (r.ok) setOrders(await r.json())
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(load)
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  // Los filtros del registro viven en el rail derecho fijo.
  useEffect(() => {
    setFilled(true)
    setTitle('Domicilios')
    return () => setFilled(false)
  }, [setFilled, setTitle])

  async function setStatus(id: string, status: string) {
    setUpdating(id)
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
    setUpdating(null)
  }

  const deliveries = orders.filter(isDelivery)
  const enCurso = deliveries.filter(o => o.status !== 'delivered').length
  const entregados = deliveries.filter(o => o.status === 'delivered').length

  const filtered = deliveries
    .filter(o => filter === 'todos' ? true : filter === 'entregados' ? o.status === 'delivered' : o.status !== 'delivered')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const TABS: { id: Filter; label: string; icon?: IconName; count: number }[] = [
    { id: 'curso',      label: 'En curso',   icon: 'truck',       count: enCurso },
    { id: 'entregados', label: 'Entregados', icon: 'checkCircle', count: entregados },
    { id: 'todos',      label: 'Todos',                           count: deliveries.length },
  ]

  return (
    <div className="min-h-screen md:ml-[240px]" style={{ backgroundColor: S.bg }}>
      <Resta3Nav />
      <div className="max-w-[1100px] mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-black" style={{ color: S.text }}>Domicilios</h1>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>
              {enCurso} en curso · {entregados} entregados · Actualiza cada 15s
            </p>
          </div>
          <button onClick={load}
            className="text-xs px-3 py-2 rounded-lg font-bold"
            style={{ backgroundColor: S.card, color: S.accent, border: `1px solid ${S.border}` }}>
            ↻ Actualizar
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-16 text-sm" style={{ color: S.sub }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 rounded-2xl" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <span className="mb-2" style={{ color: S.sub }}><Icon name="truck" size={34} /></span>
            <p className="font-black text-sm" style={{ color: S.text }}>Sin envíos a domicilio</p>
            <p className="text-xs mt-1" style={{ color: S.sub }}>Los pedidos a domicilio se registran desde Caja</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(o => {
              const p = platformOf(o.notes)!
              const st = DSTATUS[o.status] ?? { label: o.status, color: S.sub }
              const dom = noteField(o.notes, 'Dom')
              const ref = noteField(o.notes, 'Ref')
              const pago = noteField(o.notes, 'Pago')
              const busy = updating === o.id
              return (
                <div key={o.id} className="rounded-2xl p-4 space-y-3"
                  style={{ backgroundColor: S.card, border: `1px solid ${p.border}` }}>

                  {/* Encabezado: plataforma + estado */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-black"
                      style={{ backgroundColor: p.bg, color: p.color, border: `1px solid ${p.border}` }}>
                      <Icon name={p.icon} size={13} /> {p.label}
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${st.color}1e`, color: st.color }}>
                      {st.label}
                    </span>
                  </div>

                  {/* Cliente + datos */}
                  <div className="space-y-1">
                    <p className="font-black text-sm flex items-center gap-1.5" style={{ color: S.text }}><Icon name="user" size={14} /> {o.customerName}</p>
                    {dom && <p className="text-xs flex items-start gap-1.5" style={{ color: S.sub }}><Icon name="pin" size={13} className="shrink-0 mt-0.5" /><span>{dom}</span></p>}
                    {ref && <p className="text-xs flex items-start gap-1.5" style={{ color: S.sub }}><Icon name="bookmark" size={13} className="shrink-0 mt-0.5" /><span>{ref}</span></p>}
                  </div>

                  {/* Pie: hora / pago / total */}
                  <div className="flex items-center justify-between text-xs" style={{ color: S.sub }}>
                    <span>{fmtTime(o.createdAt)}</span>
                    <span className="inline-flex items-center gap-1">{pago && <><Icon name="cash" size={12} />{pago} ·</>}{o.total > 0 ? ` $${o.total.toFixed(2)}` : ''}</span>
                  </div>

                  {/* Botón de estado */}
                  {o.status === 'delivered' ? (
                    <span className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black"
                      style={{ backgroundColor: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>
                      <Icon name="checkCircle" size={14} /> Entregado
                    </span>
                  ) : o.status === 'enviado' ? (
                    <button onClick={() => setStatus(o.id, 'delivered')} disabled={busy}
                      className="w-full py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
                      style={{ background: 'linear-gradient(135deg,#a855f7,#7e22ce)', color: '#fff' }}>
                      {busy ? 'Guardando...' : <><Icon name="check" size={14} /> Marcar entregado</>}
                    </button>
                  ) : (
                    <button onClick={() => setStatus(o.id, 'enviado')} disabled={busy}
                      className="w-full py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
                      style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff' }}>
                      {busy ? 'Guardando...' : <><Icon name="truck" size={14} /> Marcar enviado</>}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Filtros — portados al rail derecho fijo ── */}
      {mount && createPortal(
        <div className="flex flex-col h-full" style={{ backgroundColor: S.bg }}>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">

            {/* Filtros */}
            <div className="space-y-1.5">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setFilter(t.id)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={filter === t.id ? { backgroundColor: S.accent, color: '#000' } : { color: S.text, backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                  <span className="flex items-center gap-1.5">{t.icon && <Icon name={t.icon} size={14} />}{t.label}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                    style={filter === t.id ? { backgroundColor: 'rgba(0,0,0,0.25)', color: '#000' } : { backgroundColor: `${S.accent}22`, color: S.accent }}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        mount
      )}
    </div>
  )
}
