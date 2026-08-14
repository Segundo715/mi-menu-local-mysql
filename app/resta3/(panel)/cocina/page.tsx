'use client'

// KDS de cocina: los pedidos en mesa ocupan el área principal a ancho completo.
// Todo lo de DOMICILIOS (delivery por Gogo/Uber Eats/Rappi + alta de pedido) vive en
// el rail derecho fijo del layout, portado vía createPortal.
// Los pedidos de delivery usan notes con prefijo [GOGO], [UBEREATS] o [RAPPI].
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Resta3Nav from '@/app/components/Resta3Nav'
import { useRightRail } from '@/app/components/RightRail'
import { Icon, type IconName } from '@/app/components/Icon'

const S = { bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)', text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)' }

interface OrderItem { name: string; quantity: number; price: number }
interface Order { id: string; customerName: string; tableNumber?: string; status: string; items: OrderItem[]; notes?: string; createdAt: string }

const PLATFORMS = {
  DOMICILIO: { key: 'DOMICILIO', label: 'A domicilio', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.4)', icon: 'home'  as IconName },
  GOGO:     { key: 'GOGO',     label: 'Gogo',      color: '#ff6b35', bg: 'rgba(255,107,53,0.12)',  border: 'rgba(255,107,53,0.4)',  icon: 'heart' as IconName },
  UBEREATS: { key: 'UBEREATS', label: 'Uber Eats', color: '#06c167', bg: 'rgba(6,193,103,0.12)',   border: 'rgba(6,193,103,0.4)',   icon: 'heart' as IconName },
  RAPPI:    { key: 'RAPPI',    label: 'Rappi',     color: '#ff441b', bg: 'rgba(255,68,27,0.12)',   border: 'rgba(255,68,27,0.4)',   icon: 'heart' as IconName },
} as const
type PlatformKey = keyof typeof PLATFORMS

// Parte la nota (ya sin prefijo [PLATAFORMA]) en líneas con icono: domicilio, referencias, pedido, pago.
function noteSegments(note: string): { icon: IconName; text: string }[] {
  return note.split(' · ').filter(Boolean).map(seg => {
    if (seg.startsWith('Pedido:')) return { icon: 'utensils' as IconName, text: seg.slice('Pedido:'.length).trim() }
    if (seg.startsWith('Dom:'))    return { icon: 'pin'      as IconName, text: seg.slice('Dom:'.length).trim() }
    if (seg.startsWith('Ref:'))    return { icon: 'bookmark' as IconName, text: seg.slice('Ref:'.length).trim() }
    if (seg.startsWith('Pago:'))   return { icon: 'cash'     as IconName, text: seg.slice('Pago:'.length).trim() }
    return { icon: 'note' as IconName, text: seg.trim() }
  })
}

const KDS_CFG: Record<string, { label: string; color: string; next: string; nextLabel: string; icon: IconName; urgentAfter: number }> = {
  pending:   { label: 'Nuevo',      color: '#f59e0b', next: 'preparing', nextLabel: 'Iniciar',  icon: 'play',  urgentAfter: 5  },
  preparing: { label: 'Preparando', color: '#3b82f6', next: 'ready',     nextLabel: 'Listo',    icon: 'check', urgentAfter: 15 },
  ready:     { label: 'Listo',      color: '#22c55e', next: 'delivered', nextLabel: 'Entregar', icon: 'truck', urgentAfter: 10 },
}

function getPlatform(notes?: string) {
  if (!notes) return null
  const m = notes.match(/^\[(\w+)\]/)
  if (!m) return null
  return PLATFORMS[m[1] as PlatformKey] ?? null
}
function isDelivery(o: Order) { return getPlatform(o.notes) !== null }
function cleanNote(notes?: string) { return (notes ?? '').replace(/^\[\w+\]\s*/, '').trim() }

function elapsed(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return { label: 'ahora', mins: 0 }
  return { label: `${mins} min`, mins }
}

