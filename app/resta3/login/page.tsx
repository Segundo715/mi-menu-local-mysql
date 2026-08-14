'use client'

import { useState, useEffect } from 'react'
import { BrandLogo } from '@/app/components/BrandLogo'

const STORAGE_KEY = 'r3_remembered_name'
const LS_ACCENT   = 'cfg_accent'
const LS_LOGO     = 'cfg_logo'
const LS_BRAND    = 'cfg_brand'
const LS_LOGO_BG  = 'cfg_logo_bg'

export default function Resta3LoginPage() {
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const [accent, setAccent]       = useState('#00e676')
  const [logo, setLogo]           = useState('/logo.png')
  const [logoColor, setLogoColor] = useState('')
  const [logoBg, setLogoBg]       = useState('')
  const [brandName, setBrandName] = useState('RESTA3')
  const brandSub = 'Panel de gestión'

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    const ca = localStorage.getItem(LS_ACCENT)
    const cl = localStorage.getItem(LS_LOGO)
    const cn = localStorage.getItem(LS_BRAND)
    const cb = localStorage.getItem(LS_LOGO_BG)
    queueMicrotask(() => {
      if (saved) setName(saved)
      if (ca) setAccent(ca)
      if (cl) setLogo(cl)
      if (cn) setBrandName(cn)
      if (cb) setLogoBg(cb)
    })
    Promise.all([
      fetch('/api/settings?key=resta3_accent').then(r => r.json()),
      fetch('/api/settings?key=menu_hover_color').then(r => r.json()),
      fetch('/api/settings?key=resta3_logo').then(r => r.json()),
      fetch('/api/settings?key=menu_logo').then(r => r.json()),
      fetch('/api/settings?key=profile_logo').then(r => r.json()),
      fetch('/api/settings?key=resta3_name').then(r => r.json()),
      fetch('/api/settings?key=restaurant_name').then(r => r.json()),
      fetch('/api/settings?key=menu_bg_color').then(r => r.json()),
      fetch('/api/settings?key=menu_logo_color').then(r => r.json()),
    ]).then(([r3a, ha, r3l, ml, pl, r3n, rn, bg, lc]) => {
      const finalAccent = r3a?.value || ha?.value
      const finalLogo   = r3l?.value || ml?.value || pl?.value
      const finalName   = r3n?.value || rn?.value
      const finalLogoBg = bg?.value
      // resta3_logo propio no se recolorea; solo el fallback al logo general.
      const finalLogoColor = r3l?.value ? '' : (lc?.value ?? '')
      if (finalAccent) { setAccent(finalAccent); localStorage.setItem(LS_ACCENT, finalAccent) }
      if (finalLogo)   { setLogo(finalLogo); localStorage.setItem(LS_LOGO, finalLogo) }
      if (finalName)   { setBrandName(finalName); localStorage.setItem(LS_BRAND, finalName) }
      if (finalLogoBg) { setLogoBg(finalLogoBg); localStorage.setItem(LS_LOGO_BG, finalLogoBg) }
      setLogoColor(finalLogoColor)
    })
  }, [])

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!name.trim() || !password) { setError('Completa todos los campos'); return }
    localStorage.setItem(STORAGE_KEY, name.trim())
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/resta3/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', name: name.trim(), password }),
      })
      const data = await res.json()
      if (res.ok) window.location.href = '/resta3'
      else setError(data.error ?? 'Error')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const accentHex  = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#00e676'
  const borderIdle = `${accentHex}4d`

  const INPUT = 'w-full rounded-2xl px-4 py-3.5 text-sm transition-colors focus:outline-none'
  const inputStyle = { backgroundColor: 'var(--ad-elevated)', color: 'var(--ad-text)', border: `1px solid ${borderIdle}` }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-5"
      style={{ backgroundColor: 'var(--ad-bg)' }}>

      <div className="text-center mb-8">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl overflow-hidden" style={logoBg ? { backgroundColor: logoBg } : undefined}>
          <BrandLogo src={logo} color={logoColor} alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div className="font-extrabold text-xl tracking-wide" style={{ color: 'var(--ad-text)' }}>{brandName}</div>
        <p className="text-sm mt-1 font-medium" style={{ color: accentHex }}>{brandSub}</p>
      </div>

      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--ad-card)', border: '1px solid var(--ad-border)' }}>

        <p className="text-sm font-black text-center pt-4 pb-1" style={{ color: accentHex }}>Iniciar sesión</p>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--ad-sub)' }}>Usuario</label>
            <input id="r3-username" name="username" type="text" value={name} onChange={e => { setName(e.target.value); setError('') }}
              placeholder="Tu nombre de usuario" autoComplete="username" autoFocus
              className={INPUT} style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = accentHex}
              onBlur={e => e.currentTarget.style.borderColor = borderIdle} />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--ad-sub)' }}>Contraseña</label>
            <div className="relative">
              <input id="r3-password" name="password" type={showPw ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Contraseña" autoComplete="current-password"
                className={INPUT + ' pr-12'} style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = accentHex}
                onBlur={e => e.currentTarget.style.borderColor = borderIdle} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-opacity hover:opacity-80"
                style={{ color: 'var(--ad-sub)' }} aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPw
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
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
            style={{ backgroundColor: accentHex, color: '#000' }}>
            {loading ? 'Cargando...' : '→ Entrar'}
          </button>
        </form>
      </div>

      <p className="text-xs mt-6" style={{ color: 'var(--ad-sub)' }}>Solo para uso del personal autorizado</p>
    </div>
  )
}
