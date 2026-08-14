'use client'

import { useState, useEffect } from 'react'
import Resta3Nav from '@/app/components/Resta3Nav'
import { Icon } from '@/app/components/Icon'

const S = { bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)', text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)' }

const DELIVERY_KEYS = ['GOGO', 'RAPPI', 'UBEREATS']
const DELIVERY_LABELS: Record<string, string> = { GOGO: 'Gogo', RAPPI: 'Rappi', UBEREATS: 'Uber Eats' }
const DELIVERY_COLORS: Record<string, string> = { GOGO: '#ff6b35', RAPPI: '#ff441b', UBEREATS: '#06c167' }

interface Order { id: string; customerName: string; status: string; total?: number; notes?: string; tableNumber?: string; createdAt: string }
interface MenuItem { id: string; name: string; category: string; price: number; likes: number }
interface Review { id: string; customerName: string; rating: number; comment: string; createdAt: string }
interface Corte { id: string; inicio: string; fin: string; by: string; receives: string | null; orders: number; efectivo: number; tarjeta: number; transferencia: number; domicilio: number; total: number }
interface StaffStat { name: string; total: number; efectivo: number; tarjeta: number; transferencia: number; domicilio: number; shifts: number; orders: number }

function detectType(o: Order): { label: string; color: string; icon: string } {
  const note = (o.notes ?? '').toUpperCase()
  for (const key of DELIVERY_KEYS) {
    if (note.includes(`[${key}]`)) return { label: DELIVERY_LABELS[key], color: DELIVERY_COLORS[key], icon: 'truck' }
  }
  return { label: o.tableNumber ? `Mesa ${o.tableNumber}` : 'Restaurante', color: '#3b82f6', icon: 'utensils' }
}

function paymentLabel(o: Order) {
  const m = (o.notes ?? '').match(/\[(\w+)\]/)
  if (!m) return '—'
  const key = m[1].toUpperCase()
  if (DELIVERY_KEYS.includes(key)) {
    const pay = (o.notes ?? '').match(/Pago:\s*(\w+)/i)
    return pay ? pay[1] : '—'
  }
  return key === 'EFECTIVO' ? 'Efectivo' : key === 'TARJETA' ? 'Tarjeta' : key === 'TRANSFERENCIA' ? 'Transferencia' : key
}

const STATUS_COLOR: Record<string, string> = { pending: '#f59e0b', preparing: '#3b82f6', ready: '#22c55e', delivered: '#64748b' }
const STATUS_LABEL: Record<string, string> = { pending: 'Pendiente', preparing: 'En cocina', ready: 'Listo', delivered: 'Entregado' }

