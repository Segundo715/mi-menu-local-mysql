'use client'

import { useState, useEffect } from 'react'
import AdminNav from '@/app/components/AdminNav'
import { Icon, type IconName } from '@/app/components/Icon'

const S = { bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)', text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)' }

interface DayData  { label: string; orders: number; revenue: number }
interface HourData { hour: number; orders: number; revenue: number }
interface ItemData  { name: string; count: number; revenue: number }
interface Analytics {
  kpis?: { today: { orders: number; revenue: number }; week: { orders: number; revenue: number }; month: { orders: number; revenue: number }; total: { orders: number; revenue: number } }
  orders?:    { total: number; delivered: number; pending: number }
  revenue?:   { total: number; avgOrderValue: number }
  reviews?:   { total: number; avgRating: number; published: number; bad: number }
  topItems?:  ItemData[]
  ordersPerDay?: DayData[]
  loyaltyCards?: { active: number; totalStamps: number; totalRedeemed: number }
}

function Bar({ value, max, color, label, sub }: { value: number; max: number; color: string; label: string; sub?: string }) {
  const pct = max > 0 ? Math.max(3, (value / max) * 100) : 3
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-xs font-bold truncate" style={{ color: S.text }}>{label}</p>
          {sub && <p className="text-xs shrink-0 ml-2" style={{ color: S.sub }}>{sub}</p>}
        </div>
        <div className="h-2 rounded-full w-full" style={{ backgroundColor: `${color}22` }}>
          <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  )
}

