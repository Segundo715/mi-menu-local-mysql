'use client'

import { useState, useEffect, useRef } from 'react'
import AdminNav from '@/app/components/AdminNav'
import { Icon } from '@/app/components/Icon'
import { uploadWebp } from '@/lib/uploadWebp'

const S = {
  bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)',
  text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)',
}

interface Recipe {
  id: string
  name: string
  description: string
  category: string
  ingredients: string[]
  steps: string[]
  imageUrl?: string
  createdAt: string
}

const EMPTY = { name: '', description: '', category: 'General', ingredients: [''], steps: [''], imageUrl: '' }

export default function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Recipe | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const cardFileRef = useRef<HTMLInputElement>(null)
  const pendingCardId = useRef<string | null>(null)

  // Personalización de /resetas (color y logo)
  const [brandOpen, setBrandOpen] = useState(false)
  const [brandColor, setBrandColor] = useState('#B90F45')
  const [brandLogo, setBrandLogo] = useState('')
  const [savingColor, setSavingColor] = useState(false)
  const [savedColor, setSavedColor] = useState(false)
  const [uploadingBrandLogo, setUploadingBrandLogo] = useState(false)
  const brandLogoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/settings?key=recetario_color').then(r => r.json()).then(d => { if (d.value) setBrandColor(d.value) }).catch(() => {})
    fetch('/api/settings?key=recetario_logo').then(r => r.json()).then(d => { if (d.value) setBrandLogo(d.value) }).catch(() => {})
  }, [])

  async function saveBrand(key: string, value: string) {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) })
  }

  async function saveBrandColor() {
    setSavingColor(true)
    await saveBrand('recetario_color', brandColor)
    setSavingColor(false)
    setSavedColor(true)
    setTimeout(() => setSavedColor(false), 2000)
  }

  async function uploadBrandLogo(file: File) {
    setUploadingBrandLogo(true)
    const url = await uploadWebp(file, '/api/settings/upload')
    if (url) { setBrandLogo(url); await saveBrand('recetario_logo', url) }
    setUploadingBrandLogo(false)
  }

  async function load() {
    const r = await fetch('/api/recipes')
    setRecipes(await r.json())
    setLoading(false)
  }

  useEffect(() => { queueMicrotask(load) }, [])

  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase())
  )

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setShowForm(true)
    setSelected(null)
  }

  function openEdit(r: Recipe) {
    setEditing(r.id)
    setForm({
      name: r.name, description: r.description, category: r.category,
      ingredients: r.ingredients.length ? r.ingredients : [''],
      steps: r.steps.length ? r.steps : [''],
      imageUrl: r.imageUrl ?? '',
    })
    setShowForm(true)
    setSelected(null)
  }

  async function uploadImage(file: File) {
    setUploading(true)
    const url = await uploadWebp(file, '/api/recipes/upload')
    if (url) setForm(p => ({ ...p, imageUrl: url }))
    setUploading(false)
  }

  async function uploadCardImage(file: File, recipeId: string) {
    setUploadingCardId(recipeId)
    const url = await uploadWebp(file, '/api/recipes/upload')
    if (url) {
      await fetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      })
      load()
    }
    setUploadingCardId(null)
  }

  function triggerCardUpload(recipeId: string) {
    pendingCardId.current = recipeId
    cardFileRef.current?.click()
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const body = {
      ...form,
      ingredients: form.ingredients.filter(Boolean),
      steps: form.steps.filter(Boolean),
      imageUrl: form.imageUrl || undefined,
    }
    if (editing) {
      await fetch(`/api/recipes/${editing}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function seedExamples() {
    if (!confirm('Se crearán las recetas del catálogo de /resetas que falten y se rellenarán con ingredientes y pasos de ejemplo las que estén vacías. No se sobrescribe nada de lo ya capturado. ¿Continuar?')) return
    setSeeding(true)
    const r = await fetch('/api/recipes/seed', { method: 'POST' })
    const d = await r.json()
    setSeeding(false)
    if (r.ok) {
      alert(`Listo: ${d.created} receta(s) creada(s) y ${d.updated} actualizada(s).`)
      load()
    } else {
      alert(d.error ?? 'Error al cargar las recetas')
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar esta receta?')) return
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' })
    setSelected(null)
    load()
  }

  function listField(arr: string[], onChange: (v: string[]) => void, placeholder: string) {
    return (
      <div className="space-y-1.5">
        {arr.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input value={v} onChange={e => { const n = [...arr]; n[i] = e.target.value; onChange(n) }}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
            {arr.length > 1 && (
              <button onClick={() => onChange(arr.filter((_, j) => j !== i))} aria-label="Quitar"
                className="px-2.5 rounded-xl inline-flex items-center"
                style={{ backgroundColor: 'rgba(239,68,68,.12)', color: '#f87171' }}><Icon name="x" size={14} /></button>
            )}
          </div>
        ))}
        <button onClick={() => onChange([...arr, ''])}
          className="text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: `${S.accent}22`, color: S.accent }}>
          + Agregar
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />

      {/* Input oculto para subir imagen directo desde tarjeta */}
      <input ref={cardFileRef} type="file" accept="image/*" className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file && pendingCardId.current) uploadCardImage(file, pendingCardId.current)
          e.target.value = ''
        }} />

      <div className="max-w-[1000px] mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-black" style={{ color: S.text }}>Recetario</h1>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>{recipes.length} receta{recipes.length !== 1 ? 's' : ''} en total</p>
          </div>
          <div className="flex gap-2">
            <a href="/resetas" target="_blank" rel="noopener noreferrer"
              className="text-sm px-4 py-2 rounded-xl font-bold"
              style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }}>
              Ver recetario ↗
            </a>
            <button onClick={seedExamples} disabled={seeding}
              className="text-sm px-4 py-2 rounded-xl font-bold disabled:opacity-60"
              style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }}>
              {seeding ? 'Cargando...' : 'Cargar ejemplos'}
            </button>
            <button onClick={openNew} className="text-sm px-4 py-2 rounded-xl font-bold"
              style={{ backgroundColor: S.accent, color: '#000' }}>
              + Nueva receta
            </button>
          </div>
        </div>

        {/* Personalización del recetario (/resetas) */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <button onClick={() => setBrandOpen(o => !o)}
            className="w-full px-5 py-4 flex items-center justify-between text-left transition-colors hover:bg-white/[.03]"
            style={{ borderBottom: brandOpen ? `1px solid ${S.border}` : 'none' }}>
            <div>
              <p className="font-bold text-sm" style={{ color: S.text }}>Personalización del recetario</p>
              <p className="text-xs mt-0.5" style={{ color: S.sub }}>Color y logo que se muestran en la página pública /resetas</p>
            </div>
            <span className={`transition-transform duration-200 shrink-0 ml-3 ${brandOpen ? 'rotate-180' : ''}`} style={{ color: S.sub }}>
              <Icon name="chevronDown" size={18} />
            </span>
          </button>
          {brandOpen && <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Color */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Color del recetario</label>
              <div className="flex items-center gap-2">
                <input type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : '#B90F45'}
                  onChange={e => setBrandColor(e.target.value)}
                  className="w-12 h-11 rounded-2xl cursor-pointer bg-transparent shrink-0"
                  style={{ border: `1px solid ${S.border}` }} />
                <input type="text" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                  placeholder="#B90F45"
                  className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none font-mono"
                  style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
                <button onClick={saveBrandColor} disabled={savingColor}
                  className="px-4 py-2 rounded-2xl text-sm font-bold shrink-0"
                  style={{ backgroundColor: savedColor ? 'rgba(0,230,118,.2)' : `${S.accent}22`, color: savedColor ? '#4ade80' : S.accent }}>
                  {savingColor ? '...' : savedColor ? <Icon name="check" size={15} /> : 'Guardar'}
                </button>
              </div>
              <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-bold"
                style={{ backgroundColor: brandColor, color: '#fff' }}>
                Vista previa
              </div>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Logo del recetario</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
                  <img src={brandLogo || '/logo.png'} alt="logo" className="w-12 h-12 object-contain" />
                </div>
                <button onClick={() => brandLogoRef.current?.click()} disabled={uploadingBrandLogo}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-bold border-dashed border-2"
                  style={{ borderColor: S.border, color: S.sub }}>
                  {uploadingBrandLogo ? 'Subiendo...' : brandLogo ? 'Cambiar logo' : 'Subir logo'}
                </button>
                <input ref={brandLogoRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadBrandLogo(f); e.target.value = '' }} />
              </div>
              <p className="text-xs mt-1" style={{ color: S.sub }}>PNG o SVG con fondo transparente recomendado</p>
            </div>

          </div>}
        </div>

        {/* Buscar */}
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar receta o categoría..."
          className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
          style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }} />

        {/* Grid */}
        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: S.sub }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 rounded-2xl text-sm"
            style={{ color: S.sub, backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            No hay recetas{search ? ' con ese filtro' : '. Crea la primera.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(r => (
              <div key={r.id} className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>

                {/* Imagen — clic para cambiarla */}
                <button
                  type="button"
                  onClick={() => triggerCardUpload(r.id)}
                  className="relative w-full group block"
                  title="Clic para cambiar imagen"
                  disabled={uploadingCardId === r.id}>
                  {r.imageUrl
                    ? <img src={r.imageUrl} alt={r.name} className="w-full object-cover" style={{ height: '160px' }} />
                    : <div className="w-full flex items-center justify-center"
                        style={{ height: '120px', backgroundColor: S.bg, color: S.sub }}><Icon name="camera" size={40} /></div>
                  }
                  {/* Overlay al hacer hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                    {uploadingCardId === r.id
                      ? <span className="text-white text-xs font-bold">Subiendo...</span>
                      : <span className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                          <Icon name="camera" size={13} /> {r.imageUrl ? 'Cambiar foto' : 'Agregar foto'}
                        </span>
                    }
                  </div>
                </button>

                {/* Info + acciones */}
                <div className="p-4">
                  <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${S.accent}22`, color: S.accent }}>{r.category}</span>
                  <p className="font-black text-sm mt-2" style={{ color: S.text }}>{r.name}</p>
                  {r.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: S.sub }}>{r.description}</p>}
                  <p className="text-xs mt-2" style={{ color: S.sub }}>{r.ingredients.length} ingredientes · {r.steps.length} pasos</p>

                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setSelected(r)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold"
                      style={{ backgroundColor: S.bg, color: S.sub, border: `1px solid ${S.border}` }}>
                      Ver
                    </button>
                    <button onClick={() => openEdit(r)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold"
                      style={{ backgroundColor: `${S.accent}22`, color: S.accent }}>
                      Editar
                    </button>
                    <button onClick={() => remove(r.id)}
                      className="px-3 py-2 rounded-xl text-xs font-bold"
                      style={{ backgroundColor: 'rgba(239,68,68,.12)', color: '#f87171' }} aria-label="Eliminar">
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal ver receta */}
      {selected && !showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }} onClick={() => setSelected(null)}>
          <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
            style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}
            onClick={e => e.stopPropagation()}>

            {selected.imageUrl
              ? <img src={selected.imageUrl} alt={selected.name} className="w-full object-cover rounded-t-3xl" style={{ height: '220px' }} />
              : <div className="w-full flex items-center justify-center rounded-t-3xl" style={{ height: '120px', backgroundColor: S.bg, color: S.sub }}><Icon name="book" size={40} /></div>
            }

            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${S.accent}22`, color: S.accent }}>{selected.category}</span>
                  <h2 className="text-xl font-black mt-1" style={{ color: S.text }}>{selected.name}</h2>
                  {selected.description && <p className="text-sm mt-1" style={{ color: S.sub }}>{selected.description}</p>}
                </div>
                <button onClick={() => setSelected(null)} aria-label="Cerrar" className="shrink-0 inline-flex items-center" style={{ color: S.sub }}><Icon name="x" size={18} /></button>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: S.accent }}>Ingredientes</p>
                <ul className="space-y-1">
                  {selected.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm" style={{ color: S.text }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: S.accent }} />{ing}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: S.accent }}>Preparación</p>
                <ol className="space-y-2">
                  {selected.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm" style={{ color: S.text }}>
                      <span className="font-black shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                        style={{ backgroundColor: S.accent, color: '#000' }}>{i + 1}</span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => openEdit(selected)}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold"
                  style={{ backgroundColor: `${S.accent}22`, color: S.accent }}>
                  Editar
                </button>
                <button onClick={() => remove(selected.id)}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold"
                  style={{ backgroundColor: 'rgba(239,68,68,.12)', color: '#f87171' }}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
            style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black" style={{ color: S.text }}>{editing ? 'Editar receta' : 'Nueva receta'}</h2>
              <button onClick={() => setShowForm(false)} aria-label="Cerrar" className="inline-flex items-center" style={{ color: S.sub }}><Icon name="x" size={18} /></button>
            </div>

            {/* Imagen */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: S.sub }}>Imagen</label>
              <div className="flex items-center gap-3">
                {form.imageUrl
                  ? <img src={form.imageUrl} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                  : <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: S.bg, color: S.sub }}><Icon name="camera" size={24} /></div>
                }
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-bold border-dashed border-2 transition-all"
                  style={{ borderColor: S.border, color: S.sub }}>
                  {uploading ? 'Subiendo...' : form.imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Nombre *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Tacos de Birria"
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Categoría</label>
              <input type="text" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                placeholder="Ej: Platillo principal, Bebida, Postre..."
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Descripción</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2} placeholder="Descripción breve de la receta..."
                className="w-full px-4 py-3 rounded-2xl text-sm resize-none outline-none"
                style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
            </div>

            {/* Ingredientes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: S.sub }}>Ingredientes</label>
              {listField(form.ingredients, v => setForm(p => ({ ...p, ingredients: v })), 'Ej: 500g de carne')}
            </div>

            {/* Pasos */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: S.sub }}>Pasos de preparación</label>
              {listField(form.steps, v => setForm(p => ({ ...p, steps: v })), 'Describe el paso...')}
            </div>

            <button onClick={save} disabled={saving || !form.name.trim()}
              className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-50"
              style={{ backgroundColor: S.accent, color: '#000' }}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear receta'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