export default function ReportesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [cortes, setCortes] = useState<Corte[]>([])
  const [period, setPeriod] = useState<'hoy' | 'semana' | 'mes'>('hoy')

  useEffect(() => {
    Promise.all([
      fetch('/api/orders').then(r => r.json()),
      fetch('/api/menu').then(r => r.json()),
      fetch('/api/reviews?all=1').then(r => r.json()),
      fetch('/api/resta3/corte').then(r => r.json()),
    ]).then(([o, m, rv, c]) => {
      setOrders(Array.isArray(o) ? o : [])
      setMenu(Array.isArray(m) ? m : [])
      setReviews(Array.isArray(rv) ? rv : [])
      setCortes(Array.isArray(c?.historial) ? c.historial : [])
    })
  }, [])

  function filterByPeriod(items: Order[]) {
    const now = new Date()
    return items.filter(o => {
      const d = new Date(o.createdAt)
      if (period === 'hoy') return d.toDateString() === now.toDateString()
      if (period === 'semana') return (now.getTime() - d.getTime()) < 7 * 86400000
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
  }

  const filtered = filterByPeriod(orders)
  const revenue = filtered.reduce((s, o) => s + (o.total ?? 0), 0)
  const delivered = filtered.filter(o => o.status === 'delivered').length
  const avgTicket = delivered > 0 ? revenue / delivered : 0
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const topMenu = [...menu].sort((a, b) => b.likes - a.likes).slice(0, 5)

  // Desglose por tipo
  const inHouse    = filtered.filter(o => !DELIVERY_KEYS.some(k => (o.notes ?? '').toUpperCase().includes(`[${k}]`)))
  const delivery   = filtered.filter(o => DELIVERY_KEYS.some(k => (o.notes ?? '').toUpperCase().includes(`[${k}]`)))
  const inRevenue  = inHouse.reduce((s, o) => s + (o.total ?? 0), 0)
  const delRevenue = delivery.reduce((s, o) => s + (o.total ?? 0), 0)

  // Ingresos por admin — filtrar cortes por periodo y agrupar por nombre
  function corteInPeriod(c: Corte) {
    const d = new Date(c.fin)
    const now = new Date()
    if (period === 'hoy') return d.toDateString() === now.toDateString()
    if (period === 'semana') return (now.getTime() - d.getTime()) < 7 * 86400000
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }
  const filteredCortes = cortes.filter(corteInPeriod)
  const staffMap = new Map<string, StaffStat>()
  for (const c of filteredCortes) {
    const name = c.by
    const prev = staffMap.get(name) ?? { name, total: 0, efectivo: 0, tarjeta: 0, transferencia: 0, domicilio: 0, shifts: 0, orders: 0 }
    staffMap.set(name, {
      name,
      total:         prev.total         + c.total,
      efectivo:      prev.efectivo      + c.efectivo,
      tarjeta:       prev.tarjeta       + c.tarjeta,
      transferencia: prev.transferencia + c.transferencia,
      domicilio:     prev.domicilio     + c.domicilio,
      shifts:        prev.shifts        + 1,
      orders:        prev.orders        + c.orders,
    })
  }
  const staffStats: StaffStat[] = [...staffMap.values()].sort((a, b) => b.total - a.total)
  const maxStaffTotal = staffStats[0]?.total || 1

  const byCategory = menu.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen md:ml-[240px]" style={{ backgroundColor: S.bg }}>
      <Resta3Nav />
      <div className="max-w-[1100px] mx-auto p-4 space-y-5">

        {/* Header + filtro periodo */}
        <div className="flex items-center justify-between pt-1">
          <h1 className="text-xl font-black" style={{ color: S.text }}>Reportes y Estadísticas</h1>
          <div className="flex gap-1.5">
            {(['hoy', 'semana', 'mes'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all"
                style={period === p ? { backgroundColor: S.accent, color: '#fff' } : { backgroundColor: S.card, color: S.sub, border: `1px solid ${S.border}` }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: 'Ingresos', value: `$${revenue.toFixed(0)}`, color: S.accent, icon: 'cash' },
            { label: 'Órdenes', value: filtered.length, color: '#3b82f6', icon: 'receipt' },
            { label: 'Ticket Prom.', value: `$${avgTicket.toFixed(0)}`, color: '#a855f7', icon: 'chart' },
            { label: 'Rating Prom.', value: avgRating > 0 ? `${avgRating.toFixed(1)}` : '—', color: '#f472b6', icon: 'star' },
          ] as const).map(k => (
            <div key={k.label} className="rounded-2xl p-4 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
              <div className="mb-1 flex justify-center" style={{ color: k.color }}><Icon name={k.icon} size={22} /></div>
              <p className="text-xl font-black" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs mt-0.5" style={{ color: S.sub }}>{k.label}</p>
            </div>
          ))}
        </div>

        {/* Desglose: Restaurante vs Domicilio */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 flex items-center gap-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
              <Icon name="utensils" size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: S.sub }}>En restaurante</p>
              <p className="text-2xl font-black" style={{ color: '#3b82f6' }}>{inHouse.length}</p>
              <p className="text-xs font-semibold" style={{ color: S.sub }}>${inRevenue.toFixed(0)}</p>
            </div>
          </div>
          <div className="rounded-2xl p-4 flex items-center gap-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(249,115,22,0.12)', color: '#f97316' }}>
              <Icon name="truck" size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: S.sub }}>A domicilio</p>
              <p className="text-2xl font-black" style={{ color: '#f97316' }}>{delivery.length}</p>
              <p className="text-xs font-semibold" style={{ color: S.sub }}>${delRevenue.toFixed(0)}</p>
            </div>
          </div>
        </div>

        {/* Ingresos por admin */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
            <span className="font-bold text-sm" style={{ color: S.text }}>Ingresos por admin</span>
            <span className="ml-2 text-xs" style={{ color: S.sub }}>basado en cortes de caja</span>
          </div>
          {staffStats.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: S.sub }}>Sin cortes de caja en este periodo</div>
          ) : (
            <div className="divide-y" style={{ borderColor: S.border }}>
              {staffStats.map((st, i) => (
                <div key={st.name} className="px-5 py-4 space-y-2.5">
                  {/* Fila principal */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                      style={{ background: i === 0 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'var(--ad-elevated)', color: i === 0 ? '#000' : S.sub }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate" style={{ color: S.text }}>{st.name}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ backgroundColor: 'var(--ad-elevated)', color: S.sub }}>
                          {st.shifts} turno{st.shifts !== 1 ? 's' : ''} · {st.orders} pedidos
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full mt-1.5" style={{ backgroundColor: 'var(--ad-elevated)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${(st.total / maxStaffTotal) * 100}%`, backgroundColor: 'var(--ad-accent)' }} />
                      </div>
                    </div>
                    <p className="text-base font-black shrink-0" style={{ color: S.accent }}>${st.total.toFixed(0)}</p>
                  </div>
                  {/* Desglose por método */}
                  <div className="grid grid-cols-4 gap-1.5 ml-11">
                    {([
                      { label: 'Efectivo',  value: st.efectivo,      color: '#22c55e' },
                      { label: 'Tarjeta',   value: st.tarjeta,       color: '#3b82f6' },
                      { label: 'Transfer.', value: st.transferencia, color: '#a855f7' },
                      { label: 'Domicilio', value: st.domicilio,     color: '#f97316' },
                    ]).map(({ label, value, color }) => (
                      <div key={label} className="rounded-lg p-1.5 text-center" style={{ backgroundColor: 'var(--ad-elevated)' }}>
                        <p className="text-[10px]" style={{ color: S.sub }}>{label}</p>
                        <p className="text-xs font-black" style={{ color }}>${value.toFixed(0)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pedidos recientes */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
            <span className="font-bold text-sm" style={{ color: S.text }}>Pedidos del periodo</span>
          </div>
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: S.sub }}>Sin pedidos en este periodo</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                    {['Cliente', 'Tipo', 'Pago', 'Total', 'Estado', 'Hora'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: S.sub }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...filtered].reverse().map(o => {
                    const type = detectType(o)
                    const sc = STATUS_COLOR[o.status] ?? '#64748b'
                    return (
                      <tr key={o.id} className="hover:bg-white/[.02]" style={{ borderBottom: `1px solid ${S.border}` }}>
                        <td className="px-4 py-3 font-bold" style={{ color: S.text }}>{o.customerName}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${type.color}18`, color: type.color }}>
                            <Icon name={type.icon as 'truck' | 'utensils'} size={11} />
                            {type.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: S.sub }}>{paymentLabel(o)}</td>
                        <td className="px-4 py-3 font-black" style={{ color: S.accent }}>${(o.total ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${sc}18`, color: sc }}>
                            {STATUS_LABEL[o.status] ?? o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: S.sub }}>{fmtTime(o.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Top platillos */}
          <div className="rounded-2xl" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="font-bold text-sm" style={{ color: S.text }}>Platillos más gustados</span>
            </div>
            <div className="p-5 space-y-3">
              {topMenu.length === 0 ? (
                <p className="text-sm text-center" style={{ color: S.sub }}>Sin datos</p>
              ) : topMenu.map((item, i) => {
                const maxLikes = topMenu[0].likes || 1
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-black"
                      style={{ backgroundColor: i === 0 ? 'rgba(245,158,11,0.18)' : 'var(--ad-overlay)', color: i === 0 ? '#f59e0b' : S.sub }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: S.text }}>{item.name}</p>
                      <div className="h-1.5 rounded-full mt-1" style={{ backgroundColor: 'var(--ad-overlay)' }}>
                        <div className="h-full rounded-full" style={{ width: `${(item.likes / maxLikes) * 100}%`, backgroundColor: S.accent }} />
                      </div>
                    </div>
                    <span className="text-sm font-black shrink-0 inline-flex items-center gap-1" style={{ color: S.accent }}><Icon name="heart" size={13} /> {item.likes}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Por categoría */}
          <div className="rounded-2xl" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="font-bold text-sm" style={{ color: S.text }}>Carta por categoría</span>
            </div>
            <div className="p-5 space-y-3">
              {Object.entries(byCategory).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: S.text }}>{cat}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded-full" style={{ backgroundColor: 'var(--ad-overlay)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(count / menu.length) * 100}%`, backgroundColor: '#3b82f6' }} />
                    </div>
                    <span className="text-sm font-black" style={{ color: '#3b82f6' }}>{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reseñas recientes */}
          <div className="md:col-span-2 rounded-2xl" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="font-bold text-sm" style={{ color: S.text }}>Últimas reseñas</span>
            </div>
            {reviews.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: S.sub }}>Sin reseñas aún</div>
            ) : (
              <div className="divide-y" style={{ borderColor: S.border }}>
                {reviews.slice(0, 5).map(r => (
                  <div key={r.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                      style={{ backgroundColor: S.accent, color: '#fff' }}>
                      {r.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold" style={{ color: S.text }}>{r.customerName}</p>
                        <span className="inline-flex items-center gap-0.5" style={{ color: '#fbbf24' }}>{Array.from({ length: r.rating }).map((_, s) => <Icon key={s} name="star" size={11} />)}</span>
                      </div>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: S.sub }}>{r.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
