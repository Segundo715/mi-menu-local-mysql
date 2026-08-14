'use client'

// Vista de mesas y pedidos en vivo. Mesas y pedidos vienen de Supabase (mismas tablas que RESTA3).
import { useState, useEffect } from 'react'
import AdminNav from '@/app/components/AdminNav'
import { Icon, type IconName } from '@/app/components/Icon'

const S = {
  bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)',
  text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)',
}

type TableStatus = 'libre' | 'ocupada' | 'reservada' | 'limpieza'

interface Table {
  id: string; label: string; seats: number; status: TableStatus
  customer?: string; since?: string; zone: string
}

interface Order {
  id: string; customerName: string; tableNumber?: string
  status: 'pending' | 'preparing' | 'ready' | 'delivered'
  items: { name: string; quantity: number; price: number }[]
  total: number; createdAt: string
}

const STATUS_STYLE: Record<TableStatus, { border: string; textColor: string; bg: string; label: string }> = {
  libre:     { border: 'rgba(0,230,118,.3)',  textColor: 'var(--ad-accent)', bg: 'rgba(0,230,118,.05)',  label: 'Libre'     },
  ocupada:   { border: 'rgba(239,68,68,.3)',  textColor: '#f87171',          bg: 'rgba(239,68,68,.05)',  label: 'Ocupada'   },
  reservada: { border: 'rgba(251,191,36,.3)', textColor: '#fbbf24',          bg: 'rgba(251,191,36,.05)', label: 'Reservada' },
  limpieza:  { border: 'rgba(148,163,184,.3)',textColor: '#94a3b8',          bg: 'rgba(148,163,184,.05)',label: 'Limpieza'  },
}

const ORDER_STATUS: Record<Order['status'], { label: string; color: string; bg: string }> = {
  pending:   { label: 'En espera',  color: '#94a3b8', bg: 'rgba(148,163,184,.12)' },
  preparing: { label: 'Cocinando',  color: '#fbbf24', bg: 'rgba(251,191,36,.12)'  },
  ready:     { label: 'Listo',      color: '#4ade80', bg: 'rgba(0,230,118,.12)'   },
  delivered: { label: 'Entregado',  color: '#64748b', bg: 'rgba(100,116,139,.12)' },
}

type Tab = 'mesas' | 'pedidos' | 'kds'

