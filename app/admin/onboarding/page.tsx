'use client'

// Asistente de configuración inicial: se muestra cuando falta identidad del
// restaurante (nombre, logo o colores) — el middleware redirige aquí y bloquea
// el resto de /admin hasta completarlo. Guarda en las mismas claves de settings
// que usa /admin/configuracion → "Identidad del restaurante", así que después
// se puede seguir editando desde ahí normalmente.
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/app/components/Icon'
import { uploadWebp, fmtBytes } from '@/lib/uploadWebp'

const TOTAL_STEPS = 3
const STEP_META = [
  { label: 'Restaurante', icon: 'home' as const },
  { label: 'Logo', icon: 'image' as const },
  { label: 'Colores', icon: 'sparkles' as const },
]

const DEFAULT_PRIMARY = '#B90F45'
const DEFAULT_SECONDARY = '#B90F45'
const DEFAULT_TERTIARY = '#0d0d0d'

export default function OnboardingPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [ready, setReady] = useState(false)

  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [imgSize, setImgSize] = useState<{ original: number; webp: number } | null>(null)

  const [primary, setPrimary] = useState(DEFAULT_PRIMARY)
  const [secondary, setSecondary] = useState(DEFAULT_SECONDARY)
  const [tertiary, setTertiary] = useState(DEFAULT_TERTIARY)

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const get = (k: string) => fetch(`/api/settings?key=${k}`).then(r => r.json()).catch(() => ({}))
    Promise.all([get('restaurant_name'), get('menu_logo'), get('profile_logo'), get('menu_hover_color'), get('menu_btn_color'), get('menu_bg_color')])
      .then(([n, ml, pl, p, s, t]) => {
        if (n?.value) setName(n.value)
        if (ml?.value || pl?.value) setLogoUrl(ml?.value || pl?.value)
        if (p?.value) setPrimary(p.value)
        if (s?.value) setSecondary(s.value)
        if (t?.value) setTertiary(t.value)
        setReady(true)
      })
      .catch(() => setReady(true))
  }, [])

  async function handleLogoFile(file: File) {
    if (!/^image\/(jpeg|png|webp|svg\+xml)$/.test(file.type)) {
      setError('Formato no soportado. Usa JPG, PNG, WebP o SVG.')
      return
    }
    setUploading(true)
    setError('')
    const url = await uploadWebp(file, '/api/settings/upload', (original, webp) => setImgSize({ original, webp }))
    setUploading(false)
    if (url) setLogoUrl(url)
    else setError('No se pudo subir la imagen. Intenta de nuevo.')
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleLogoFile(file)
  }

  function canAdvance() {
    if (step === 1) return name.trim().length > 0
    if (step === 2) return !!logoUrl
    return true
  }

  function next() {
    if (!canAdvance()) {
      setError(step === 1 ? 'Escribe el nombre de tu restaurante.' : 'Sube el logo para continuar.')
      return
    }
    setError('')
    setStep(s => Math.min(TOTAL_STEPS, s + 1))
  }

  function back() {
    setError('')
    setStep(s => Math.max(1, s - 1))
  }

  async function finish() {
    if (!name.trim() || !logoUrl) {
      setError('Falta información obligatoria.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const save = (key: string, value: string) =>
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        })
      const results = await Promise.all([
        save('restaurant_name', name.trim()),
        save('menu_logo', logoUrl),
        save('menu_hover_color', primary),
        save('menu_btn_color', secondary),
        save('menu_bg_color', tertiary),
      ])
      if (results.some(r => !r.ok)) throw new Error('save failed')
      setDone(true)
      // Recarga completa (no router.push): el layout de /admin ya se había
      // renderizado con los datos viejos/vacíos al entrar al onboarding, y una
      // navegación cliente reutiliza esa versión cacheada en vez de releer
      // los valores recién guardados.
      setTimeout(() => { window.location.href = '/admin/menu' }, 1800)
    } catch {
      setError('No se pudo guardar la configuración. Intenta de nuevo.')
      setSaving(false)
    }
  }

  const INPUT = 'w-full rounded-2xl px-4 py-3.5 text-base outline-none border transition-colors focus:border-[var(--ob-accent)]'

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#f3f5fb' }}>
        <div className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin" style={{ borderColor: '#96082f', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (done) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-6" style={{ backgroundColor: '#f3f5fb' }}>
        <div className="text-center space-y-4 animate-[obFadeUp_0.4s_ease-out]">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-white" style={{ backgroundColor: primary }}>
            <Icon name="checkCircle" size={40} />
          </div>
          <h1 className="text-2xl font-black" style={{ color: '#0d1426' }}>¡Configuración completada!</h1>
          <p className="text-sm" style={{ color: '#5b6884' }}>Llevándote al panel de administración…</p>
        </div>
        <style>{`@keyframes obFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ backgroundColor: '#f3f5fb', '--ob-accent': primary } as React.CSSProperties}>
      <style>{`
        @keyframes obFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .ob-step { animation: obFadeUp 0.35s ease-out; }
      `}</style>

      <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">

          <div className="text-center space-y-1">
            <h1 className="text-xl sm:text-2xl font-black" style={{ color: '#0d1426' }}>Bienvenido a tu panel</h1>
            <p className="text-sm" style={{ color: '#5b6884' }}>Configura la identidad de tu restaurante antes de continuar</p>
          </div>

          {/* Barra de progreso */}
          <div className="flex items-center">
            {STEP_META.map((meta, i) => {
              const n = i + 1
              const isDone = n < step
              const isCurrent = n === step
              return (
                <div key={meta.label} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-colors"
                      style={{
                        backgroundColor: isDone || isCurrent ? primary : '#eef1f8',
                        color: isDone || isCurrent ? '#fff' : '#5b6884',
                      }}
                    >
                      {isDone ? <Icon name="check" size={16} /> : <Icon name={meta.icon} size={16} />}
                    </div>
                    <span className="text-[11px] font-bold" style={{ color: isCurrent ? '#0d1426' : '#5b6884' }}>{meta.label}</span>
                  </div>
                  {i < STEP_META.length - 1 && (
                    <div className="h-0.5 flex-1 -mt-5 rounded-full transition-colors" style={{ backgroundColor: n < step ? primary : '#eef1f8' }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Paso 1 — Restaurante */}
          {step === 1 && (
            <div key={1} className="ob-step space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: '#5b6884' }}>Nombre del restaurante *</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Ej. Chubis" autoFocus
                className={INPUT} style={{ backgroundColor: '#f3f5fb', borderColor: 'rgba(0,0,0,0.12)', color: '#0d1426' }}
              />
              <p className="text-xs" style={{ color: '#5b6884' }}>Se muestra en el sidebar del panel y en el menú digital.</p>
            </div>
          )}

          {/* Paso 2 — Logo */}
          {step === 2 && (
            <div key={2} className="ob-step space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: '#5b6884' }}>Logo del restaurante *</label>

              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors"
                style={{ borderColor: dragOver ? primary : 'rgba(0,0,0,0.15)', backgroundColor: dragOver ? `${primary}0d` : '#f9fafc' }}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" className="h-24 w-auto object-contain" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#eef1f8', color: '#5b6884' }}>
                    <Icon name="image" size={28} />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-bold" style={{ color: primary }}>{uploading ? 'Subiendo…' : logoUrl ? 'Cambiar imagen' : 'Sube una imagen o arrástrala aquí'}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#5b6884' }}>JPG, PNG, WebP o SVG</p>
                  {imgSize && <p className="text-xs mt-0.5" style={{ color: '#5b6884' }}>{fmtBytes(imgSize.original)} → {fmtBytes(imgSize.webp)}</p>}
                </div>
                <input
                  ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f) }}
                />
              </div>
            </div>
          )}

          {/* Paso 3 — Colores */}
          {step === 3 && (
            <div key={3} className="ob-step space-y-4">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#5b6884' }}>Personaliza tu marca *</p>

              {[
                { label: 'Color primario', hint: 'Sidebar, navegación y acentos (admin, empleados, RESTA3)', value: primary, set: setPrimary },
                { label: 'Color secundario', hint: 'Botones del menú digital', value: secondary, set: setSecondary },
                { label: 'Color terciario', hint: 'Fondo del menú digital', value: tertiary, set: setTertiary },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-3">
                  <input type="color" value={c.value} onChange={e => c.set(e.target.value)}
                    className="w-11 h-11 rounded-xl border cursor-pointer shrink-0" style={{ borderColor: 'rgba(0,0,0,0.12)' }} />
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: '#0d1426' }}>{c.label}</p>
                    <p className="text-xs" style={{ color: '#5b6884' }}>{c.hint}</p>
                  </div>
                  <input type="text" value={c.value} onChange={e => c.set(e.target.value)}
                    className="w-24 rounded-xl px-2 py-2 text-xs font-mono outline-none border"
                    style={{ backgroundColor: '#f3f5fb', borderColor: 'rgba(0,0,0,0.12)', color: '#0d1426' }} />
                </div>
              ))}

              {/* Vista previa en tiempo real */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#5b6884' }}>Vista previa</p>
                <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
                  <div className="flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                    {logoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={logoUrl} alt="" className="w-6 h-6 object-contain" />
                      : <div className="w-6 h-6 rounded-md" style={{ backgroundColor: primary }} />}
                    <span className="text-xs font-black" style={{ color: '#0d1426' }}>{name || 'Tu restaurante'}</span>
                  </div>
                  <div className="p-3 space-y-2" style={{ backgroundColor: '#f9fafc' }}>
                    <div className="rounded-lg px-3 py-2 text-xs font-bold text-white" style={{ backgroundColor: primary }}>Menú Inteligente</div>
                    <div className="rounded-lg px-3 py-2 text-xs font-bold" style={{ color: '#5b6884' }}>Pedidos</div>
                    <div className="rounded-xl px-3 py-2.5 text-xs font-black text-white text-center" style={{ backgroundColor: secondary }}>Categoría del menú</div>
                    <div className="rounded-xl px-3 py-2.5 flex items-center gap-2 border" style={{ backgroundColor: tertiary, borderColor: 'rgba(0,0,0,0.12)' }}>
                      <span className="text-xs font-black px-2 py-1 rounded-md bg-white/90" style={{ color: '#0d1426' }}>Fondo del menú digital</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl px-4 py-2.5 text-xs font-medium" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            {step > 1 && (
              <button type="button" onClick={back}
                className="px-5 py-3 rounded-2xl text-sm font-bold transition-colors"
                style={{ backgroundColor: '#eef1f8', color: '#0d1426' }}>
                Atrás
              </button>
            )}
            <button
              type="button"
              onClick={step === TOTAL_STEPS ? finish : next}
              disabled={saving || uploading}
              className="flex-1 py-3 rounded-2xl text-sm font-black text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: primary }}
            >
              {saving ? 'Guardando…' : step === TOTAL_STEPS ? 'Finalizar' : 'Continuar →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
