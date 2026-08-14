'use client'

// Kanban de pedidos reales (GET /api/orders) con polling cada 10 s.
// Permite avanzar el estado pending → preparing → ready → delivered con un PATCH.
import { useState, useEffect, useRef } from 'react'
import AdminNav from '@/app/components/AdminNav'
import { Icon } from '@/app/components/Icon'

interface OrderItem { name: string; quantity: number; price: number }
interface Order {
  id: string
  customerName: string
  tableNumber?: string
  items: OrderItem[]
  total: number
  status: 'pending' | 'preparing' | 'ready' | 'delivered'
  createdAt: string
  notes?: string
}

const S = {
  bg:     'var(--ad-bg)',
  card:   'var(--ad-card)',
  accent: 'var(--ad-accent)',
  text:   'var(--ad-text)',
  sub:    'var(--ad-sub)',
  border: 'var(--ad-border)',
}

const STATUS_CONFIG: Record<Order['status'], {
  label: string; headerBg: string; cardBorderColor: string; step: number
}> = {
  pending:   { label: 'Pendiente',  headerBg: '#ef4444', cardBorderColor: 'rgba(239,68,68,0.5)',   step: 0 },
  preparing: { label: 'Preparando', headerBg: '#f59e0b', cardBorderColor: 'rgba(245,158,11,0.5)', step: 1 },
  ready:     { label: 'Listo',      headerBg: '#22c55e', cardBorderColor: 'rgba(34,197,94,0.5)',  step: 2 },
  delivered: { label: 'Entregado',  headerBg: '#6b7280', cardBorderColor: S.border,               step: 3 },
}

const NEXT_ACTION: Partial<Record<Order['status'], { label: string; btnBg: string; btnColor: string }>> = {
  pending:   { label: 'Iniciar preparación', btnBg: '#f59e0b', btnColor: '#000' },
  preparing: { label: 'Marcar como listo',   btnBg: '#22c55e', btnColor: '#000' },
  ready:     { label: 'Confirmar entrega',   btnBg: '#6b7280', btnColor: '#fff' },
}

const NEXT_STATUS: Partial<Record<Order['status'], Order['status']>> = {
  pending: 'preparing', preparing: 'ready', ready: 'delivered',
}

const STEPS = ['Recibido', 'Preparando', 'Listo', 'Entregado']

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 90) return 'hace un momento'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  return `hace ${Math.floor(s / 3600)} h`
}

function isNew(iso: string) {
  return Date.now() - new Date(iso).getTime() < 2 * 60 * 1000
}