// ── Order card ────────────────────────────────────────────────────────────────
// `surface` permite contrastar la tarjeta según el fondo donde se renderiza:
// S.card sobre la página (S.bg), o S.bg dentro del rail (S.card).
function OrderCard({ order, cfg, advancing, onAdvance, surface = S.card }: {
  order: Order
  cfg: typeof KDS_CFG[string]
  advancing: string | null
  onAdvance: (id: string, next: string) => void
  surface?: string
}) {
  const { label: elLabel, mins } = elapsed(order.createdAt)
  const urgent = mins >= cfg.urgentAfter
  const platform = getPlatform(order.notes)
  const note = cleanNote(order.notes)

  return (
    <div className="rounded-2xl p-4 space-y-3 transition-all"
      style={{ backgroundColor: surface, border: `2px solid ${urgent ? cfg.color + '66' : platform ? platform.border : cfg.color + '22'}` }}>

      {platform && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg w-fit"
          style={{ backgroundColor: platform.bg, border: `1px solid ${platform.border}` }}>
          <span style={{ color: platform.color }}><Icon name={platform.icon} size={13} /></span>
          <span className="text-xs font-black" style={{ color: platform.color }}>{platform.label}</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-black text-sm" style={{ color: S.text }}>{order.customerName}</p>
          {order.tableNumber && <p className="text-xs" style={{ color: S.sub }}>{order.tableNumber}</p>}
        </div>
        <span className="text-xs font-black px-2 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1"
          style={{ backgroundColor: urgent ? `${cfg.color}30` : `${cfg.color}15`, color: cfg.color }}>
          {urgent && <Icon name="alert" size={11} />}{elLabel}
        </span>
      </div>

      {order.items.length > 0 && (
        <ul className="space-y-1">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm" style={{ color: S.text }}>
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>{item.quantity}</span>
              {item.name}
            </li>
          ))}
        </ul>
      )}

      {note && (
        <div className="space-y-1">
          {noteSegments(note).map((seg, i) => (
            <p key={i} className="text-xs px-2 py-1.5 rounded-lg flex items-start gap-1.5"
              style={{ backgroundColor: 'var(--ad-elevated)', color: '#fbbf24' }}>
              <span className="shrink-0 mt-0.5"><Icon name={seg.icon} size={12} /></span>
              <span className="flex-1">{seg.text}</span>
            </p>
          ))}
        </div>
      )}

      <button onClick={() => onAdvance(order.id, cfg.next)} disabled={advancing === order.id}
        className="w-full py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
        style={{ background: `linear-gradient(135deg,${cfg.color}22,${cfg.color}11)`, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
        {advancing === order.id ? 'Guardando...' : <><Icon name={cfg.icon} size={15} />{cfg.nextLabel}</>}
      </button>
    </div>
  )
}

