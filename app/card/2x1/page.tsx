'use client'

// Tarjeta de promoción 2x1: cada stamp equivale a una consumición;
// al llegar al umbral, el canje otorga el producto gratis.
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import CustomerNav from '@/app/components/CustomerNav'
import { RewardIcon } from '@/app/components/RewardIcon'
import { BrandLogo } from '@/app/components/BrandLogo'
import { useBrand } from '@/app/components/BrandProvider'

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false })

const STORAGE_KEY = 'loyalty_2x1_id'
const CATEGORIES_KEY = 'reward_categories'
const CATEGORY_ID = 'dosxuno'

// Config por defecto de la "Tarjeta 2x1" (se sobreescribe desde /admin/tarjetas)
const DEFAULT_2X1 = {
  name: 'Tarjeta 2x1', reward: 'Segundo producto gratis', icon: 'gift', color: '#60a5fa',
  iconColor: '#ffffff', logo: '/logo.png', logoColor: '', image: '/uploads/menu/SalmonBowl.jpeg',
  brandText: 'NICHO', brandLogo: '',
}

interface PromoConfig {
  name: string; reward: string; icon: string; color: string
  iconColor: string; logo: string; logoColor: string; image: string; brandText: string; brandLogo: string
}

interface Customer {
  id: string; name: string; phone: string; visits: number; confirmed: boolean
}

type Step = 'form' | 'card'