// Chicharra de dos tonos generada con Web Audio API — sin depender de un archivo de audio.
function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    const tones = [880, 1320]
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.value = 0.2
      osc.connect(gain)
      gain.connect(ctx.destination)
      const start = ctx.currentTime + i * 0.18
      osc.start(start)
      osc.stop(start + 0.15)
    })
    setTimeout(() => ctx.close(), 500)
  } catch {}
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'chart'>('active')
  const [advancing, setAdvancing] = useState<string | null>(null)
  const knownIds = useRef<Set<string> | null>(null)

  async function load() {
    const res = await fetch('/api/orders')
    if (res.ok) {
      const data: Order[] = await res.json()
      if (knownIds.current === null) {
        // Primera carga: solo registra los IDs existentes, sin sonar.
        knownIds.current = new Set(data.map(o => o.id))
      } else {
        const hasNew = data.some(o => o.status === 'pending' && !knownIds.current!.has(o.id))
        if (hasNew) playNotificationSound()
        knownIds.current = new Set(data.map(o => o.id))
      }
      setOrders(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(load)
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  async function advance(id: string, next: Order['status']) {
    setAdvancing(id)
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    await load()
    setAdvancing(null)
  }

  const active = orders.filter(o => o.status !== 'delivered')
  const delivered = orders.filter(o => o.status === 'delivered')

  const itemCounts: Record<string, number> = {}
  for (const order of orders)
    for (const item of order.items)
      itemCounts[item.name] = (itemCounts[item.name] ?? 0) + item.quantity
  const chartData = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxCount = chartData[0]?.[1] ?? 1

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />

      {/* Sub-tabs */}
      <div className="sticky top-[52px] md:top-0 z-10" style={{ backgroundColor: S.card, borderBottom: `1px solid ${S.border}` }}>
        <div className="max-w-2xl mx-auto px-4 flex">
          {(['active', 'chart'] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className="px-5 py-3.5 text-sm font-bold border-b-2 transition-colors"
              style={{
                borderColor: tab === t ? S.accent : 'transparent',
                color: tab === t ? S.accent : S.sub,
              }}>
              {t === 'active'
                ? <>Pedidos activos {active.length > 0 && (
                    <span className="ml-1.5 text-white text-xs font-bold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: '#ef4444' }}>{active.length}</span>
                  )}</>
                : <span className="inline-flex items-center gap-1.5"><Icon name="chart" size={14} /> Lo más consumido</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* ── PEDIDOS ACTIVOS ── */}
        {tab === 'active' && (
          <>
            {loading && (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ backgroundColor: S.card }}>
                    <div className="h-12" style={{ backgroundColor: 'var(--ad-overlay)' }} />
                    <div className="p-4 space-y-3">
                      <div className="h-4 rounded-full w-2/3" style={{ backgroundColor: 'var(--ad-overlay)' }} />
                      <div className="h-3 rounded-full w-1/2" style={{ backgroundColor: 'var(--ad-overlay)' }} />
                      <div className="h-10 rounded-xl mt-4" style={{ backgroundColor: 'var(--ad-overlay)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && active.length === 0 && (
              <div className="flex flex-col items-center py-20" style={{ color: S.sub }}>
                <span className="mb-4"><Icon name="utensils" size={52} /></span>
                <p className="font-semibold text-lg" style={{ color: S.text }}>No hay pedidos activos</p>
                <p className="text-sm mt-1">Los nuevos pedidos aparecerán aquí</p>
              </div>
            )}

            {active.map(order => {
              const cfg = STATUS_CONFIG[order.status]
              const nextStatus = NEXT_STATUS[order.status]
              const nextAction = NEXT_ACTION[order.status]
              const isAdvancing = advancing === order.id
              const nuevo = isNew(order.createdAt)

              return (
                <div key={order.id}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: S.card,
                    border: `1px solid ${cfg.cardBorderColor}`,
                    boxShadow: order.status === 'pending' ? `0 0 0 2px rgba(239,68,68,0.35)` : 'none',
                  }}>
                  {/* Status header */}
                  <div className="px-4 py-3 flex items-center justify-between"
                    style={{ backgroundColor: cfg.headerBg }}>
                    <div className="flex items-center gap-2">
                      {order.status === 'pending' && <span className="text-white animate-bounce"><Icon name="bell" size={17} /></span>}
                      {order.status === 'preparing' && <span className="text-white"><Icon name="chef" size={17} /></span>}
                      {order.status === 'ready' && <span className="text-white"><Icon name="checkCircle" size={17} /></span>}
                      <span className="text-white font-black text-sm uppercase tracking-wide">{cfg.label}</span>
                      {nuevo && (
                        <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">NUEVO</span>
                      )}
                    </div>
                    <span className="text-white/80 text-xs font-medium">{timeAgo(order.createdAt)}</span>
                  </div>

                  {/* Step progress */}
                  <div className="px-4 pt-3 flex items-center gap-1">
                    {STEPS.map((_, i) => (
                      <div key={i} className="flex items-center flex-1">
                        <div className="h-1.5 rounded-full flex-1 transition-all"
                          style={{ backgroundColor: i <= cfg.step ? cfg.headerBg : 'rgba(255,255,255,0.1)' }} />
                        {i < STEPS.length - 1 && <div className="w-1" />}
                      </div>
                    ))}
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Customer info */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-black text-lg leading-tight" style={{ color: S.text }}>{order.customerName}</p>
                        {order.tableNumber && (
                          <p className="text-sm font-medium" style={{ color: S.sub }}>Mesa {order.tableNumber}</p>
                        )}
                      </div>
                      <span className="font-black text-xl" style={{ color: S.text }}>${order.total.toFixed(2)}</span>
                    </div>

                    {/* Items */}
                    <div className="rounded-xl p-3 space-y-1.5"
                      style={{ backgroundColor: 'var(--ad-overlay)', border: `1px solid ${S.border}` }}>
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span style={{ color: S.text }}>
                            <span className="font-black" style={{ color: S.accent }}>{item.quantity}×</span> {item.name}
                          </span>
                          <span style={{ color: S.sub }}>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="flex items-start gap-2 rounded-xl px-3 py-2"
                        style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                        <span className="text-yellow-400 mt-0.5"><Icon name="note" size={14} /></span>
                        <p className="text-sm font-medium" style={{ color: '#fde68a' }}>{order.notes}</p>
                      </div>
                    )}

                    {/* Action button */}
                    {nextStatus && nextAction && (
                      <button
                        type="button"
                        onClick={() => advance(order.id, nextStatus)}
                        disabled={isAdvancing}
                        className="w-full py-3.5 rounded-xl font-black text-sm transition-all disabled:opacity-60"
                        style={{ backgroundColor: nextAction.btnBg, color: nextAction.btnColor }}>
                        {isAdvancing ? 'Actualizando...' : `${nextAction.label} →`}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {delivered.length > 0 && (
              <details className="group">
                <summary className="text-sm cursor-pointer py-2 px-1 flex items-center gap-2 select-none"
                  style={{ color: S.sub }}>
                  <span className="group-open:rotate-90 transition-transform inline-flex"><Icon name="play" size={11} /></span>
                  Entregados ({delivered.length})
                </summary>
                <div className="space-y-2 mt-2">
                  {delivered.slice(0, 10).map(order => (
                    <div key={order.id} className="rounded-xl p-3 flex items-center gap-3 opacity-50"
                      style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                      <span style={{ color: S.sub }}><Icon name="box" size={22} /></span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: S.text }}>{order.customerName}</p>
                        <p className="text-xs truncate" style={{ color: S.sub }}>
                          {order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: S.text }}>${order.total.toFixed(2)}</p>
                        <p className="text-xs" style={{ color: S.sub }}>{timeAgo(order.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}

        {/* ── GRÁFICA ── */}
        {tab === 'chart' && (
          <div className="rounded-2xl p-5" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <h2 className="font-black text-xl mb-1" style={{ color: S.text }}>Lo más consumido</h2>
            <p className="text-xs mb-6" style={{ color: S.sub }}>
              Basado en {orders.length} pedido{orders.length !== 1 ? 's' : ''}
            </p>

            {chartData.length === 0 ? (
              <div className="flex flex-col items-center py-14" style={{ color: S.sub }}>
                <span className="mb-3"><Icon name="chart" size={42} /></span>
                <p className="font-medium">Aún no hay datos suficientes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chartData.map(([name, count], idx) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                      style={{
                        backgroundColor: idx === 0 ? S.accent : idx === 1 ? 'rgba(0,230,118,0.4)' : 'rgba(255,255,255,0.08)',
                        color: idx <= 1 ? '#000' : S.sub,
                      }}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-semibold truncate" style={{ color: S.text }}>{name}</span>
                        <span className="font-black ml-2 shrink-0" style={{ color: S.accent }}>{count}</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: S.accent, opacity: 0.8 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