function MiniChart({ data, valueKey, color, height = 60 }: { data: Record<string, number>[]; valueKey: string; color: string; height?: number }) {
  const vals = data.map(d => d[valueKey] as number)
  const max = Math.max(...vals, 1)
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {vals.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm transition-all"
          style={{ height: `${Math.max(4, (v / max) * height)}px`, backgroundColor: color, opacity: i === vals.length - 1 ? 1 : 0.5 + (i / vals.length) * 0.5 }} />
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics>({})
  const [loading, setLoading] = useState(true)
  const [chartMode, setChartMode] = useState<'orders' | 'revenue'>('revenue')

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const ordersPerDay: DayData[] = data.ordersPerDay ?? []
  const topItems: ItemData[] = data.topItems ?? []
  const maxOrders  = Math.max(...ordersPerDay.map(d => d.orders), 1)
  const maxRevenue = Math.max(...ordersPerDay.map(d => d.revenue), 1)
  const maxItem    = Math.max(...topItems.map(d => d.count), 1)

  const kpis = [
    { label: 'Pedidos hoy',       value: data.orders?.pending !== undefined ? String(data.kpis?.today.orders ?? data.orders?.total ?? 0) : '—', icon: 'cart' as IconName, color: '#f59e0b' },
    { label: 'Ingresos hoy',      value: `$${(data.kpis?.today.revenue ?? 0).toFixed(0)}`,   icon: 'cash' as IconName, color: '#22c55e' },
    { label: 'Esta semana',       value: `$${(data.kpis?.week.revenue  ?? 0).toFixed(0)}`,   icon: 'calendar' as IconName, color: '#3b82f6' },
    { label: 'Este mes',          value: `$${(data.kpis?.month.revenue ?? 0).toFixed(0)}`,   icon: 'trendingUp' as IconName, color: '#a855f7' },
    { label: 'Total histórico',   value: `$${(data.revenue?.total      ?? 0).toFixed(0)}`,   icon: 'trophy' as IconName, color: '#06b6d4' },
    { label: 'Ticket promedio',   value: `$${(data.revenue?.avgOrderValue ?? 0).toFixed(0)}`, icon: 'receipt' as IconName, color: '#f97316' },
    { label: 'Reseñas',           value: `${(data.reviews?.avgRating ?? 0).toFixed(1)} / 5`, icon: 'star' as IconName, color: '#fbbf24' },
    { label: 'Tarjetas lealtad',  value: String(data.loyaltyCards?.active ?? 0),              icon: 'card' as IconName, color: '#ec4899' },
  ]

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />
      <div className="max-w-[1200px] mx-auto p-4 space-y-4">

        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2" style={{ color: S.text }}><Icon name="chart" size={20} /> Analytics</h1>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>Datos reales en tiempo real desde Supabase</p>
          </div>
          <button onClick={() => { setLoading(true); fetch('/api/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false) }) }}
            className="text-xs px-3 py-1.5 rounded-lg font-bold"
            style={{ backgroundColor: S.card, color: S.accent, border: `1px solid ${S.border}` }}>
            ↻ Actualizar
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20" style={{ color: S.sub }}>Cargando datos reales…</div>
        ) : (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {kpis.map(k => (
                <div key={k.label} className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs" style={{ color: S.sub }}>{k.label}</p>
                    <span style={{ color: k.color }}><Icon name={k.icon} size={17} /></span>
                  </div>
                  <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Ventas por día */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-black text-sm" style={{ color: S.text }}>Últimos 7 días</h2>
                  <div className="flex gap-1">
                    {(['revenue', 'orders'] as const).map(m => (
                      <button key={m} onClick={() => setChartMode(m)}
                        className="text-xs px-2 py-1 rounded-lg font-bold"
                        style={chartMode === m ? { backgroundColor: S.accent, color: '#000' } : { backgroundColor: S.bg, color: S.sub }}>
                        {m === 'revenue' ? '$' : '#'}
                      </button>
                    ))}
                  </div>
                </div>
                {ordersPerDay.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: S.sub }}>Sin datos aún</p>
                ) : (
                  <div className="space-y-2">
                    {ordersPerDay.slice(-7).map(d => (
                      <Bar key={d.label}
                        value={chartMode === 'revenue' ? d.revenue : d.orders}
                        max={chartMode === 'revenue' ? maxRevenue : maxOrders}
                        color={S.accent}
                        label={d.label}
                        sub={chartMode === 'revenue' ? `$${d.revenue.toFixed(0)}` : `${d.orders} ped.`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Top platillos */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                <h2 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: S.text }}><Icon name="trophy" size={16} /> Platillos más pedidos</h2>
                {topItems.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: S.sub }}>Sin datos aún</p>
                ) : (
                  <div className="space-y-3">
                    {topItems.slice(0, 6).map((item, i) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <span className="text-sm font-black w-5 text-center shrink-0" style={{ color: i < 3 ? S.accent : S.sub }}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-0.5">
                            <p className="text-xs font-bold truncate" style={{ color: S.text }}>{item.name}</p>
                            <p className="text-xs shrink-0 ml-2" style={{ color: S.sub }}>{item.count}×</p>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ backgroundColor: `${S.accent}22` }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${(item.count / maxItem) * 100}%`, backgroundColor: S.accent, opacity: 0.7 + (0.3 * (1 - i / topItems.length)) }} />
                          </div>
                        </div>
                        <span className="text-xs shrink-0 font-bold" style={{ color: '#22c55e' }}>${item.revenue.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Métricas adicionales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total pedidos',    value: data.orders?.total ?? 0,    icon: 'box' as IconName, color: '#3b82f6' },
                { label: 'Entregados',       value: data.orders?.delivered ?? 0, icon: 'checkCircle' as IconName, color: '#22c55e' },
                { label: 'Reseñas malas',    value: data.reviews?.bad ?? 0,      icon: 'alert' as IconName, color: '#ef4444' },
                { label: 'Sellos emitidos',  value: data.loyaltyCards?.totalStamps ?? 0, icon: 'ticket' as IconName, color: '#a855f7' },
              ].map(m => (
                <div key={m.label} className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                  <span style={{ color: m.color }}><Icon name={m.icon} size={22} /></span>
                  <div>
                    <p className="text-lg font-black" style={{ color: m.color }}>{m.value.toLocaleString()}</p>
                    <p className="text-xs" style={{ color: S.sub }}>{m.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