export default function Card2x1Page() {
  // Nombre/logo de marca ya disponibles sin fetch (layout → BrandProvider) —
  // se usan como semilla inicial para no mostrar el logo/nombre anteriores
  // mientras el fetch de la categoría (más lento) todavía no resuelve.
  const brand = useBrand()
  const [step, setStep] = useState<Step>('form')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cfg, setCfg] = useState<PromoConfig>(() => ({
    ...DEFAULT_2X1,
    logo: brand.logo || DEFAULT_2X1.logo,
    logoColor: brand.logoColor || DEFAULT_2X1.logoColor,
    brandText: brand.name || DEFAULT_2X1.brandText,
  }))
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      fetch(`/api/loyalty/${saved}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) { setCustomer(data); setStep('card') } })
        .catch(() => {})
    }
    // Cargar parámetros de la categoría "Tarjeta 2x1" desde /admin/tarjetas.
    // El logo y el nombre de marca caen a la "Identidad del restaurante" si la
    // categoría no los sobreescribe explícitamente (el color sí es propio del 2x1).
    Promise.all([
      fetch(`/api/settings?key=${CATEGORIES_KEY}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/settings?key=restaurant_name').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=profile_logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo_color').then(r => r.json()).catch(() => ({})),
    ]).then(([catRes, nameRes, logoRes, pLogoRes, logoColorRes]) => {
      const brandName = nameRes?.value || brand.name || DEFAULT_2X1.brandText
      const brandLogoUrl = logoRes?.value || pLogoRes?.value || brand.logo || DEFAULT_2X1.logo
      const brandLogoColor = logoColorRes?.value || brand.logoColor || ''

      let promo: (PromoConfig & { id: string }) | null = null
      if (catRes?.value) {
        try {
          const list = JSON.parse(catRes.value)
          promo = Array.isArray(list) ? list.find((c: PromoConfig & { id: string }) => c.id === CATEGORY_ID) : null
        } catch {}
      }

      setCfg({
        name: promo?.name ?? DEFAULT_2X1.name,
        reward: promo?.reward ?? DEFAULT_2X1.reward,
        icon: promo?.icon ?? DEFAULT_2X1.icon,
        color: promo?.color ?? DEFAULT_2X1.color,
        iconColor: promo?.iconColor || DEFAULT_2X1.iconColor,
        logo: promo?.logo || brandLogoUrl,
        logoColor: brandLogoColor,
        image: promo?.image || DEFAULT_2X1.image,
        brandText: promo?.brandText || brandName,
        brandLogo: promo?.brandLogo || DEFAULT_2X1.brandLogo,
      })
    })
  }, [brand.logo, brand.logoColor, brand.name])

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) { setError('Completa todos los campos'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), cardType: 'dosxuno' }),
      })
      if (res.ok) {
        const data: Customer = await res.json()
        localStorage.setItem(STORAGE_KEY, data.id)
        setCustomer(data)
        setStep('card')
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
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-5" style={{ backgroundColor: '#000' }}>
        <div className="text-center mb-8">
          <BrandLogo src={cfg.logo} color={cfg.logoColor} alt="Logo" className="h-20 w-auto mx-auto mb-3" />
          <p className="text-sm font-medium inline-flex items-center gap-1.5 justify-center" style={{ color: cfg.color }}>
            Promoción 2×1
            <RewardIcon name={cfg.icon} size={16} style={{ color: cfg.iconColor }} />
          </p>
        </div>

        <div className="w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-3" style={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a' }}>
          <p className="text-center text-xs font-bold uppercase tracking-widest pb-1" style={{ color: cfg.color }}>Activa tu cupón 2×1</p>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Nombre</label>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setError('') }}
              placeholder="Ej. María González" autoFocus
              className="w-full rounded-2xl px-4 py-3.5 text-white bg-[#1a1a1a] placeholder-gray-500 focus:outline-none text-sm transition-colors"
              style={{ border: `1px solid ${cfg.color}66` }} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Teléfono</label>
            <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setError('') }}
              placeholder="Ej. 55 1234 5678"
              className="w-full rounded-2xl px-4 py-3.5 text-white bg-[#1a1a1a] placeholder-gray-500 focus:outline-none text-sm transition-colors"
              style={{ border: `1px solid ${cfg.color}66` }} />
          </div>

          {error && (
            <div className="rounded-2xl px-4 py-3 text-sm font-medium text-red-300"
              style={{ backgroundColor: '#2d0a0a', border: '1px solid #7f1d1d' }}>{error}</div>
          )}

          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="w-full text-white font-black py-4 rounded-2xl text-base disabled:opacity-60 transition-colors"
            style={{ backgroundColor: cfg.color }}>
            {submitting ? 'Cargando...' : 'Ver mi cupón'}
          </button>
        </div>
      </div>
    )
  }

  const redeemed = (customer?.visits ?? 0) >= 1
  const lightColor = `color-mix(in srgb, ${cfg.color} 55%, #fff)`
  const cardGradient = `linear-gradient(135deg, color-mix(in srgb, ${cfg.color} 25%, #000) 0%, ${cfg.color} 60%, ${lightColor} 100%)`

  // Estilos compartidos por las dos caras de la tarjeta (flip 3D)
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
              height: '655px',
            }}>

            {/* ───────── CARA FRONTAL ───────── */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl flex flex-col" style={faceStyle}>
              {/* Logo + marca */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <BrandLogo src={cfg.logo} color={cfg.logoColor} alt="Logo" className="h-10 w-auto object-contain" />
                {cfg.brandLogo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={cfg.brandLogo} alt="Marca" className="h-8 w-auto object-contain" />
                  : <span className="text-white font-black text-base tracking-wide">{cfg.brandText}</span>}
              </div>

              {/* Imagen (proporción 4:5) */}
              <div className="relative w-full aspect-[4/5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cfg.image} alt="" className="w-full h-full object-cover" />
              </div>

              {/* Promoción + estado (un solo escaneo) */}
              <div className="flex items-start gap-3 px-5 py-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: lightColor }}>Promoción</p>
                  <p className="text-white text-sm font-semibold mt-0.5 inline-flex items-center gap-1.5">
                    {cfg.reward}
                    <RewardIcon name={cfg.icon} size={15} style={{ color: cfg.iconColor }} />
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: lightColor }}>Canje</p>
                  <p className="text-white text-sm font-black mt-0.5">{redeemed ? 'Usado' : '1 escaneo'}</p>
                </div>
              </div>

              {/* Pista para girar */}
              <div className="flex items-center justify-center gap-1.5 pb-4 mt-auto text-white/80 text-xs font-semibold">
                <span>Toca para ver tu código</span>
                <span aria-hidden className="text-base leading-none">↻</span>
              </div>
            </div>

            {/* ───────── CARA TRASERA: QR + nombre ───────── */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              style={{ ...faceStyle, transform: 'rotateY(180deg)' }}>
              {/* Logo centrado arriba */}
              <div className="flex justify-center pt-4 pb-2">
                <BrandLogo src={cfg.logo} color={cfg.logoColor} alt="Logo" className="h-9 w-auto object-contain" />
              </div>

              {/* Cinta magnética (decorativa, sin función) */}
              <div aria-hidden className="w-full h-11" style={{ backgroundColor: '#000' }} />

              {/* Nombre grande pegado a la orilla */}
              <p className="text-white text-3xl font-black leading-tight px-5 pt-4 truncate">{customer?.name}</p>

              {/* Badge 2×1 (cambia al canjear) */}
              <div className="mx-5 mt-4 relative rounded-2xl flex items-center justify-center gap-3 py-3 transition-all"
                style={redeemed
                  ? { backgroundColor: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.2)' }
                  : { backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.4)' }}>
                <RewardIcon name={cfg.icon} size={32}
                  style={{ color: redeemed ? 'rgba(255,255,255,0.45)' : '#fff' }} />
                <span className="font-black text-4xl leading-none tracking-tight transition-all"
                  style={redeemed
                    ? { color: 'rgba(255,255,255,0.45)', textDecoration: 'line-through' }
                    : { color: '#fff' }}>
                  2×1
                </span>
                {redeemed && (
                  <span className="absolute -right-1 -top-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide -rotate-6"
                    style={{ backgroundColor: '#fff', color: cfg.color, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    ✓ Canjeado
                  </span>
                )}
              </div>

              {/* QR con el aviso justo encima (cerca del badge) */}
              <div className="flex flex-col items-center px-5 mt-4">
                <p className="text-sm font-semibold text-center text-white mb-3">
                  {redeemed ? '🎉 ¡2×1 canjeado! Gracias por tu visita' : 'Muestra este QR al empleado para tu 2×1'}
                </p>
                <div className="bg-white rounded-2xl p-4 flex flex-col items-center w-full max-w-[230px]">
                  <QRCode value={customer!.id} size={150} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} />
                </div>
              </div>

              {/* Pie: términos y pista para girar */}
              <div className="mt-auto flex flex-col items-center gap-2 pb-4">
                <a href="/terminos" onClick={e => e.stopPropagation()}
                  className="text-white/70 text-xs font-semibold underline underline-offset-2 hover:text-white transition-colors">
                  Términos y condiciones
                </a>
                <div className="flex items-center justify-center gap-1.5 text-white/80 text-xs font-semibold">
                  <span aria-hidden className="text-base leading-none">↻</span>
                  <span>Toca para volver</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-center max-w-sm mt-4" style={{ color: '#666' }}>
          Cupón de un solo uso. Válido para una compra 2×1 en {cfg.brandText || 'el local'}.
        </p>
      </div>

      <CustomerNav active="card" />
    </div>
  )
}
