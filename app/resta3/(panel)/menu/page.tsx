'use client'
// Edición del menú para RESTA3: crear, editar, activar/desactivar y eliminar platillos.
import { useState, useEffect } from 'react'
import Resta3Nav from '@/app/components/Resta3Nav'
import { Icon } from '@/app/components/Icon'

interface MenuItem {
  id: string; name: string; description: string; price: number
  category: string; imageUrl?: string; available: boolean; likes: number
}

interface EditState { name: string; description: string; price: string; category: string; imageUrl: string }

const EMPTY_FORM = { name: '', description: '', price: '', category: '', imageUrl: '', available: true }

const S = {
  bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)',
  text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)', input: 'var(--ad-elevated)',
}
const INPUT_CLS = 'w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors'

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/menu/upload', { method: 'POST', body: fd })
  if (!res.ok) return null
  return (await res.json()).url
}

function ImagePicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try { const url = await uploadImage(file); if (url) onChange(url) }
    finally { setUploading(false); e.target.value = '' }
  }
  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFile}
        className={INPUT_CLS + ' file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold'}
        style={{ backgroundColor: S.input, color: S.text, border: `1px solid ${S.border}` }} />
      {uploading && <p className="text-xs mt-1" style={{ color: S.accent }}>Subiendo imagen...</p>}
      {value && (
        <div className="mt-2 flex items-center gap-2">
          <img src={value} alt="preview" className="h-16 rounded-xl object-cover" />
          <button type="button" onClick={() => onChange('')} className="text-xs underline" style={{ color: '#f87171' }}>Quitar</button>
        </div>
      )}
    </div>
  )
}