// ── Status section para el board de cocina ───────────────────────────────────
function StatusSection({ orders, cfg, advancing, onAdvance }: {
  orders: Order[]
  cfg: typeof KDS_CFG[string]
  advancing: string | null
  onAdvance: (id: string, next: string) => void
}) {
  if (orders.length === 0) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
        <span className="text-xs font-black uppercase tracking-wide" style={{ color: cfg.color }}>{cfg.label}</span>
        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
          style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>{orders.length}</span>
      </div>
      <div className="space-y-2">
        {orders.map(order => (
          <OrderCard key={order.id} order={order} cfg={cfg} advancing={advancing} onAdvance={onAdvance} />
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CocinaPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [lastCount, setLastCount] = useState(0)
  const [newAlert, setNewAlert] = useState(false)
  const audioRef = useRef<AudioContext | null>(null)

  const { mount, setFilled, setTitle } = useRightRail()

  async function load(silent = false) {
    const r = await fetch('/api/orders')
    if (!r.ok) return
    const data: Order[] = await r.json()
    const active = data.filter(o => o.status !== 'delivered')
    if (!silent && active.length > lastCount && lastCount > 0) {
      setNewAlert(true)
      playBeep()
      setTimeout(() => setNewAlert(false), 4000)
    }
    setLastCount(active.length)
    setOrders(active)
    setLoading(false)
  }

  function playBeep() {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext()
      const ctx = audioRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 880; gain.gain.value = 0.3
      osc.start(); osc.stop(ctx.currentTime + 0.2)
    } catch {}
  }

  useEffect(() => {
    queueMicrotask(() => load(true))
    const t = setInterval(() => load(), 10000)
    return () => clearInterval(t)
  }, [])

  // El rail derecho muestra el listado de pedidos por orden de entrada.
  useEffect(() => {
    setFilled(true)
    setTitle('Orden de entrada')
    return () => setFilled(false)
  }, [setFilled, setTitle])

  async function advance(id: string, next: string) {
    setAdvancing(id)
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    await load(true)
    setAdvancing(null)
  }

  const domicilioCount = orders.filter(isDelivery).length
  const kdsGroups      = ['pending', 'preparing', 'ready']
  // Pedidos por orden de entrada (más antiguo primero) para el rail.
  const byEntry = [...orders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <div className="min-h-screen md:ml-[240px]" style={{ backgroundColor: S.bg }}>
      <Resta3Nav />

      {newAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl font-black text-sm animate-bounce inline-flex items-center gap-2"
          style={{ backgroundColor: S.accent, color: '#fff' }}>
          <Icon name="bell" size={16} /> ¡Nuevo pedido!
        </div>
      )}

      <div className="max-w-[1600px] mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-black" style={{ color: S.text }}>Cocina</h1>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>
              {orders.length} activos · {domicilioCount} a domicilio · Actualiza cada 10s
            </p>
          </div>
          <button onClick={() => load(true)}
            className="text-xs px-3 py-2 rounded-lg font-bold"
            style={{ backgroundColor: S.card, color: S.accent, border: `1px solid ${S.border}` }}>
            ↻ Actualizar
          </button>
        </div>

        {/* Board de cocina — todos los pedidos (mesa 🍽️ + domicilio 🏠) por estado */}
        {loading ? (
          <div className="text-center py-16 text-sm" style={{ color: S.sub }}>Cargando pedidos...</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-16 rounded-2xl" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <span className="mb-3" style={{ color: '#22c55e' }}><Icon name="checkCircle" size={44} /></span>
            <p className="text-lg font-black" style={{ color: S.text }}>Cocina al día</p>
            <p className="text-sm mt-1" style={{ color: S.sub }}>Sin pedidos pendientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {kdsGroups.map(status => {
              const cfg = KDS_CFG[status]
              const group = orders.filter(o => o.status === status)
              return (
                <StatusSection key={status} orders={group} cfg={cfg}
                  advancing={advancing} onAdvance={advance} />
              )
            })}
          </div>
        )}
      </div>

      {/* ── Listado por orden de entrada — portado al rail derecho fijo ── */}
      {mount && createPortal(
        <div className="flex flex-col h-full" style={{ backgroundColor: S.bg }}>
          <div className="p-3 flex-1 overflow-y-auto space-y-2">
            {byEntry.length === 0 ? (
              <div className="rounded-2xl p-6 flex flex-col items-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                <span className="mb-2" style={{ color: S.sub }}><Icon name="clipboard" size={28} /></span>
                <p className="text-sm font-bold" style={{ color: S.text }}>Sin pedidos</p>
                <p className="text-xs mt-1" style={{ color: S.sub }}>Aquí aparecen por orden de llegada</p>
              </div>
            ) : byEntry.map((o, i) => {
              const platform = getPlatform(o.notes)
              const cfg = KDS_CFG[o.status] ?? { label: o.status, color: S.sub }
              const { label: elLabel, mins } = elapsed(o.createdAt)
              const itemCount = o.items.reduce((s, it) => s + it.quantity, 0)
              return (
                <div key={o.id} className="rounded-xl p-2.5 flex items-center gap-2.5"
                  style={{ backgroundColor: S.card, border: `1px solid ${platform ? platform.border : S.border}` }}>
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                    style={{ backgroundColor: S.bg, color: S.sub }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate flex items-center gap-1.5" style={{ color: S.text }}>
                      <span className="shrink-0" style={{ color: platform ? platform.color : S.sub }}><Icon name={platform ? platform.icon : 'utensils'} size={12} /></span>
                      <span className="truncate">{o.customerName}</span>
                    </p>
                    <p className="text-[11px]" style={{ color: S.sub }}>
                      {elLabel} · {itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? 's' : ''}` : (platform ? platform.label : 'mesa')}
                    </p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1"
                    style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>
                    {mins >= 15 && <Icon name="alert" size={10} />}{cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>,
        mount
      )}

    </div>
  )
}
