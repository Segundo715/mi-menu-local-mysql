'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { RewardIcon } from '@/app/components/RewardIcon'
import { BrandLogo } from '@/app/components/BrandLogo'
import { useBrand } from '@/app/components/BrandProvider'

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false })

const STORAGE_KEY = 'registro_card_id'
const CATEGORIES_KEY = 'reward_categories'

const DEFAULT_CAFE = {
  name: 'Tarjeta de Café', reward: 'Café gratis', goal: 5, icon: 'coffee', color: '#B90F45',
  iconColor: '#ffffff', logo: '', logoColor: '', image: '/uploads/menu/SalmonBowl.jpeg',
  brandText: 'NICHO', brandLogo: '',
}

interface CafeConfig {
  name: string; reward: string; goal: number; icon: string; color: string
  iconColor: string; logo: string; logoColor: string; image: string; brandText: string; brandLogo: string
}

interface Customer {
  id: string; name: string; phone: string; visits: number; active: boolean; confirmed: boolean
}

// Texto negro o blanco según la luminancia del color de acento, para que el contraste
// nunca se pierda sin importar qué color esté configurado.
function contrastText(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#000' : '#fff'
}
function contrastTextSoft(hex: string): string {
  return contrastText(hex) === '#000' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)'
}

type Step = 'loading' | 'form' | 'waiting' | 'card'

