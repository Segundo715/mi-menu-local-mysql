'use client'
import { useState, useEffect } from 'react'
import AdminNav from '@/app/components/AdminNav'
import { Icon } from '@/app/components/Icon'

interface Order { id: string; total: number; status: string; createdAt: string }
interface DaySummary { date: string; label: string; orders: number; revenue: number; delivered: number }

const S = {
  bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)',
  text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)',
}

function groupByDay(orders: Order[]): DaySummary[] {
  const map = new Map<string, DaySummary>()
  for (const o of orders) {
    const d = new Date(o.createdAt)
    const dateKey = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (!map.has(dateKey)) map.set(dateKey, { date: dateKey, label, orders: 0, revenue: 0, delivered: 0 })
    const e = map.get(dateKey)!
    e.orders++
    if (o.status === 'delivered') { e.revenue += o.total ?? 0; e.delivered++ }
  }
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date))
}

export default function AdminVentasPage() {
  const [days, setDays] = useState<DaySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(d => { setDays(groupByDay(Array.isArray(d) ? d : [])); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const todayData = days.find(d => d.date === today) ?? { orders: 0, revenue: 0, delivered: 0 }
  const totalHistorico = days.reduce((s, d) => s + d.revenue, 0)
  const last30 = [...days].reverse().slice(-30)
  const maxRev = Math.max(...last30.map(d => d.revenue), 1)

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />
      <div className="max-w-[1200px] mx-auto p-4 space-y-4">

        <div className="pt-1">
          <h1 className="text-xl font-black flex items-center gap-2" style={{ color: S.text }}>
            <Icon name="cash" size={20} /> Ventas
          </h1>
          <p className="text-xs mt-0.5" style={{ color: S.sub }}>Historial de ventas por día</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Ventas hoy',      value: `$${todayData.revenue.toFixed(0)}`, sub: `${todayData.orders} pedidos` },
            { label: 'Pedidos hoy',     value: String(todayData.orders),           sub: `${todayData.delivered} entregados` },
            { label: 'Total histórico', value: `$${totalHistorico.toFixed(0)}`,    sub: `${days.length} días con ventas` },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
              <p className="text-xs font-medium mb-1" style={{ color: S.sub }}>{k.label}</p>
              <p className="text-2xl font-black" style={{ color: S.text }}>{loading ? '—' : k.value}</p>
              <p className="text-xs mt-0.5" style={{ color: S.sub }}>{loading ? '' : k.sub}</p>
            </div>
          ))}
        </div>

        {/* Gráfica últimos 30 días */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
            <span className="font-bold text-sm" style={{ color: S.text }}>Últimos 30 días</span>
          </div>
          <div className="px-5 py-5">
            {loading ? (
              <div className="h-[180px] flex items-center justify-center text-sm" style={{ color: S.sub }}>Cargando…</div>
            ) : last30.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-sm" style={{ color: S.sub }}>Sin ventas aún</div>
            ) : (
              <div className="flex items-end gap-1" style={{ height: 180 }}>
                {last30.map((d, i) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-sm"
                      style={{
                        height: `${Math.max(4, (d.revenue / maxRev) * 160)}px`,
                        backgroundColor: d.date === today ? S.accent : '#6366f1',
                      }}
                    />
                    {(i + 1) % 5 === 0 && (
                      <span className="text-[9px]" style={{ color: S.sub }}>
                        {new Date(d.date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Historial completo */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
            <span className="font-bold text-sm" style={{ color: S.text }}>Historial completo</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: S.sub }}>Cargando…</div>
          ) : days.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: S.sub }}>No hay ventas registradas aún</div>
          ) : (
            <div>
              {days.map(d => (
                <div
                  key={d.date}
                  className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: `1px solid ${S.border}` }}
                >
                  <div>
                    <p className="text-sm font-semibold capitalize" style={{ color: S.text }}>{d.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: S.sub }}>
                      {d.orders} pedidos · {d.delivered} entregados
                    </p>
                  </div>
                  <p className="text-xl font-black" style={{ color: S.accent }}>${d.revenue.toFixed(0)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
