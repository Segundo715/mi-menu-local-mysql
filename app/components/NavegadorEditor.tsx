'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/app/components/Icon'
import { DEFAULT_NAV, normalizeNavConfig, BUILTIN_ICONS, type NavConfig, type NavTab } from '@/app/components/CustomerNav'
import { uploadWebp } from '@/lib/uploadWebp'

const S = {
  bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)',
  text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)',
}

const SETTINGS_KEY = 'customer_nav'

function IconPreview({ tab, size = 24 }: { tab: { id: string; icon: string }; size?: number }) {
  if (tab.icon) return <img src={tab.icon} alt="" style={{ width: size, height: size, objectFit: 'contain' }} />
  const inner = BUILTIN_ICONS[tab.id]
  if (inner) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: inner }} />
  )
  return <span className="rounded-full border-2 border-current" style={{ width: size * 0.75, height: size * 0.75, display: 'inline-block' }} />
}

export default function NavegadorEditor() {
  const [cfg, setCfg] = useState<NavConfig>(DEFAULT_NAV)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    fetch(`/api/settings?key=${SETTINGS_KEY}`)
      .then(r => r.json())
      .then(d => { if (d.value) { try { setCfg(normalizeNavConfig(JSON.parse(d.value))) } catch {} } })
      .catch(() => {})
  }, [])

  const set = (patch: Partial<NavConfig>) => setCfg(c => ({ ...c, ...patch }))
  const setColor = (k: 'bg' | 'accent' | 'inactive' | 'border', v: string) =>
    setCfg(c => ({ ...c, [k]: v }))

  function updateTab(idx: number, patch: Partial<NavTab>) {
    setCfg(c => ({ ...c, tabs: c.tabs.map((t, i) => i === idx ? { ...t, ...patch } : t) }))
  }
  function addTab() {
    setCfg(c => ({ ...c, tabs: [...c.tabs, { id: `tab${Date.now()}`, label: 'Nuevo', href: '/', icon: '' }] }))
  }
  function removeTab(idx: number) {
    setCfg(c => ({ ...c, tabs: c.tabs.filter((_, i) => i !== idx) }))
  }
  function moveTab(idx: number, dir: -1 | 1) {
    setCfg(c => {
      const next = [...c.tabs]
      const j = idx + dir
      if (j < 0 || j >= next.length) return c
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return { ...c, tabs: next }
    })
  }
  async function uploadIcon(idx: number, file: File) {
    setUploadingIdx(idx)
    try {
      const url = await uploadWebp(file, '/api/settings/upload')
      if (url) updateTab(idx, { icon: url })
    } finally { setUploadingIdx(null) }
  }
  async function save() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: SETTINGS_KEY, value: JSON.stringify(cfg) }),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const isFull = cfg.radius >= 100
  const previewItems = [...cfg.tabs, ...(cfg.showLogout ? [{ id: 'logout', label: 'Salir', href: '', icon: '' }] : [])]

  return (
    <div className="space-y-4">
      {/* Vista previa */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: S.sub }}>Vista previa</p>
        <div className="rounded-xl p-6" style={{ backgroundColor: '#000' }}>
          <div className="shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden max-w-lg mx-auto"
            style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: `${cfg.radius}px` }}>
            <div className="flex">
              {previewItems.map((t, i) => {
                const active = i === 0
                return (
                  <div key={t.id} className="flex-1 py-2.5 flex flex-col items-center gap-0.5 relative"
                    style={{ color: active ? cfg.accent : cfg.inactive }}>
                    {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: cfg.accent }} />}
                    <IconPreview tab={t} />
                    <span className="text-xs font-bold">{t.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: S.text }}>Botones</p>
          <button type="button" onClick={addTab}
            className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{ backgroundColor: S.accent, color: '#000' }}>
            + Agregar botón
          </button>
        </div>
        {cfg.tabs.map((tab, idx) => (
          <div key={tab.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
            <div className="flex flex-col items-center gap-1.5 shrink-0" style={{ color: S.text }}>
              <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ border: `1px solid ${S.border}` }}>
                <IconPreview tab={tab} size={26} />
              </div>
              <input ref={el => { fileRefs.current[idx] = el }} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadIcon(idx, f) }} />
              <button type="button" onClick={() => fileRefs.current[idx]?.click()} disabled={uploadingIdx === idx}
                className="text-[10px] font-bold underline" style={{ color: S.accent }}>
                {uploadingIdx === idx ? 'Subiendo...' : 'Subir icono'}
              </button>
              {tab.icon && (
                <button type="button" onClick={() => updateTab(idx, { icon: '' })}
                  className="text-[10px] font-semibold" style={{ color: S.sub }}>Quitar</button>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <input type="text" value={tab.label} onChange={e => updateTab(idx, { label: e.target.value })}
                placeholder="Etiqueta (ej. Menú)"
                className="w-full rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }} />
              <input type="text" value={tab.href} onChange={e => updateTab(idx, { href: e.target.value })}
                placeholder="Enlace (ej. /menu)"
                className="w-full rounded-lg px-3 py-2 text-sm font-mono" style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }} />
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button type="button" onClick={() => moveTab(idx, -1)} disabled={idx === 0}
                className="w-7 h-7 rounded-lg text-sm font-black disabled:opacity-30" style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }}>↑</button>
              <button type="button" onClick={() => moveTab(idx, 1)} disabled={idx === cfg.tabs.length - 1}
                className="w-7 h-7 rounded-lg text-sm font-black disabled:opacity-30" style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }}>↓</button>
              <button type="button" onClick={() => removeTab(idx)}
                className="w-7 h-7 rounded-lg text-sm font-black" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}>×</button>
            </div>
          </div>
        ))}
        {cfg.tabs.length === 0 && <p className="text-xs text-center py-2" style={{ color: S.sub }}>Sin botones. Agrega al menos uno.</p>}
        <p className="text-xs" style={{ color: S.sub }}>Sugerencia: sube iconos cuadrados (PNG/SVG). Si no subes icono, los botones &quot;menu&quot;, &quot;review&quot; y &quot;card&quot; usan su icono integrado.</p>
      </div>

      {/* Botón Salir */}
      <div className="rounded-2xl p-5 flex items-center justify-between" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: S.text }}>Botón &quot;Salir&quot;</p>
          <p className="text-xs" style={{ color: S.sub }}>Cierra la sesión del cliente. Va siempre al final.</p>
        </div>
        <button type="button" onClick={() => set({ showLogout: !cfg.showLogout })}
          className="w-12 h-7 rounded-full relative transition-colors"
          style={{ backgroundColor: cfg.showLogout ? S.accent : 'var(--ad-overlay)' }}>
          <span className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all" style={{ left: cfg.showLogout ? '26px' : '4px' }} />
        </button>
      </div>

      {/* Colores */}
      <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
        <p className="text-sm font-bold" style={{ color: S.text }}>Colores</p>
        {([
          { key: 'bg' as const, label: 'Fondo de la barra' },
          { key: 'accent' as const, label: 'Acento (pestaña activa)' },
          { key: 'inactive' as const, label: 'Iconos inactivos' },
          { key: 'border' as const, label: 'Borde' },
        ]).map(f => (
          <div key={f.key} className="flex items-center gap-3">
            <span className="flex-1 text-sm" style={{ color: S.text }}>{f.label}</span>
            <input type="color" value={cfg[f.key]} onChange={e => setColor(f.key, e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent" style={{ border: `1px solid ${S.border}` }} />
            <input type="text" value={cfg[f.key]} onChange={e => setColor(f.key, e.target.value)}
              className="w-28 rounded-lg px-3 py-2 text-sm font-mono"
              style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
          </div>
        ))}
      </div>

      {/* Redondez */}
      <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: S.text }}>Redondez de esquinas</p>
          <span className="text-sm font-mono" style={{ color: S.sub }}>{isFull ? 'Píldora' : `${cfg.radius}px`}</span>
        </div>
        <input type="range" min={0} max={40} value={Math.min(cfg.radius, 40)}
          onChange={e => set({ radius: Number(e.target.value) })}
          className="w-full accent-[var(--ad-accent)]" />
        <div className="flex gap-2">
          <button type="button" onClick={() => set({ radius: 0 })}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }}>Recto</button>
          <button type="button" onClick={() => set({ radius: 16 })}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }}>Redondeado</button>
          <button type="button" onClick={() => set({ radius: 9999 })}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ backgroundColor: isFull ? S.accent : S.bg, color: isFull ? '#000' : S.text, border: `1px solid ${S.border}` }}>
            Píldora
          </button>
        </div>
      </div>

      {/* Guardar */}
      <button type="button" onClick={save} disabled={saving}
        className="w-full py-3 rounded-xl font-black disabled:opacity-60"
        style={{ backgroundColor: S.accent, color: '#000' }}>
        {saving ? 'Guardando...' : saved
          ? <span className="inline-flex items-center justify-center gap-1.5"><Icon name="check" size={15} /> Guardado</span>
          : 'Guardar cambios'}
      </button>
    </div>
  )
}