export default function CardPage() {
  // Nombre/logo/acento ya disponibles sin fetch (layout → BrandProvider) —
  // se usan como semilla inicial para no mostrar el logo/color anteriores
  // mientras el fetch de la categoría (más lento) todavía no resuelve.
  const brand = useBrand()
  const [step, setStep] = useState<Step>('loading')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [cfg, setCfg] = useState<CafeConfig>(() => ({
    ...DEFAULT_CAFE,
    logo: brand.logo || DEFAULT_CAFE.logo,
    logoColor: brand.logoColor || DEFAULT_CAFE.logoColor,
    color: brand.accent || DEFAULT_CAFE.color,
    brandText: brand.name || DEFAULT_CAFE.brandText,
  }))
  const [flipped, setFlipped] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bgColor, setBgColor] = useState('#0a0a0a')
  const [btnColor, setBtnColor] = useState('#141414')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      fetch(`/api/loyalty/${saved}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setCustomer(data)
            setStep(data.active ? 'card' : 'waiting')
          } else {
            localStorage.removeItem(STORAGE_KEY)
            setStep('form')
          }
        })
        .catch(() => { setStep('form') })
    } else {
      queueMicrotask(() => setStep('form'))
    }
    // La identidad general (logo/nombre/acento de "Identidad del restaurante") es el
    // valor por defecto; reward_categories solo la sobreescribe si el admin lo configuró
    // explícitamente para esta categoría de tarjeta.
    Promise.all([
      fetch(`/api/settings?key=${CATEGORIES_KEY}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/settings?key=restaurant_name').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=profile_logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo_color').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_hover_color').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=sidebar_accent').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_bg_color').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_btn_color').then(r => r.json()).catch(() => ({})),
    ]).then(([catRes, nameRes, logoRes, pLogoRes, logoColorRes, hoverRes, accentRes, bgRes, btnRes]) => {
      const brandName = nameRes?.value || brand.name || DEFAULT_CAFE.brandText
      const brandLogoUrl = logoRes?.value || pLogoRes?.value || brand.logo || ''
      const brandLogoColor = logoColorRes?.value || brand.logoColor || ''
      const brandAccent = hoverRes?.value || accentRes?.value || brand.accent || DEFAULT_CAFE.color
      if (bgRes?.value) setBgColor(bgRes.value)
      if (btnRes?.value) setBtnColor(btnRes.value)

      let cafe: (CafeConfig & { id: string }) | null = null
      if (catRes?.value) {
        try {
          const list = JSON.parse(catRes.value)
          cafe = Array.isArray(list) ? (list.find((c: CafeConfig & { id: string }) => c.id === 'cafe') ?? list[0]) : null
        } catch {}
      }

      setCfg({
        name: cafe?.name ?? DEFAULT_CAFE.name,
        reward: cafe?.reward ?? DEFAULT_CAFE.reward,
        goal: Math.max(1, Math.round(cafe?.goal ?? 0) || DEFAULT_CAFE.goal),
        icon: cafe?.icon ?? DEFAULT_CAFE.icon,
        color: cafe?.color || brandAccent,
        iconColor: cafe?.iconColor || DEFAULT_CAFE.iconColor,
        logo: cafe?.logo || brandLogoUrl,
        logoColor: brandLogoColor,
        image: cafe?.image || DEFAULT_CAFE.image,
        brandText: cafe?.brandText || brandName,
        brandLogo: cafe?.brandLogo || DEFAULT_CAFE.brandLogo,
      })
    })
  }, [brand.logo, brand.logoColor, brand.accent, brand.name])

  // Pantalla de espera — pollea hasta que el admin active la tarjeta
  useEffect(() => {
    if (step !== 'waiting' || !customer) return
    const id = setInterval(() => {
      fetch(`/api/loyalty/${customer.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.active) { setCustomer(data); setStep('card') } })
        .catch(() => {})
    }, 5000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, customer?.id])

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) { setError('Completa todos los campos'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), cardType: 'cafe' }),
      })
      if (res.ok) {
        const data: Customer = await res.json()
        localStorage.setItem(STORAGE_KEY, data.id)
        setCustomer(data)
        setStep(data.active ? 'card' : 'waiting')
      } else {
        const d = await res.json()
        setError(d.error ?? 'Error al registrar')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'form') {
    const INPUT = 'w-full rounded-2xl px-4 py-3.5 text-sm text-white placeholder-gray-500 outline-none transition-colors'
    const btnText = contrastText(btnColor)
    const btnTextSoft = contrastTextSoft(btnColor)
    return (
      <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: bgColor }}>
        {/* Hero con gradiente de marca */}
        <div className="relative flex flex-col items-center justify-end pb-8 pt-12 px-6"
          style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${cfg.color} 55%, #000) 0%, ${cfg.color} 60%, color-mix(in srgb, ${cfg.color} 70%, #000) 100%)`, minHeight: '40%' }}>
          <div className="absolute top-4 right-4 w-24 h-24 rounded-full opacity-10 bg-white" />
          <div className="absolute top-12 right-12 w-12 h-12 rounded-full opacity-10 bg-white" />
          <div className="absolute bottom-10 left-6 w-16 h-16 rounded-full opacity-10 bg-white" />
          {cfg.logo && <BrandLogo src={cfg.logo} color={cfg.logoColor} alt={cfg.brandText} className="h-24 w-auto object-contain drop-shadow-2xl relative z-10" />}
          <p className="font-black text-lg tracking-widest text-center mt-4 relative z-10" style={{ color: contrastText(cfg.color) }}>{cfg.brandText}</p>
          <p className="text-sm text-center mt-1 relative z-10" style={{ color: contrastText(cfg.color), opacity: 0.7 }}>
            {cfg.goal} visitas = {cfg.reward} ☕
          </p>
        </div>

        {/* Formulario */}
        <div className="flex-1 flex flex-col items-center px-5 -mt-6 relative z-10">
          <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: btnColor }}>
            <div className="px-6 pt-6 pb-2">
              <h2 className="font-black text-xl" style={{ color: btnText }}>Tu tarjeta de lealtad</h2>
              <p className="text-sm mt-0.5" style={{ color: btnTextSoft }}>Ingresa tus datos para acceder</p>
            </div>
            <div className="px-6 pb-6 pt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: cfg.color }}>Nombre completo</label>
                <input type="text" value={name} onChange={e => { setName(e.target.value); setError('') }}
                  placeholder="Ej. María González" autoFocus className={INPUT}
                  style={{ backgroundColor: '#1e1e1e', border: '1.5px solid #2a2a2a' }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: cfg.color }}>Teléfono</label>
                <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setError('') }}
                  placeholder="Ej. 443 123 4567" className={INPUT}
                  style={{ backgroundColor: '#1e1e1e', border: '1.5px solid #2a2a2a' }} />
              </div>
              {error && (
                <div className="rounded-2xl px-4 py-3 text-sm font-medium text-red-300"
                  style={{ backgroundColor: '#2d0a0a', border: '1px solid #7f1d1d' }}>{error}</div>
              )}
              <button type="button" onClick={handleSubmit} disabled={submitting}
                className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-60 transition-all active:scale-95"
                style={{ backgroundColor: cfg.color, boxShadow: `0 6px 24px ${cfg.color}55`, color: contrastText(cfg.color) }}>
                {submitting ? 'Buscando...' : '☕  Ver mi tarjeta'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'loading') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: bgColor }}>
        {cfg.logo && <BrandLogo src={cfg.logo} color={cfg.logoColor} alt="Logo" className="h-20 w-auto mx-auto mb-4 animate-pulse" />}
        <p className="text-sm" style={{ color: contrastTextSoft(bgColor) }}>Verificando...</p>
      </div>
    )
  }

  if (step === 'waiting') {
    const btnText = contrastText(btnColor)
    const btnTextSoft = contrastTextSoft(btnColor)
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6" style={{ backgroundColor: bgColor }}>
        {cfg.logo && <BrandLogo src={cfg.logo} color={cfg.logoColor} alt="Logo" className="h-20 w-auto mx-auto mb-6" />}
        <div className="w-full max-w-sm rounded-3xl p-8 text-center space-y-4" style={{ backgroundColor: btnColor, border: `1px solid ${cfg.color}` }}>
          <div className="text-5xl animate-pulse">⏳</div>
          <h2 className="text-xl font-black" style={{ color: btnText }}>Registro recibido</h2>
          <p className="text-sm" style={{ color: btnTextSoft }}>
            Hola <span className="font-bold" style={{ color: btnText }}>{customer?.name?.split(' ')[0]}</span>, tu solicitud fue enviada.
          </p>
          <p className="text-xs" style={{ color: cfg.color }}>
            El administrador activará tu tarjeta en breve. Esta página se actualizará automáticamente.
          </p>
          <div className="flex justify-center gap-1 pt-2">
            {[0,1,2].map(i => (
              <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: cfg.color, animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const visits = customer?.visits ?? 0
  const earned = visits >= cfg.goal
  const lightColor = `color-mix(in srgb, ${cfg.color} 55%, #fff)`
  const cardGradient = `linear-gradient(135deg, color-mix(in srgb, ${cfg.color} 25%, #000) 0%, ${cfg.color} 60%, ${lightColor} 100%)`

  // Estilos compartidos por las dos caras de la tarjeta (flip 3D)
  const faceStyle: React.CSSProperties = {
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    background: cardGradient,
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: bgColor }}>
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
              height: '460px',
            }}>

            {/* ───────── CARA FRONTAL (diseño original) ───────── */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl flex flex-col" style={faceStyle}>
              {/* Logo + marca */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                {cfg.logo && <BrandLogo src={cfg.logo} color={cfg.logoColor} alt="Logo" className="h-10 w-auto object-contain" />}
                {cfg.brandLogo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={cfg.brandLogo} alt="Marca" className="h-8 w-auto object-contain" />
                  : <span className="text-white font-black text-base tracking-wide">{cfg.brandText}</span>}
              </div>

              {/* Imagen con sellos superpuestos */}
              <div className="relative" style={{ height: '170px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cfg.image} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-3 px-6">
                  {Array.from({ length: cfg.goal }).map((_, i) => {
                    const filled = i < visits
                    return (
                      <div key={i}
                        className="flex-1 aspect-square rounded-full flex items-center justify-center border-2 transition-all"
                        style={{
                          backgroundColor: filled ? cfg.color : 'rgba(255,255,255,0.18)',
                          borderColor: filled ? 'white' : 'rgba(255,255,255,0.45)',
                          backdropFilter: 'blur(3px)',
                          boxShadow: filled ? `0 0 14px ${cfg.color}` : 'none',
                        }}>
                        {filled && <RewardIcon name={cfg.icon} className="w-3/4 h-3/4" style={{ color: cfg.iconColor }} />}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Oferta + contador sellos */}
              <div className="flex items-start gap-3 px-5 py-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: lightColor }}>Oferta de recompensa</p>
                  <p className="text-white text-sm font-semibold mt-0.5 inline-flex items-center gap-1.5">
                    Cada {cfg.goal} visitas: {cfg.reward}
                    <RewardIcon name={cfg.icon} size={15} style={{ color: cfg.iconColor }} />
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: lightColor }}>Sellos · Premios</p>
                  <p className="text-white text-sm font-black mt-0.5">
                    {visits}/{cfg.goal} · {earned ? '1' : '0'}
                  </p>
                </div>
              </div>

              {/* Pista para girar */}
              <div className="flex items-center justify-center gap-1.5 pb-4 mt-auto text-white/80 text-xs font-semibold">
                <span>Toca para ver tu código</span>
                <span aria-hidden className="text-base leading-none">↻</span>
              </div>
            </div>

            {/* ───────── CARA TRASERA: QR + nombre del titular ───────── */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              style={{ ...faceStyle, transform: 'rotateY(180deg)' }}>
              {/* Logo centrado arriba */}
              <div className="flex justify-center pt-4 pb-2">
                {cfg.logo && <BrandLogo src={cfg.logo} color={cfg.logoColor} alt="Logo" className="h-9 w-auto object-contain" />}
              </div>

              {/* Cinta magnética (decorativa, sin función) */}
              <div aria-hidden className="w-full h-11" style={{ backgroundColor: '#000' }} />

              {/* Nombre grande pegado a la orilla */}
              <p className="text-white text-3xl font-black leading-tight px-5 pt-4 truncate">{customer?.name}</p>

              {/* QR centrado con el aviso justo encima */}
              <div className="flex-1 flex flex-col items-center justify-center px-5">
                <p className="text-sm font-semibold text-center text-white mb-3">
                  {earned ? `🎉 ¡${cfg.reward}! Muéstraselo al cajero` : 'Muestra este QR al empleado'}
                </p>
                <div className="bg-white rounded-2xl p-4 flex flex-col items-center w-full max-w-[230px]">
                  <QRCode value={customer!.id} size={150} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} />
                </div>
              </div>

              {/* Pista para girar */}
              <div className="flex items-center justify-center gap-1.5 pb-4 text-white/80 text-xs font-semibold">
                <span aria-hidden className="text-base leading-none">↻</span>
                <span>Toca para volver</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-center max-w-sm mt-4" style={{ color: contrastTextSoft(bgColor) }}>
          Toca la tarjeta para girarla.
        </p>
      </div>
    </div>
  )
}
