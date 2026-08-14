'use client'

// Vista de cuenta del usuario: muestra historial de visitas y permite cerrar sesión.
// Lee reward_categories desde /api/settings para evitar un fetch extra al montar.
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import CustomerNav from '@/app/components/CustomerNav'
import { BrandLogo } from '@/app/components/BrandLogo'

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false })

const STORAGE_KEY = 'loyalty_account_id'
const CATEGORIES_KEY = 'reward_categories'

// Tarjeta de socio para usuarios con cuenta (login/registro).
// Branding por defecto (se sobreescribe con la categoría "Tarjeta de Café" de /admin/tarjetas)
const DEFAULT_BRAND = {
  color: '#B90F45', logo: '/logo.png', logoColor: '', brandText: 'NICHO', brandLogo: '',
}

interface Brand {
  color: string; logo: string; logoColor: string; brandText: string; brandLogo: string
}

interface Customer {
  id: string; name: string; phone: string; age?: number
  visits: number; confirmed: boolean; registeredAt: string
}

type Step = 'auth' | 'card'
type Mode = 'login' | 'register'

const INPUT = 'w-full border border-[#B90F45]/40 rounded-2xl px-4 py-3.5 text-white bg-[#1a1a1a] placeholder-gray-500 focus:outline-none focus:border-[#B90F45] text-sm transition-colors'

function formatMemberSince(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short' })
}

