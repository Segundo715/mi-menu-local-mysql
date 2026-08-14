'use client'

// Inventario CRUD conectado a Supabase (tabla inventory). Alerta visual cuando stock < minStock.
import { useState, useEffect } from 'react'
import Resta3Nav from '@/app/components/Resta3Nav'
import { Icon } from '@/app/components/Icon'

const S = { bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)', text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)' }

interface Item { id: string; name: string; category: string; stock: number; minStock: number; unit: string; cost: number; updatedAt: string }

export default function InventarioPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('Todos')
  const [filter, setFilter] = useState<'todos' | 'bajo' | 'ok'>('todos')
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', category: '', stock: '', minStock: '', unit: 'pz', cost: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const r = await fetch('/api/resta3/inventory')
    if (r.ok) setItems(await r.json())
    setLoading(false)
  }

  useEffect(() => { queueMicrotask(load) }, [])

  const cats = ['Todos', ...Array.from(new Set(items.map(i => i.category))).sort()]

  const displayed = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = cat === 'Todos' || i.category === cat
    const matchFilter = filter === 'todos' ? true : filter === 'bajo' ? i.stock <= i.minStock : i.stock > i.minStock
    return matchSearch && matchCat && matchFilter
  })

  async function adjustStock(id: string, delta: number) {
    setAdjusting(id)
    await fetch(`/api/resta3/inventory/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockDelta: delta }),
    })
    await load()
    setAdjusting(null)
  }

  async function saveNew() {
    if (!form.name.trim()) return
    setSaving(true)
    await fetch('/api/resta3/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.trim(), category: form.category || 'General', stock: Number(form.stock), minStock: Number(form.minStock), unit: form.unit, cost: Number(form.cost) }),
    })
    setSaving(false)
    setShowForm(false)
    setForm({ name: '', category: '', stock: '', minStock: '', unit: 'pz', cost: '' })
    load()
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar este producto?')) return
    await fetch(`/api/resta3/inventory/${id}`, { method: 'DELETE' })
    load()
  }

  const lowStock = items.filter(i => i.stock <= i.minStock).length
  const totalValue = items.reduce((s, i) => s + i.stock * i.cost, 0)

  return (
    <div className="min-h-screen md:ml-[240px]" style={{ backgroundColor: S.bg }}>
      <Resta3Nav />
      <div className="max-w-[1000px] mx-auto p-4 space-y-4">

        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-black" style={{ color: S.text }}>Inventario</h1>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>{items.length} productos</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: S.accent, color: '#fff' }}>
            + Agregar producto
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <p className="text-xl font-black" style={{ color: S.accent }}>{items.length}</p>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>Productos</p>
          </div>
          <button onClick={() => setFilter(filter === 'bajo' ? 'todos' : 'bajo')}
            className="rounded-2xl p-4 text-center transition-all"
            style={{ backgroundColor: S.card, border: `1px solid ${filter === 'bajo' ? 'rgba(239,68,68,0.4)' : S.border}` }}>
            <p className="text-xl font-black" style={{ color: '#f87171' }}>{lowStock}</p>
            <p className="text-xs mt-0.5 inline-flex items-center gap-1" style={{ color: S.sub }}>Stock bajo <Icon name="alert" size={12} /></p>
          </button>
          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <p className="text-xl font-black" style={{ color: '#22c55e' }}>${totalValue.toLocaleString()}</p>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>Valor almacén</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            className="flex-1 min-w-[140px] px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }} />
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={cat === c ? { backgroundColor: `${S.accent}22`, color: S.accent, border: `1px solid ${S.accent}44` } : { backgroundColor: S.card, color: S.sub, border: `1px solid ${S.border}` }}>
              {c}
            </button>
          ))}
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: S.sub }}>Cargando...</div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                    {['Producto', 'Categoría', 'Stock', 'Mínimo', 'Costo', 'Ajustar', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: S.sub }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(item => {
                    const low = item.stock <= item.minStock
                    return (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${S.border}` }} className="hover:bg-white/[.02]">
                        <td className="px-4 py-3 font-bold" style={{ color: S.text }}>{item.name}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: S.sub }}>{item.category}</td>
                        <td className="px-4 py-3">
                          <span className="font-black" style={{ color: low ? '#f87171' : '#22c55e' }}>
                            {item.stock} {item.unit}
                          </span>
                          {low && <span className="ml-1 inline-flex align-middle" style={{ color: '#f87171' }}><Icon name="alert" size={12} /></span>}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: S.sub }}>{item.minStock} {item.unit}</td>
                        <td className="px-4 py-3 font-bold" style={{ color: S.accent }}>${item.cost}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => adjustStock(item.id, -1)} disabled={adjusting === item.id}
                              className="w-7 h-7 rounded-lg font-black flex items-center justify-center"
                              style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171' }}>−</button>
                            <button onClick={() => adjustStock(item.id, 1)} disabled={adjusting === item.id}
                              className="w-7 h-7 rounded-lg font-black flex items-center justify-center"
                              style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>+</button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => deleteItem(item.id)} aria-label="Eliminar" className="px-2 py-1 rounded-lg inline-flex items-center"
                            style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#f87171' }}><Icon name="trash" size={14} /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal nuevo producto */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
            style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <div className="flex items-center justify-between">
              <h2 className="font-black" style={{ color: S.text }}>Nuevo producto</h2>
              <button onClick={() => setShowForm(false)} aria-label="Cerrar" style={{ color: S.sub }}><Icon name="x" size={18} /></button>
            </div>
            {[
              { key: 'name', label: 'Nombre *', placeholder: 'Ej: Pollo (kg)' },
              { key: 'category', label: 'Categoría', placeholder: 'Ej: Carnes' },
              { key: 'unit', label: 'Unidad', placeholder: 'kg, pz, lt...' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>{f.label}</label>
                <input value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'stock', label: 'Stock inicial' },
                { key: 'minStock', label: 'Mínimo' },
                { key: 'cost', label: 'Costo unit.' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>{f.label}</label>
                  <input type="number" value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder="0" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
                </div>
              ))}
            </div>
            <button onClick={saveNew} disabled={saving || !form.name.trim()}
              className="w-full py-3 rounded-xl font-black text-sm disabled:opacity-50"
              style={{ backgroundColor: S.accent, color: '#fff' }}>
              {saving ? 'Guardando...' : 'Agregar producto'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
