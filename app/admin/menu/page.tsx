'use client'

import { useState, useEffect, useRef } from 'react'
import AdminNav from '@/app/components/AdminNav'
import { Icon } from '@/app/components/Icon'
import { uploadWebp, fmtBytes } from '@/lib/uploadWebp'

const S = {
  bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)',
  text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)',
}

const CATEGORIES = ['Platillos', 'Bebidas', 'Postres', 'Ensaladas', 'Entradas', 'Especiales']

// Texto negro o blanco según la luminancia del acento, para que los botones
// con fondo de acento nunca queden con texto invisible (ej. acento blanco o negro).
function contrastText(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#000'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#000' : '#fff'
}

interface MenuItem {
  id: string; name: string; description: string; price: number
  category: string; imageUrl?: string; available: boolean; likes: number
}

const EMPTY = { name: '', description: '', price: '', category: 'Platillos', imageUrl: '', available: true }

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showPersonalizacion, setShowPersonalizacion] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imgSize, setImgSize] = useState<{ original: number; webp: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [menuLogo, setMenuLogo] = useState('')
  const [menuHover, setMenuHover] = useState('#B90F45')
  const [menuBg, setMenuBg] = useState('#000000')
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [uploadingMenuLogo, setUploadingMenuLogo] = useState(false)
  const menuLogoRef = useRef<HTMLInputElement>(null)

  const [carousel, setCarousel] = useState<{ imageUrl: string; linkUrl: string }[]>([])
  const [uploadingSlide, setUploadingSlide] = useState(false)
  const [savingCarousel, setSavingCarousel] = useState(false)
  const [savedCarousel, setSavedCarousel] = useState(false)
  const [carouselError, setCarouselError] = useState('')
  const carouselFileRef = useRef<HTMLInputElement>(null)

  // Hex real detrás de --ad-accent (menuHover) — se usa para calcular texto
  // legible en los botones de acento en vez de asumir que siempre es oscuro.
  const accentHex = /^#[0-9a-fA-F]{6}$/.test(menuHover) ? menuHover : '#B90F45'

  async function load() {
    const r = await fetch('/api/menu')
    if (r.ok) setItems(await r.json())
    setLoading(false)
  }

  useEffect(() => { queueMicrotask(load) }, [])

  useEffect(() => {
    const get = (k: string) => fetch(`/api/settings?key=${k}`).then(r => r.json()).catch(() => ({}))
    get('menu_logo').then(d => { if (d.value) setMenuLogo(d.value) })
    get('menu_hover_color').then(d => { if (d.value) setMenuHover(d.value) })
    get('menu_bg_color').then(d => { if (d.value) setMenuBg(d.value) })
    get('menu_carousel').then(d => { if (d.value) { try { setCarousel(JSON.parse(d.value)) } catch {} } })
  }, [])

  async function saveMenuSetting(key: string, value: string): Promise<boolean> {
    try {
      const r = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) })
      return r.ok
    } catch {
      return false
    }
  }

  async function saveColor(key: string, value: string) {
    setSavingKey(key)
    await saveMenuSetting(key, value)
    setSavingKey(null); setSavedKey(key)
    setTimeout(() => setSavedKey(null), 2000)
  }

  async function uploadMenuLogo(file: File) {
    setUploadingMenuLogo(true)
    const url = await uploadWebp(file, '/api/settings/upload')
    if (url) { setMenuLogo(url); await saveMenuSetting('menu_logo', url) }
    setUploadingMenuLogo(false)
  }

  async function addSlide(file: File) {
    setUploadingSlide(true)
    const url = await uploadWebp(file, '/api/settings/upload')
    if (url) setCarousel(prev => [...prev, { imageUrl: url, linkUrl: '' }])
    setUploadingSlide(false)
  }

  function updateSlideUrl(i: number, linkUrl: string) {
    setCarousel(prev => prev.map((s, idx) => idx === i ? { ...s, linkUrl } : s))
  }

  function removeSlide(i: number) {
    setCarousel(prev => prev.filter((_, idx) => idx !== i))
  }

  async function saveCarousel() {
    setSavingCarousel(true)
    setCarouselError('')
    const ok = await saveMenuSetting('menu_carousel', JSON.stringify(carousel))
    setSavingCarousel(false)
    if (ok) {
      setSavedCarousel(true)
      setTimeout(() => setSavedCarousel(false), 2000)
    } else {
      setCarouselError('No se pudo guardar. Verifica tu sesión e intenta de nuevo.')
    }
  }

  const renderColorRow = (label: string, value: string, setValue: (v: string) => void, key: string) => (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
          onChange={e => setValue(e.target.value)}
          className="w-12 h-11 rounded-2xl cursor-pointer bg-transparent shrink-0"
          style={{ border: `1px solid ${S.border}` }} />
        <input type="text" value={value} onChange={e => setValue(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none font-mono"
          style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
        <button onClick={() => saveColor(key, value)} disabled={savingKey === key}
          className="px-4 py-2 rounded-2xl text-sm font-bold shrink-0"
          style={{ backgroundColor: savedKey === key ? 'rgba(0,230,118,.2)' : `${S.accent}22`, color: savedKey === key ? '#4ade80' : contrastText(accentHex) }}>
          {savingKey === key ? '...' : savedKey === key ? <Icon name="check" size={15} /> : 'Guardar'}
        </button>
      </div>
    </div>
  )

  const ranked = [...items].filter(i => (i.likes ?? 0) > 0).sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
  const maxLikes = ranked.length > 0 ? ranked[0].likes : 1

  function openNew() { setEditing(null); setForm(EMPTY); setShowForm(true) }
  function openEdit(p: MenuItem) {
    setEditing(p.id)
    setForm({ name: p.name, description: p.description, price: String(p.price), category: p.category, imageUrl: p.imageUrl ?? '', available: p.available })
    setShowForm(true)
  }

  async function uploadImage(file: File) {
    setUploading(true); setImgSize(null)
    const url = await uploadWebp(file, '/api/menu/upload', (original, webp) => setImgSize({ original, webp }))
    if (url) setForm(p => ({ ...p, imageUrl: url }))
    setUploading(false)
  }

  async function save() {
    if (!form.name.trim() || !form.price) return
    setSaving(true)
    const body = { name: form.name.trim(), description: form.description.trim(), price: Number(form.price), category: form.category, imageUrl: form.imageUrl || undefined, available: form.available }
    if (editing) {
      await fetch(`/api/menu/${editing}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/menu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false); setShowForm(false); load()
  }

  async function toggleAvailable(p: MenuItem) {
    await fetch(`/api/menu/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ available: !p.available }) })
    load()
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este platillo?')) return
    await fetch(`/api/menu/${id}`, { method: 'DELETE' })
    load()
  }

  const inp = 'w-full px-4 py-3 rounded-2xl text-sm outline-none'
  const inpStyle = { backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />
      <div className="max-w-[1200px] mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          <div>
            <h1 className="text-xl font-black" style={{ color: S.text }}>Menú Inteligente</h1>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>Agregar, editar y controlar disponibilidad</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowPersonalizacion(true)}
              className="text-sm px-4 py-2 rounded-xl font-bold"
              style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }}>
              Personalización
            </button>
            <button onClick={openNew}
              className="text-sm px-4 py-2 rounded-xl font-bold"
              style={{ backgroundColor: S.accent, color: contrastText(accentHex) }}>
              + Nuevo platillo
            </button>
          </div>
        </div>

        {/* Ranking */}
        {!loading && ranked.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="font-bold text-sm" style={{ color: S.text }}>Ranking — Platillos más gustados</span>
            </div>
            <div className="px-5 py-5 space-y-3">
              {ranked.slice(0, 5).map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ backgroundColor: idx === 0 ? 'rgba(245,158,11,0.18)' : 'var(--ad-border)', color: idx === 0 ? '#f59e0b' : S.sub }}>{idx + 1}</span>
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: S.text }}>{item.name}</p>
                    <div className="h-1.5 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: 'var(--ad-border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${((item.likes ?? 0) / maxLikes) * 100}%`, backgroundColor: '#f472b6' }} />
                    </div>
                  </div>
                  <span className="text-sm font-black shrink-0 inline-flex items-center gap-1" style={{ color: '#f472b6' }}><Icon name="heart" size={13} /> {item.likes}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-5 py-8 text-center text-sm" style={{ color: S.sub }}>Cargando...</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                    {['Platillo', 'Categoría', 'Precio', 'Likes', 'Estado', 'Acciones'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: S.sub }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(p => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${S.border}` }} className="hover:bg-white/[.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                            : <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: S.bg, color: S.sub }}><Icon name="utensils" size={18} /></div>
                          }
                          <div>
                            <p className="font-bold" style={{ color: S.text }}>{p.name}</p>
                            {p.description && <p className="text-xs truncate max-w-[180px]" style={{ color: S.sub }}>{p.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: S.sub }}>{p.category}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: S.text }}>${p.price.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span style={{ color: (p.likes ?? 0) > 0 ? '#f472b6' : S.sub }}>
                          {(p.likes ?? 0) > 0 ? <span className="inline-flex items-center gap-1"><Icon name="heart" size={12} /> {p.likes}</span> : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleAvailable(p)}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold transition-all"
                          style={p.available
                            ? { backgroundColor: 'rgba(0,230,118,.12)', color: '#4ade80' }
                            : { backgroundColor: 'rgba(239,68,68,.12)', color: '#f87171' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.available ? '#4ade80' : '#f87171' }} />
                          {p.available ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(p)}
                            className="px-3 py-1 rounded-lg text-xs font-bold"
                            style={{ backgroundColor: `${S.accent}20`, color: contrastText(accentHex) }}>Editar</button>
                          <button onClick={() => remove(p.id)}
                            className="px-3 py-1 rounded-lg text-xs font-bold"
                            style={{ backgroundColor: 'rgba(239,68,68,.12)', color: '#f87171' }}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Nuevo / Editar platillo */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
            style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black" style={{ color: S.text }}>{editing ? 'Editar platillo' : 'Nuevo platillo'}</h2>
              <button onClick={() => setShowForm(false)} aria-label="Cerrar" style={{ color: S.sub }}><Icon name="x" size={18} /></button>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: S.sub }}>Imagen</label>
              <div className="flex items-center gap-3">
                {form.imageUrl
                  ? <img src={form.imageUrl} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                  : <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: S.bg, color: S.sub }}><Icon name="utensils" size={24} /></div>
                }
                <div className="flex-1">
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-full py-2.5 rounded-2xl text-sm font-bold border-dashed border-2 transition-all"
                    style={{ borderColor: S.border, color: S.sub }}>
                    {uploading ? 'Convirtiendo y subiendo...' : 'Subir imagen'}
                  </button>
                  {imgSize && (
                    <p className="text-xs mt-1.5 text-center" style={{ color: S.sub }}>
                      {fmtBytes(imgSize.original)} → WebP {fmtBytes(imgSize.webp)}
                      {' '}
                      <span style={{ color: imgSize.webp < imgSize.original ? '#4ade80' : S.sub }}>
                        ({imgSize.webp < imgSize.original
                          ? `−${Math.round((1 - imgSize.webp / imgSize.original) * 100)}%`
                          : `+${Math.round((imgSize.webp / imgSize.original - 1) * 100)}%`})
                      </span>
                    </p>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              </div>
            </div>
            <div>
              <label htmlFor="dish-name" className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Nombre *</label>
              <input id="dish-name" name="dish_name" autoComplete="off" className={inp} style={inpStyle}
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Salmon Bowl" />
            </div>
            <div>
              <label htmlFor="dish-description" className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Descripción</label>
              <textarea id="dish-description" name="dish_description" className={`${inp} resize-none`} style={inpStyle}
                rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripción del platillo..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="dish-price" className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Precio *</label>
                <input id="dish-price" name="dish_price" type="number" className={inp} style={inpStyle}
                  value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="150" />
              </div>
              <div>
                <label htmlFor="dish-category" className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Categoría</label>
                <select id="dish-category" name="dish_category" className={inp} style={inpStyle}
                  value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" checked={form.available} onChange={e => setForm(p => ({ ...p, available: e.target.checked }))} className="sr-only" />
                <div className="w-10 h-6 rounded-full transition-all" style={{ backgroundColor: form.available ? S.accent : S.border }}>
                  <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all" style={{ left: form.available ? '22px' : '4px' }} />
                </div>
              </div>
              <span className="text-sm font-bold" style={{ color: S.text }}>Disponible en menú</span>
            </label>
            <button onClick={save} disabled={saving || !form.name.trim() || !form.price}
              className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-50"
              style={{ backgroundColor: S.accent, color: contrastText(accentHex) }}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear platillo'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Personalización */}
      {showPersonalizacion && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
            style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black" style={{ color: S.text }}>Personalización del menú</h2>
              <button onClick={() => setShowPersonalizacion(false)} aria-label="Cerrar" style={{ color: S.sub }}><Icon name="x" size={18} /></button>
            </div>

            <p className="text-xs" style={{ color: S.sub }}>Logo y colores de la página pública /menu</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Logo del menú</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
                    style={{ backgroundColor: menuBg || '#000', border: `1px solid ${S.border}` }}>
                    <img src={menuLogo || '/logo.png'} alt="logo" className="w-12 h-12 object-contain" />
                  </div>
                  <button onClick={() => menuLogoRef.current?.click()} disabled={uploadingMenuLogo}
                    className="flex-1 py-2.5 rounded-2xl text-sm font-bold border-dashed border-2"
                    style={{ borderColor: S.border, color: S.sub }}>
                    {uploadingMenuLogo ? 'Subiendo...' : menuLogo ? 'Cambiar logo' : 'Subir logo'}
                  </button>
                  <input ref={menuLogoRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadMenuLogo(f); e.target.value = '' }} />
                </div>
              </div>
              {renderColorRow('Color de los botones (hover/activo)', menuHover, setMenuHover, 'menu_hover_color')}
              {renderColorRow('Color de fondo', menuBg, setMenuBg, 'menu_bg_color')}
              <div className="rounded-2xl p-4" style={{ backgroundColor: menuBg, border: `1px solid ${S.border}` }}>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: S.sub }}>Vista previa</p>
                <div className="space-y-1.5">
                  <div className="rounded-lg px-3 py-2 text-sm font-bold" style={{ backgroundColor: menuHover, color: contrastText(accentHex) }}>Botón activo</div>
                </div>
              </div>
            </div>

            {/* Carrusel */}
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${S.border}` }}>
              <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: `1px solid ${S.border}`, backgroundColor: S.bg }}>
                <div>
                  <p className="font-bold text-sm" style={{ color: S.text }}>Carrusel de imágenes</p>
                  <p className="text-xs mt-0.5" style={{ color: S.sub }}>Imágenes 16:6 que rotan en /menu.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => carouselFileRef.current?.click()} disabled={uploadingSlide}
                    className="text-sm px-4 py-2 rounded-xl font-bold"
                    style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }}>
                    {uploadingSlide ? 'Subiendo...' : '+ Imagen'}
                  </button>
                  <button onClick={saveCarousel} disabled={savingCarousel}
                    className="text-sm px-4 py-2 rounded-xl font-bold"
                    style={{ backgroundColor: savedCarousel ? 'rgba(0,230,118,.2)' : S.accent, color: savedCarousel ? '#4ade80' : contrastText(accentHex) }}>
                    {savingCarousel ? '...' : savedCarousel ? <span className="inline-flex items-center justify-center gap-1.5"><Icon name="check" size={14} /> Guardado</span> : 'Guardar carrusel'}
                  </button>
                </div>
                <input ref={carouselFileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) addSlide(f); e.target.value = '' }} />
              </div>
              {carouselError && (
                <div className="px-5 py-2 text-xs font-semibold" style={{ backgroundColor: 'rgba(239,68,68,.1)', color: '#f87171' }}>
                  {carouselError}
                </div>
              )}
              <div className="p-5" style={{ backgroundColor: S.bg }}>
                {carousel.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: S.sub }}>Sin imágenes. Usa &quot;+ Imagen&quot; para subir la primera.</p>
                ) : (
                  <div className="space-y-3">
                    {carousel.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                        <div className="w-28 rounded-xl overflow-hidden shrink-0" style={{ aspectRatio: '16 / 6', backgroundColor: '#000' }}>
                          <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>URL de destino (opcional)</label>
                          <input type="url" value={s.linkUrl} onChange={e => updateSlideUrl(i, e.target.value)}
                            placeholder="https://…"
                            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                            style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }} />
                        </div>
                        <button onClick={() => removeSlide(i)}
                          className="px-3 py-2 rounded-xl text-xs font-bold shrink-0"
                          style={{ backgroundColor: 'rgba(239,68,68,.12)', color: '#f87171' }}>Eliminar</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