export default function UsuarioPage() {
  const [step, setStep] = useState<Step>('auth')
  const [mode, setMode] = useState<Mode>('login')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [birth, setBirth] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      fetch(`/api/loyalty/${saved}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) { setCustomer(data); setStep('card') } })
        .catch(() => {})
    }
    // Branding desde la categoría "Tarjeta de Café", con la "Identidad del
    // restaurante" como valor por defecto si esa categoría no está personalizada.
    Promise.all([
      fetch(`/api/settings?key=${CATEGORIES_KEY}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/settings?key=restaurant_name').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=profile_logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo_color').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_hover_color').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=sidebar_accent').then(r => r.json()).catch(() => ({})),
    ]).then(([catRes, nameRes, logoRes, pLogoRes, logoColorRes, hoverRes, accentRes]) => {
      const brandName = nameRes?.value || DEFAULT_BRAND.brandText
      const brandLogoUrl = logoRes?.value || pLogoRes?.value || DEFAULT_BRAND.logo
      const brandLogoColor = logoColorRes?.value || ''
      const brandAccent = hoverRes?.value || accentRes?.value || DEFAULT_BRAND.color

      let cafe: { id: string; color?: string; logo?: string; brandText?: string; brandLogo?: string } | null = null
      if (catRes?.value) {
        try {
          const list = JSON.parse(catRes.value)
          cafe = Array.isArray(list) ? (list.find((c: { id: string }) => c.id === 'cafe') ?? list[0]) : null
        } catch {}
      }

      setBrand({
        color: cafe?.color || brandAccent,
        logo: cafe?.logo || brandLogoUrl,
        logoColor: brandLogoColor,
        brandText: cafe?.brandText || brandName,
        brandLogo: cafe?.brandLogo || DEFAULT_BRAND.brandLogo,
      })
    })
      .catch(() => {})
  }, [])

  async function handleSubmit() {
    if (!name.trim() || !password) { setError('Ingresa tu nombre y contraseña'); return }
    if (mode === 'register' && !phone.trim()) { setError('Ingresa tu número de teléfono'); return }
    setError('')
    setSubmitting(true)
    try {
      const age = mode === 'register' && birth
        ? Math.floor((Date.now() - new Date(birth).getTime()) / (365.25 * 86400000))
        : undefined
      const res = await fetch('/api/customer-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode, name: name.trim(), password,
          phone: phone.trim() || undefined, age,
        }),
      })
      if (res.ok) {
        const data: Customer = await res.json()
        localStorage.setItem(STORAGE_KEY, data.id)
        setCustomer(data)
        setStep('card')
      } else {
        const d = await res.json()
        setError(d.error ?? 'No se pudo continuar')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setCustomer(null)
    setPassword('')
    setFlipped(false)
    setStep('auth')
  }

  // ───────────────────── PANTALLA DE ACCESO ─────────────────────
  if (step === 'auth') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-5 overflow-y-auto" style={{ backgroundColor: '#000' }}>
        <div className="text-center mb-7">
          <BrandLogo src={brand.logo} color={brand.logoColor} alt="Logo" className="h-20 w-auto mx-auto mb-3" />
          <p className="text-sm font-medium" style={{ color: brand.color }}>Tarjeta de socio</p>
        </div>

        <div className="w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-3" style={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a' }}>
          {/* Conmutador login / registro */}
          <div className="flex rounded-2xl p-1" style={{ backgroundColor: '#1a1a1a' }}>
            {(['login', 'register'] as Mode[]).map(m => (
              <button key={m} type="button"
                onClick={() => { setMode(m); setError('') }}
                className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-colors"
                style={mode === m
                  ? { backgroundColor: brand.color, color: '#fff' }
                  : { color: '#888' }}>
                {m === 'login' ? 'Entrar' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Nombre</label>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setError('') }}
              placeholder="Ej. María González" autoFocus className={INPUT} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Contraseña</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••" className={INPUT} />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Teléfono</label>
                <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setError('') }}
                  placeholder="Ej. 55 1234 5678" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Fecha de nacimiento (opcional)</label>
                <input type="date" value={birth} onChange={e => { setBirth(e.target.value); setError('') }}
                  className={INPUT} style={{ colorScheme: 'dark' }} />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-2xl px-4 py-3 text-sm font-medium text-red-300"
              style={{ backgroundColor: '#2d0a0a', border: '1px solid #7f1d1d' }}>{error}</div>
          )}

          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="w-full text-white font-black py-4 rounded-2xl text-base disabled:opacity-60 transition-colors"
            style={{ backgroundColor: brand.color }}>
            {submitting ? 'Cargando...' : mode === 'login' ? 'Entrar a mi tarjeta' : 'Crear mi tarjeta'}
          </button>
        </div>

        <CustomerNav active="card" />
      </div>
    )
  }

  // ───────────────────── TARJETA ─────────────────────
  const lightColor = `color-mix(in srgb, ${brand.color} 55%, #fff)`
  const cardGradient = `linear-gradient(135deg, color-mix(in srgb, ${brand.color} 25%, #000) 0%, ${brand.color} 60%, ${lightColor} 100%)`
  const memberNo = customer ? customer.id.slice(0, 8).toUpperCase() : ''

  const faceStyle: React.CSSProperties = {
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    background: cardGradient,
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#000' }}>
      <div className="flex flex-col items-center px-4 pt-6">
        {/* ── TARJETA QUE GIRA ── */}
        <div className="w-full max-w-sm" style={{ perspective: '1600px' }}>
          <div role="button" tabIndex={0}
            onClick={() => setFlipped(f => !f)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped(f => !f) } }}
            aria-label="Girar tarjeta"
            className="relative w-full transition-transform duration-700 ease-out cursor-pointer"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              height: '470px',
            }}>

            {/* ───────── CARA FRONTAL: datos del socio ───────── */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl flex flex-col" style={faceStyle}>
              {/* Logo + marca */}
              <div className="flex items-center justify-between px-5 pt-5 pb-2">
                <BrandLogo src={brand.logo} color={brand.logoColor} alt="Logo" className="h-10 w-auto object-contain" />
                {brand.brandLogo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={brand.brandLogo} alt="Marca" className="h-8 w-auto object-contain" />
                  : <span className="text-white font-black text-base tracking-wide">{brand.brandText}</span>}
              </div>

              <div className="px-5">
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: lightColor }}>Tarjeta de socio</p>
                <p className="text-white text-2xl font-black leading-tight truncate mt-0.5">{customer?.name}</p>
              </div>

              {/* Datos */}
              <div className="px-5 mt-5 grid grid-cols-2 gap-x-3 gap-y-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: lightColor }}>N.º de socio</p>
                  <p className="text-white text-sm font-mono font-bold">{memberNo}</p>
                </div>
                <div className="text-right min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: lightColor }}>Miembro desde</p>
                  <p className="text-white text-sm font-semibold">{formatMemberSince(customer?.registeredAt)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: lightColor }}>Teléfono</p>
                  <p className="text-white text-sm font-semibold truncate">{customer?.phone || '—'}</p>
                </div>
                <div className="text-right min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: lightColor }}>Edad</p>
                  <p className="text-white text-sm font-semibold">{customer?.age ? `${customer.age} años` : '—'}</p>
                </div>
              </div>

              {/* Visitas destacadas */}
              <div className="mx-5 mt-5 rounded-2xl px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)' }}>
                <span className="text-white text-sm font-bold uppercase tracking-wide">Visitas acumuladas</span>
                <span className="text-white text-2xl font-black leading-none">{customer?.visits ?? 0}</span>
              </div>

              {/* Pista para girar */}
              <div className="flex items-center justify-center gap-1.5 pb-4 mt-auto text-white/80 text-xs font-semibold">
                <span>Toca para ver tu código</span>
                <span aria-hidden className="text-base leading-none">↻</span>
              </div>
            </div>

            {/* ───────── CARA TRASERA: QR ───────── */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              style={{ ...faceStyle, transform: 'rotateY(180deg)' }}>
              {/* Banda superior estilo tarjeta */}
              <div className="h-9 w-full mt-5" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} />

              <div className="flex-1 flex flex-col items-center justify-center px-5">
                <div className="bg-white rounded-2xl p-4 flex flex-col items-center w-full max-w-[230px]">
                  <QRCode value={customer!.id} size={150} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} />
                </div>
                <p className="text-sm mt-4 font-black text-white">{customer?.name}</p>
                <p className="text-xs mt-1 font-semibold text-center text-white/85">
                  Muestra este QR al empleado para sumar tu visita
                </p>
              </div>

              {/* Pista para girar */}
              <div className="flex items-center justify-center gap-1.5 pb-4 text-white/80 text-xs font-semibold">
                <span aria-hidden className="text-base leading-none">↻</span>
                <span>Toca para volver</span>
              </div>
            </div>
          </div>
        </div>

        <button type="button" onClick={logout}
          className="text-xs font-semibold mt-5" style={{ color: '#777' }}>
          Cerrar sesión
        </button>
      </div>

      <CustomerNav active="card" />
    </div>
  )
}
