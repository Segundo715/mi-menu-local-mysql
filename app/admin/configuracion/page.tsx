'use client'

// Configuración del sistema: branding del admin, branding de Resta3, colores del empleado,
// textos de registro y perfiles de administrador.
import { useState, useEffect } from 'react'
import AdminNav from '@/app/components/AdminNav'
import { Icon } from '@/app/components/Icon'
import { uploadWebp } from '@/lib/uploadWebp'
import { BrandLogo } from '@/app/components/BrandLogo'

const S = {
  bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)',
  text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)',
}

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

const TEXT_SETTINGS = [
  { key: 'registro_titulo',    label: 'Título de bienvenida',    placeholder: '¡Bienvenido!',                       hint: 'Aparece en la tarjeta de /registro' },
  { key: 'registro_subtitulo', label: 'Subtítulo de bienvenida', placeholder: 'Completa tus datos para registrarte...', hint: 'Texto debajo del título en /registro' },
]

interface AdminItem { id: string; name: string; role: string; createdAt: string }

const ROLES = ['Administrador', 'Gerente', 'Supervisor', 'Encargado', 'Cajero', 'Auditor']

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  const raw = Array.from(arr).map(b => chars[b % chars.length]).join('')
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`
}

function currentAdminName(): string {
  if (typeof document === 'undefined') return ''
  const m = document.cookie.match(/(?:^|;\s*)admin_name=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : ''
}

export default function AdminConfiguracionPage() {
  const [values, setValues]       = useState<Record<string, string>>({})
  const [saving, setSaving]       = useState<string | null>(null)
  const [saved,  setSaved]        = useState<string | null>(null)
  const [uploadingMenuLogo, setUploadingMenuLogo] = useState(false)

  // Hex real detrás de --ad-accent (menu_hover_color) — se usa para calcular
  // texto legible en los botones de acento en vez de asumir que siempre es oscuro.
  const accentHex = /^#[0-9a-fA-F]{6}$/.test(values.menu_hover_color ?? '') ? values.menu_hover_color : '#B90F45'

  // Perfiles
  const [admins, setAdmins]         = useState<AdminItem[]>([])
  const [newName, setNewName]       = useState('')
  const [newRole, setNewRole]       = useState('Administrador')
  // Vacío en el primer render (SSR y cliente deben coincidir); se genera en
  // el useEffect de abajo, que solo corre en el cliente — generatePassword()
  // usa crypto.getRandomValues(), que da un valor distinto en cada corrida,
  // así que generarla durante el render causaba un mismatch de hidratación.
  const [newPass, setNewPass]       = useState('')
  const [passCopied, setPassCopied] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [creating, setCreating]     = useState(false)

  const me = currentAdminName()

  useEffect(() => {
    // Intencional: generatePassword() debe correr solo en el cliente (ver
    // comentario junto a useState(newPass) arriba) — no hay forma de calcular
    // esto durante el render sin reintroducir el mismatch de hidratación.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNewPass(generatePassword())
  }, [])

  useEffect(() => {
    const keys = [
      ...TEXT_SETTINGS.map(s => s.key),
      'restaurant_name', 'restaurant_address', 'restaurant_phone', 'profile_logo', 'sidebar_accent',
      'menu_logo', 'menu_logo_color', 'menu_logo_size', 'menu_bg_color', 'menu_btn_color', 'menu_hover_color', 'menu_action_color', 'business_wa',
    ]
    keys.forEach(async key => {
      const r = await fetch(`/api/settings?key=${key}`)
      const d = await r.json()
      if (d.value) setValues(p => ({ ...p, [key]: d.value }))
    })

    loadAdmins()
  }, [])

  async function loadAdmins() {
    const r = await fetch('/api/admins')
    if (!r.ok) return
    setAdmins(await r.json())
  }

  async function saveSetting(key: string, valueOverride?: string) {
    setSaving(key)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: valueOverride ?? values[key] ?? '' }),
    })
    setSaving(null)
    setSaved(key)
    setTimeout(() => setSaved(null), 2000)
  }

  async function uploadLogo(file: File, key: string, setLoading: (v: boolean) => void) {
    setLoading(true)
    try {
      const url = await uploadWebp(file, '/api/settings/upload')
      if (url) {
        setValues(p => ({ ...p, [key]: url }))
        await saveSetting(key, url)
      }
    } finally {
      setLoading(false)
    }
  }

  async function createProfile() {
    setProfileError('')
    if (!newName.trim()) { setProfileError('El nombre es requerido'); return }
    setCreating(true)
    try {
      const r = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), password: newPass, role: newRole }),
      })
      const d = await r.json()
      if (!r.ok) { setProfileError(d.error ?? 'Error al crear el perfil'); return }
      setNewName('')
      setNewRole('Administrador')
      setNewPass(generatePassword())
      setPassCopied(false)
      await loadAdmins()
    } finally {
      setCreating(false)
    }
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(newPass)
    setPassCopied(true)
    setTimeout(() => setPassCopied(false), 2500)
  }

  async function deleteProfile(id: string, name: string) {
    if (!confirm(`¿Eliminar el perfil "${name}"? Esta acción no se puede deshacer.`)) return
    setProfileError('')
    const r = await fetch(`/api/admins?id=${id}`, { method: 'DELETE' })
    if (!r.ok) {
      const d = await r.json()
      setProfileError(d.error ?? 'No se pudo eliminar')
      return
    }
    await loadAdmins()
  }

  const renderSaveBtn = (k: string) => (
    <button
      onClick={() => saveSetting(k)}
      disabled={saving === k}
      className="px-4 py-2 rounded-2xl text-sm font-bold shrink-0 transition-all"
      style={{ backgroundColor: saved === k ? 'rgba(0,230,118,.2)' : `${S.accent}22`, color: saved === k ? '#4ade80' : contrastText(accentHex) }}>
      {saving === k ? '...' : saved === k ? <span className="inline-flex items-center gap-1.5"><Icon name="check" size={14} /> Guardado</span> : 'Guardar'}
    </button>
  )

  const renderColorRow = (key: string, previewColor: string) => (
    <div className="flex items-center gap-2">
      <input type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(previewColor) ? previewColor : '#00e676'}
        onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))}
        className="w-12 h-11 rounded-2xl cursor-pointer bg-transparent"
        style={{ border: `1px solid ${S.border}` }} />
      <input type="text"
        value={values[key] ?? ''}
        onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))}
        placeholder="#00e676"
        className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none font-mono"
        style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
      {renderSaveBtn(key)}
    </div>
  )

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />
      <div className="max-w-[800px] mx-auto p-4 space-y-4">

        <div className="pt-1">
          <h1 className="text-xl font-black" style={{ color: S.text }}>Configuración</h1>
        </div>

        {/* ===== Identidad del restaurante ===== */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
            <p className="font-bold text-sm" style={{ color: S.text }}>Identidad del restaurante</p>
          </div>
          <div className="p-5 space-y-5">

            {/* Nombre */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Nombre del restaurante</label>
              <div className="flex gap-2">
                <input type="text" value={values.restaurant_name ?? ''}
                  onChange={e => setValues(p => ({ ...p, restaurant_name: e.target.value }))}
                  placeholder="NICHO"
                  className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none"
                  style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
                {renderSaveBtn('restaurant_name')}
              </div>
            </div>

            {/* Logo menú */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Logo del restaurante</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
                  style={{ background: values.menu_bg_color || '#0d0d0d', border: `1px solid ${S.border}` }}>
                  <BrandLogo src={values.menu_logo || values.profile_logo || '/logo.png'} color={values.menu_logo_color}
                    alt="logo menú" className="w-10 h-10 object-contain" />
                </div>
                <label className="px-4 py-2 rounded-2xl text-sm font-bold cursor-pointer transition-all"
                  style={{ backgroundColor: `${S.accent}22`, color: contrastText(accentHex) }}>
                  {uploadingMenuLogo ? 'Subiendo...' : 'Cambiar logo'}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f, 'menu_logo', setUploadingMenuLogo) }} />
                </label>
              </div>
            </div>

            {/* Color del logo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Recolorear logo (si tiene negro u otro color)</label>
              {renderColorRow('menu_logo_color', values.menu_logo_color || '#B90F45')}
            </div>

            {/* Tamaño del logo en el menú del cliente */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Tamaño del logo (menú del cliente)</label>
              <div className="flex items-center gap-3">
                <input type="range" min={60} max={280} step={10}
                  value={Number(values.menu_logo_size) || 120}
                  onChange={e => setValues(p => ({ ...p, menu_logo_size: e.target.value }))}
                  className="flex-1" style={{ accentColor: S.accent }} />
                <span className="text-sm font-bold tabular-nums w-14 text-right" style={{ color: S.text }}>
                  {Number(values.menu_logo_size) || 120}px
                </span>
                {renderSaveBtn('menu_logo_size')}
              </div>
            </div>

            {/* Fondo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Color de fondo</label>
              {renderColorRow('menu_bg_color', values.menu_bg_color || '#0d0d0d')}
            </div>

            {/* Botón principal */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Color del botón principal</label>
              {renderColorRow('menu_btn_color', values.menu_btn_color || '#B90F45')}
            </div>

            {/* Color hover / acento */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Color de acento / hover</label>
              {renderColorRow('menu_hover_color', values.menu_hover_color || '#DC5E86')}
              <div className="mt-2 flex gap-2">
                <span className="inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: values.menu_btn_color || '#B90F45', color: contrastText(values.menu_btn_color || '#B90F45') }}>Botón</span>
                <span className="inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: values.menu_hover_color || '#DC5E86', color: contrastText(accentHex) }}>Acento</span>
              </div>
            </div>

            {/* Color de acción — carrito / agregar al pedido */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Color de acción (carrito / agregar)</label>
              {renderColorRow('menu_action_color', values.menu_action_color || values.menu_hover_color || '#DC5E86')}
            </div>

            {/* WhatsApp del negocio */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>WhatsApp del negocio</label>
              <div className="flex gap-2">
                <input type="text" value={values.business_wa ?? ''}
                  onChange={e => setValues(p => ({ ...p, business_wa: e.target.value.replace(/\D/g, '') }))}
                  placeholder="526641234567"
                  className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none font-mono"
                  style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
                {renderSaveBtn('business_wa')}
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Dirección</label>
              <div className="flex gap-2">
                <input type="text" value={values.restaurant_address ?? ''}
                  onChange={e => setValues(p => ({ ...p, restaurant_address: e.target.value }))}
                  placeholder="Calle Ejemplo 123, Col. Centro"
                  className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none"
                  style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
                {renderSaveBtn('restaurant_address')}
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Teléfono</label>
              <div className="flex gap-2">
                <input type="text" value={values.restaurant_phone ?? ''}
                  onChange={e => setValues(p => ({ ...p, restaurant_phone: e.target.value }))}
                  placeholder="(444) 123-4567"
                  className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none"
                  style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
                {renderSaveBtn('restaurant_phone')}
              </div>
            </div>

          </div>
        </div>

        {/* ===== Administración de perfiles ===== */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
            <p className="font-bold text-sm" style={{ color: S.text }}>Administración de perfiles</p>
          </div>
          <div className="p-5 space-y-4">

            <div className="space-y-2">
              {admins.map(a => {
                const isMe = a.name.toLowerCase() === me.toLowerCase()
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#4f6ef7)', color: '#fff' }}>
                      {a.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: S.text }}>
                        {a.name}{isMe && <span className="ml-2 text-xs font-medium" style={{ color: S.accent }}>(tú)</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${S.accent}22`, color: contrastText(accentHex) }}>
                          {a.role || 'Administrador'}
                        </span>
                        <span className="text-xs" style={{ color: S.sub }}>Alta: {new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteProfile(a.id, a.name)} disabled={isMe}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'transparent' }}>
                      Eliminar
                    </button>
                  </div>
                )
              })}
              {admins.length === 0 && (
                <p className="text-xs" style={{ color: S.sub }}>Cargando perfiles...</p>
              )}
            </div>

            <div className="pt-4 space-y-3" style={{ borderTop: `1px solid ${S.border}` }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: S.sub }}>Crear nuevo perfil</p>

              {/* Nombre + Rol */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={newName}
                  onChange={e => { setNewName(e.target.value); setProfileError('') }}
                  placeholder="Nombre de usuario"
                  className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none"
                  style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
                <select value={newRole} onChange={e => setNewRole(e.target.value)}
                  className="px-4 py-3 rounded-2xl text-sm outline-none font-medium"
                  style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Contraseña aleatoria */}
              <div className="rounded-2xl p-3 space-y-2" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: S.sub }}>Contraseña generada automáticamente</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono tracking-wider select-all"
                    style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }}>
                    {newPass}
                  </code>
                  <button onClick={copyPassword}
                    className="px-3 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all"
                    style={{ backgroundColor: passCopied ? 'rgba(74,222,128,.2)' : `${S.accent}22`, color: passCopied ? '#4ade80' : contrastText(accentHex) }}>
                    {passCopied ? '✓ Copiada' : 'Copiar'}
                  </button>
                  <button onClick={() => { setNewPass(generatePassword()); setPassCopied(false) }}
                    className="px-3 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all"
                    style={{ backgroundColor: `${S.accent}22`, color: contrastText(accentHex) }}>
                    Nueva
                  </button>
                </div>
              </div>

              <button onClick={createProfile} disabled={creating || !newName.trim() || !newPass}
                className="w-full py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ backgroundColor: S.accent, color: contrastText(accentHex) }}>
                {creating ? 'Creando...' : '+ Crear perfil'}
              </button>

              {profileError && (
                <p className="text-xs font-medium" style={{ color: '#f87171' }}>{profileError}</p>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
