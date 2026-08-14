'use client'

import { useState, useEffect } from 'react'
import { BrandLogo } from '@/app/components/BrandLogo'

const STORAGE_KEY = 'emp_remembered_name'

export default function EmployeeLoginPage() {
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [logo, setLogo]         = useState('/logo.png')
  const [logoColor, setLogoColor] = useState('')
  const [logoBg, setLogoBg]     = useState('')
  const [brandName, setBrandName] = useState('Restaurante')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) queueMicrotask(() => setName(saved))
    fetch('/api/settings?key=menu_logo').then(r => r.json()).then(d => {
      if (d?.value) { setLogo(d.value); return }
      fetch('/api/settings?key=profile_logo').then(r => r.json()).then(d2 => { if (d2?.value) setLogo(d2.value) }).catch(() => {})
    }).catch(() => {})
    fetch('/api/settings?key=menu_logo_color').then(r => r.json()).then(d => setLogoColor(d?.value ?? '')).catch(() => {})
    fetch('/api/settings?key=menu_bg_color').then(r => r.json()).then(d => { if (d?.value) setLogoBg(d.value) }).catch(() => {})
    fetch('/api/settings?key=restaurant_name').then(r => r.json()).then(d => { if (d?.value) setBrandName(d.value) }).catch(() => {})
  }, [])

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim() || !password) { setError('Completa todos los campos'); return }
    localStorage.setItem(STORAGE_KEY, name.trim())
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/employee/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', name: name.trim(), password }),
      })
      const data = await res.json()
      if (res.ok) window.location.href = '/employee'
      else setError(data.error ?? 'Error al iniciar sesión')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const INPUT = 'w-full rounded-2xl px-4 py-3.5 text-white text-sm transition-colors focus:outline-none'

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-5" style={{ backgroundColor: 'var(--ad-bg)' }}>

      <div className="text-center mb-8">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl overflow-hidden" style={logoBg ? { backgroundColor: logoBg } : undefined}>
          <BrandLogo src={logo} color={logoColor} alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div className="font-extrabold text-xl tracking-wide" style={{ color: 'var(--ad-text)' }}>{brandName}</div>
        <p className="text-sm mt-1 font-medium" style={{ color: 'var(--ad-accent)' }}>Panel de empleados</p>
      </div>

      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--ad-card)', border: '1px solid var(--ad-border)' }}>

        <p className="text-sm font-black text-center pt-4 pb-1" style={{ color: 'var(--ad-accent)' }}>Iniciar sesión</p>

        <form onSubmit={handleSubmit} className="px-5 pb-5 pt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--ad-sub)' }}>Nombre completo</label>
            <input id="emp-username" name="username" type="text" value={name} onChange={e => { setName(e.target.value); setError('') }}
              placeholder="Ej. Carlos López" autoComplete="name" autoFocus
              className={INPUT}
              style={{ backgroundColor: 'var(--ad-elevated)', border: '1px solid color-mix(in srgb, var(--ad-accent) 30%, transparent)' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--ad-accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ad-accent) 30%, transparent)'} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--ad-sub)' }}>Contraseña</label>
            <input id="emp-password" name="password" type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Contraseña" autoComplete="current-password"
              className={INPUT}
              style={{ backgroundColor: 'var(--ad-elevated)', border: '1px solid color-mix(in srgb, var(--ad-accent) 30%, transparent)' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--ad-accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ad-accent) 30%, transparent)'} />
          </div>

          {error && (
            <div className="border rounded-2xl px-4 py-3 text-sm font-medium text-red-300"
              style={{ backgroundColor: '#2d0a0a', borderColor: '#7f1d1d' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full font-black py-4 rounded-2xl text-base disabled:opacity-60 transition-colors mt-1"
            style={{ backgroundColor: 'var(--ad-accent)', color: '#000' }}>
            {loading ? 'Cargando...' : '→ Entrar'}
          </button>
        </form>
      </div>

      <p className="text-xs mt-6" style={{ color: 'var(--ad-sub)' }}>Solo para uso del personal</p>
    </div>
  )
}