export default function AdminOperacionesPage() {
  const [tab, setTab] = useState<Tab>('mesas')
  const [tables, setTables] = useState<Table[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const [t, o] = await Promise.all([
      fetch('/api/resta3/tables').then(r => r.json()).catch(() => []),
      fetch('/api/orders').then(r => r.json()).catch(() => []),
    ])
    setTables(Array.isArray(t) ? t : [])
    setOrders(Array.isArray(o) ? o : [])
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(load)
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [])

  // Agrupar mesas por zona
  const zones = Array.from(new Set(tables.map(t => t.zone)))
  const activeOrders = orders.filter(o => o.status !== 'delivered')

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />
      <div className="max-w-[1200px] mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2" style={{ color: S.text }}><Icon name="zap" size={20} /> Operaciones</h1>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>Mesas, pedidos y cocina en vivo</p>
          </div>
          <span className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: 'rgba(0,230,118,.12)', color: S.accent }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: S.accent }} /> EN VIVO
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          {(['mesas', 'pedidos', 'kds'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all"
              style={tab === t ? { backgroundColor: S.accent, color: '#000' } : { color: S.sub, backgroundColor: 'transparent' }}>
              {t === 'kds' ? 'KDS Cocina' : t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'pedidos' && activeOrders.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                  style={{ backgroundColor: 'rgba(239,68,68,.2)', color: '#f87171' }}>
                  {activeOrders.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12" style={{ color: S.sub }}>Cargando...</div>
        )}

        {/* Mesas */}
        {!loading && tab === 'mesas' && (
          <div className="space-y-4">
            {/* Leyenda */}
            <div className="flex gap-4 flex-wrap">
              {Object.entries(STATUS_STYLE).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-sm" style={{ color: S.sub }}>
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: v.textColor }} />{v.label}
                </div>
              ))}
            </div>

            {tables.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                <p style={{ color: S.sub }}>No hay mesas configuradas. Agrégalas desde RESTA3 → Mesas.</p>
              </div>
            ) : (
              zones.map(zone => (
                <div key={zone}>
                  <p className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: S.sub }}>
                    <Icon name={(zone === 'Salón' ? 'home' : zone === 'Terraza' ? 'leaf' : zone === 'Barra' ? 'coffee' : 'pin') as IconName} size={14} /> {zone}
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                    {tables.filter(t => t.zone === zone).map(t => {
                      const st = STATUS_STYLE[t.status]
                      return (
                        <div key={t.id} className="aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 p-1"
                          style={{ border: `1px solid ${st.border}`, backgroundColor: st.bg }}>
                          <span className="font-black text-sm leading-none" style={{ color: st.textColor }}>{t.label.replace('Mesa ', '').replace('Terraza ', 'T').replace('Barra ', 'B')}</span>
                          <span className="text-[9px] leading-none text-center" style={{ color: S.sub }}>{st.label}</span>
                          {t.customer && <span className="text-[9px] leading-none truncate w-full text-center px-0.5" style={{ color: st.textColor }}>{t.customer}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Resumen */}
            {tables.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {Object.entries(STATUS_STYLE).map(([k, v]) => {
                  const count = tables.filter(t => t.status === k).length
                  return (
                    <div key={k} className="rounded-xl p-3 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                      <p className="text-2xl font-black" style={{ color: v.textColor }}>{count}</p>
                      <p className="text-xs font-medium" style={{ color: S.sub }}>{v.label}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Pedidos */}
        {!loading && tab === 'pedidos' && (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            {activeOrders.length === 0 ? (
              <p className="text-center py-10" style={{ color: S.sub }}>No hay pedidos activos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                      {['#', 'Mesa', 'Cliente', 'Estado', 'Items', 'Total'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: S.sub }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrders.map(o => {
                      const st = ORDER_STATUS[o.status]
                      return (
                        <tr key={o.id} style={{ borderBottom: `1px solid ${S.border}` }} className="hover:bg-white/[.02]">
                          <td className="px-5 py-3 font-bold text-xs" style={{ color: S.sub }}>#{o.id.slice(0, 6)}</td>
                          <td className="px-5 py-3 font-medium" style={{ color: S.text }}>{o.tableNumber ? `Mesa ${o.tableNumber}` : '—'}</td>
                          <td className="px-5 py-3" style={{ color: S.sub }}>{o.customerName || '—'}</td>
                          <td className="px-5 py-3">
                            <span className="flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ backgroundColor: st.bg, color: st.color }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color }} />{st.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs" style={{ color: S.sub }}>{o.items.length} item{o.items.length !== 1 ? 's' : ''}</td>
                          <td className="px-5 py-3 font-bold" style={{ color: S.text }}>${o.total.toLocaleString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* KDS */}
        {!loading && tab === 'kds' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(['pending', 'preparing', 'ready'] as Order['status'][]).map(status => {
              const st = ORDER_STATUS[status]
              const col = activeOrders.filter(o => o.status === status)
              return (
                <div key={status} className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderTop: `2px solid ${st.color}` }}>
                  <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
                    <span className="font-bold text-sm inline-flex items-center gap-1.5" style={{ color: S.text }}>
                      <Icon name={(status === 'pending' ? 'clock' : status === 'preparing' ? 'chef' : 'checkCircle') as IconName} size={15} /> {st.label} ({col.length})
                    </span>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    {col.length === 0 ? (
                      <p className="text-xs text-center py-4" style={{ color: S.sub }}>Sin pedidos</p>
                    ) : col.map(o => (
                      <div key={o.id} className="rounded-xl p-3 space-y-1" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold" style={{ color: S.text }}>
                            {o.tableNumber ? `Mesa ${o.tableNumber}` : 'Sin mesa'} · #{o.id.slice(0, 6)}
                          </span>
                          <span className="text-xs" style={{ color: S.sub }}>{o.customerName}</span>
                        </div>
                        {o.items.map((item, i) => (
                          <p key={i} className="text-xs" style={{ color: S.sub }}>
                            {item.quantity}x {item.name}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
