'use client'

// Inventario con alertas de stock crítico/bajo. Datos demo; el botón "Reordenar"
// solo simula reabastecimiento en estado local (no persiste ni llama a ninguna API).
import { useState } from 'react'
import AdminNav from '@/app/components/AdminNav'

const S = {
  bg:     'var(--ad-bg)',
  card:   'var(--ad-card)',
  accent: 'var(--ad-accent)',
  text:   'var(--ad-text)',
  sub:    'var(--ad-sub)',
  border: 'var(--ad-border)',
}

interface InventoryItem {
  id: number; name: string; category: string; stock: number; unit: string
  minStock: number; cost: number; status: 'ok' | 'low' | 'critical'
}

const INVENTORY: InventoryItem[] = [
  { id: 1, name: 'Café Etiopía Yirgacheffe', category: 'Cafés',       stock: 3,   unit: 'kg',    minStock: 5,   cost: 450,  status: 'critical' },
  { id: 2, name: 'Café Colombia Huila',      category: 'Cafés',       stock: 8,   unit: 'kg',    minStock: 5,   cost: 380,  status: 'ok'       },
  { id: 3, name: 'Leche entera',             category: 'Lácteos',     stock: 20,  unit: 'lt',    minStock: 15,  cost: 25,   status: 'ok'       },
  { id: 4, name: 'Leche de avena',           category: 'Lácteos',     stock: 4,   unit: 'lt',    minStock: 8,   cost: 55,   status: 'low'      },
  { id: 5, name: 'Azúcar morena',            category: 'Insumos',     stock: 2,   unit: 'kg',    minStock: 3,   cost: 30,   status: 'critical' },
  { id: 6, name: 'Cacao en polvo',           category: 'Insumos',     stock: 1.5, unit: 'kg',    minStock: 2,   cost: 180,  status: 'low'      },
  { id: 7, name: 'Vasos 12oz',              category: 'Empaques',    stock: 200, unit: 'pzas',  minStock: 100, cost: 2.5,  status: 'ok'       },
  { id: 8, name: 'Vasos 16oz',              category: 'Empaques',    stock: 85,  unit: 'pzas',  minStock: 100, cost: 3,    status: 'low'      },
  { id: 9, name: 'Jarabe vainilla',         category: 'Jarabes',     stock: 2,   unit: 'lt',    minStock: 3,   cost: 95,   status: 'low'      },
  { id: 10,name: 'Jarabe caramelo',         category: 'Jarabes',     stock: 5,   unit: 'lt',    minStock: 3,   cost: 90,   status: 'ok'       },
]

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ok:       { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80', label: 'OK'      },
  low:      { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', label: 'Bajo'    },
  critical: { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', label: 'Crítico' },
}

function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
      <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: S.sub }}>{label}</p>
      <p className="text-2xl font-black" style={{ color: color ?? S.text }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: S.sub }}>{sub}</p>}
    </div>
  )
}

export default function AdminProduccionPage() {
  const [items, setItems] = useState<InventoryItem[]>(INVENTORY)
  const [filter, setFilter] = useState<'all' | 'low' | 'critical'>('all')

  const low = items.filter(i => i.status === 'low').length
  const critical = items.filter(i => i.status === 'critical').length
  const totalCost = items.reduce((s, i) => s + i.stock * i.cost, 0)
  const pending = items.filter(i => i.status !== 'ok').length

  const categories = [...new Set(items.map(i => i.category))]

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter)

  function reorder(id: number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, stock: i.minStock * 2, status: 'ok' as const } : i))
  }

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />

      <div className="max-w-3xl mx-auto p-4 space-y-5">
        <h1 className="text-xl font-black pt-1" style={{ color: S.text }}>Producción e Inventario</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPI label="Stock crítico" value={String(critical)} sub="reponer urgente" color="#f87171" />
          <KPI label="Stock bajo" value={String(low)} sub="próximo a agotar" color="#fbbf24" />
          <KPI label="Costo inventario" value={`$${totalCost.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`} sub="valor total" />
          <KPI label="OC pendientes" value={String(pending)} sub="por ordenar" color={S.accent} />
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {[
            { key: 'all',      label: 'Todos' },
            { key: 'low',      label: 'Bajo' },
            { key: 'critical', label: 'Crítico' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as typeof filter)}
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
              style={filter === f.key
                ? { backgroundColor: S.accent, color: '#000' }
                : { backgroundColor: 'var(--ad-overlay)', color: S.sub }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Inventory by category */}
        {categories.map(cat => {
          const catItems = filtered.filter(i => i.category === cat)
          if (catItems.length === 0) return null
          return (
            <div key={cat}>
              <h2 className="text-sm font-bold uppercase tracking-wide mb-2 pb-1"
                style={{ color: S.sub, borderBottom: `1px solid ${S.border}` }}>{cat}</h2>
              <div className="space-y-2">
                {catItems.map(item => {
                  const st = STATUS_STYLE[item.status]
                  const pct = Math.min((item.stock / (item.minStock * 2)) * 100, 100)
                  return (
                    <div key={item.id} className="rounded-2xl p-4"
                      style={{ backgroundColor: S.card, border: `1px solid ${item.status !== 'ok' ? st.color + '40' : S.border}` }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-bold text-sm" style={{ color: S.text }}>{item.name}</p>
                          <p className="text-xs" style={{ color: S.sub }}>${item.cost}/{item.unit}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-sm" style={{ color: item.status !== 'ok' ? st.color : S.text }}>
                            {item.stock} {item.unit}
                          </p>
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full mb-2" style={{ backgroundColor: 'var(--ad-border)' }}>
                        <div className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: item.status === 'ok' ? S.accent : st.color }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs" style={{ color: S.sub }}>Mínimo: {item.minStock} {item.unit}</p>
                        {item.status !== 'ok' && (
                          <button onClick={() => reorder(item.id)}
                            className="text-xs px-3 py-1 rounded-full font-bold"
                            style={{ backgroundColor: 'rgba(0,230,118,0.15)', color: S.accent }}>
                            Reordenar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
