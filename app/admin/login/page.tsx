'use client'

import { useState, useEffect } from 'react'
import { BrandLogo } from '@/app/components/BrandLogo'
import { useBrand } from '@/app/components/BrandProvider'

const STORAGE_KEY = 'admin_remembered_name'

// Texto negro o blanco según la luminancia del acento, para que el botón
// "Entrar" nunca quede con texto invisible (acento muy claro u oscuro).
function contrastText(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#000'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#000' : '#fff'
}

export default function LoginPage() {
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  // Nombre/logo/colores vienen del servidor (layout → BrandProvider) — sin
  // fetch propio no hay parpadeo de la marca anterior al recargar la página.
  const { name: brandNameRaw, logo: brandLogo, logoColor, logoBg, accent } = useBrand()
  const logo = brandLogo || '/logo.png'
  const brandName = brandNameRaw || 'Restaurante'
  const accentHex = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#B90F45'

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) queueMicrotask(() => setName(saved))
  }, [])

  const INPUT = 'w-full rounded-2xl px-4 py-3.5 text-white text-sm transition-colors focus:outline-none'
  const inputStyle = { backgroundColor: '#0a0e1c', border: '1px solid rgba(0,230,118,0.3)' }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim() || !password) { setError('Completa todos los campos'); return }
    localStorage.setItem(STORAGE_KEY, name.trim())
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', name: name.trim(), password }),
      })
      const data = await res.json()
      if (res.ok) window.location.href = '/admin/menu'
      else setError(data.error ?? 'Error')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-5" style={{ backgroundColor: 'var(--ad-sidebar)' }}>

      <div className="text-center mb-8">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl overflow-hidden" style={logoBg ? { backgroundColor: logoBg } : undefined}>
          <BrandLogo src={logo} color={logoColor} alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div className="font-extrabold text-xl tracking-wide" style={{ color: 'var(--ad-text)' }}>{brandName}</div>
        <p className="text-sm mt-1 font-medium" style={{ color: 'var(--ad-text)' }}>Panel de administración</p>
      </div>

      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--ad-card)', border: '1px solid var(--ad-border)' }}>

        <p className="text-sm font-black text-center pt-4 pb-1" style={{ color: 'var(--ad-text)' }}>Iniciar sesión</p>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--ad-sub)' }}>Nombre completo</label>
            <input id="admin-username" name="username" type="text" value={name} onChange={e => { setName(e.target.value); setError('') }}
              placeholder="Ej. Carlos López" autoComplete="name" autoFocus
              className={INPUT} style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--ad-accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,230,118,0.3)'} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--ad-sub)' }}>Contraseña</label>
            <div className="relative">
              <input id="admin-password" name="password" type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Contraseña" autoComplete="current-password"
                className={`${INPUT} pr-11`} style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--ad-accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,230,118,0.3)'} />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{ color: 'var(--ad-sub)' }}>
                {showPassword ? (
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="border rounded-2xl px-4 py-3 text-sm font-medium text-red-300"
              style={{ backgroundColor: '#2d0a0a', borderColor: '#7f1d1d' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full font-black py-4 rounded-2xl text-base disabled:opacity-60 transition-colors mt-1"
            style={{ backgroundColor: 'var(--ad-accent)', color: contrastText(accentHex) }}>
            {loading ? 'Cargando...' : '→ Entrar'}
          </button>
        </form>
      </div>

      <p className="text-xs mt-6" style={{ color: 'var(--ad-sub)' }}>Solo para uso del personal autorizado</p>
    </div>
  )
}