export default function Resta3MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ name: '', description: '', price: '', category: '', imageUrl: '' })
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    try { const res = await fetch('/api/menu'); if (res.ok) setItems(await res.json()) }
    finally { setLoading(false) }
  }

  async function createItem() {
    if (!form.name.trim() || !form.category.trim() || !form.price) {
      setFormError('Nombre, categoría y precio son obligatorios.'); return
    }
    setFormError(''); setSaving(true)
    try {
      const res = await fetch('/api/menu', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim(), price: parseFloat(form.price), category: form.category.trim(), imageUrl: form.imageUrl || undefined, available: form.available }),
      })
      if (res.ok) { setForm(EMPTY_FORM); fetchItems() }
    } finally { setSaving(false) }
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id)
    setEditState({ name: item.name, description: item.description, price: String(item.price), category: item.category, imageUrl: item.imageUrl ?? '' })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/menu/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editState.name.trim(), description: editState.description.trim(), price: parseFloat(editState.price), category: editState.category.trim(), imageUrl: editState.imageUrl || undefined }),
      })
      if (res.ok) { setEditingId(null); fetchItems() }
    } finally { setSaving(false) }
  }

  async function toggleAvailable(item: MenuItem) {
    await fetch(`/api/menu/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ available: !item.available }) })
    fetchItems()
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return
    await fetch(`/api/menu/${id}`, { method: 'DELETE' }); fetchItems()
  }

  const grouped: Record<string, MenuItem[]> = {}
  for (const item of items) { if (!grouped[item.category]) grouped[item.category] = []; grouped[item.category].push(item) }

  const inputStyle = { backgroundColor: S.input, color: S.text, border: `1px solid ${S.border}` }

  return (
    <div className="min-h-screen md:ml-[240px]" style={{ backgroundColor: S.bg }}>
      <Resta3Nav />
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-black" style={{ color: S.text }}>Menú</h1>

        {/* Formulario añadir */}
        <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <h2 className="font-bold text-lg" style={{ color: S.accent }}>Añadir producto</h2>
          {formError && (
            <div className="border rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5' }}>
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Nombre *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Café Americano" className={INPUT_CLS} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Categoría *</label>
              <input type="text" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                placeholder="Ej. Bebidas calientes" className={INPUT_CLS} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Precio *</label>
              <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="0.00" min="0" step="0.01" className={INPUT_CLS} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Imagen (opcional)</label>
              <ImagePicker value={form.imageUrl} onChange={url => setForm(p => ({ ...p, imageUrl: url }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Descripción</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Descripción del producto..." rows={2} className={INPUT_CLS + ' resize-none'} style={inputStyle} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="avail-new" checked={form.available}
              onChange={e => setForm(p => ({ ...p, available: e.target.checked }))}
              className="w-4 h-4" style={{ accentColor: 'var(--ad-accent)' }} />
            <label htmlFor="avail-new" className="text-sm font-medium" style={{ color: S.text }}>Disponible</label>
          </div>
          <button onClick={createItem} disabled={saving}
            className="w-full font-bold py-3 rounded-xl disabled:opacity-60 transition-colors"
            style={{ backgroundColor: S.accent, color: '#000' }}>
            {saving ? 'Guardando...' : '+ Añadir producto'}
          </button>
        </div>

        {/* Lista por categoría */}
        {loading ? (
          <div className="text-center py-10" style={{ color: S.accent }}>Cargando...</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-10" style={{ color: S.sub }}>
            <span className="mb-2"><Icon name="utensils" size={34} /></span>
            <p>No hay productos en el menú aún</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, catItems]) => (
            <div key={category} className="space-y-3">
              <h2 className="font-bold text-lg pb-1" style={{ color: S.accent, borderBottom: `1px solid ${S.border}` }}>{category}</h2>
              {catItems.map(item => (
                <div key={item.id} className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                  {editingId === item.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Nombre</label>
                          <input type="text" value={editState.name} onChange={e => setEditState(p => ({ ...p, name: e.target.value }))} className={INPUT_CLS} style={inputStyle} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Categoría</label>
                          <input type="text" value={editState.category} onChange={e => setEditState(p => ({ ...p, category: e.target.value }))} className={INPUT_CLS} style={inputStyle} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Precio</label>
                          <input type="number" value={editState.price} onChange={e => setEditState(p => ({ ...p, price: e.target.value }))} min="0" step="0.01" className={INPUT_CLS} style={inputStyle} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Imagen</label>
                          <ImagePicker value={editState.imageUrl} onChange={url => setEditState(p => ({ ...p, imageUrl: url }))} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Descripción</label>
                        <textarea value={editState.description} onChange={e => setEditState(p => ({ ...p, description: e.target.value }))} rows={2} className={INPUT_CLS + ' resize-none'} style={inputStyle} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(item.id)} disabled={saving}
                          className="flex-1 font-bold py-2 rounded-xl text-sm disabled:opacity-60"
                          style={{ backgroundColor: S.accent, color: '#000' }}>
                          {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="flex-1 font-bold py-2 rounded-xl text-sm"
                          style={{ border: `1px solid ${S.border}`, color: S.sub, backgroundColor: 'transparent' }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start gap-3">
                        {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-xl shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold" style={{ color: S.text }}>{item.name}</h3>
                            <span className="text-sm font-bold" style={{ color: S.accent }}>${item.price.toFixed(2)}</span>
                            {item.available
                              ? <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--ad-accent) 15%, transparent)', color: 'var(--ad-accent)' }}>Disponible</span>
                              : <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}>No disponible</span>}
                          </div>
                          {item.description && <p className="text-sm mt-0.5 line-clamp-2" style={{ color: S.sub }}>{item.description}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => toggleAvailable(item)}
                          className="flex-1 py-1.5 rounded-xl text-sm font-medium"
                          style={{ border: item.available ? '1px solid rgba(251,146,60,0.4)' : `1px solid color-mix(in srgb, var(--ad-accent) 40%, transparent)`, color: item.available ? '#fb923c' : 'var(--ad-accent)', backgroundColor: 'transparent' }}>
                          {item.available ? 'Desactivar' : 'Activar'}
                        </button>
                        <button onClick={() => startEdit(item)}
                          className="flex-1 py-1.5 rounded-xl text-sm font-medium"
                          style={{ border: `1px solid ${S.border}`, color: S.text, backgroundColor: 'transparent' }}>
                          Editar
                        </button>
                        <button onClick={() => deleteItem(item.id)}
                          className="flex-1 py-1.5 rounded-xl text-sm font-medium"
                          style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', backgroundColor: 'transparent' }}>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
