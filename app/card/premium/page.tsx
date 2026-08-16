'use client'

// Variante premium de la tarjeta de fidelidad: muestra tier Gold/Platinum según stamps.
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import CustomerNav from '@/app/components/CustomerNav'
import { RewardIcon } from '@/app/components/RewardIcon'
import { BrandLogo } from '@/app/components/BrandLogo'

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false })

const STORAGE_KEY = 'loyalty_premium_id'
const CATEGORIES_KEY = 'reward_categories'
const CATEGORY_ID = 'premium'

// Config por defecto de la "Tarjeta Premium/Upgrade" (se sobreescribe desde /admin/tarjetas)
const DEFAULT_PREMIUM = {
  name: 'Upgrade Premium', reward: 'Beneficios premium', icon: 'crown', color: '#fbbf24',
  iconColor: '#000000', logo: '/logo.png', logoColor: '', image: '/uploads/menu/SalmonBowl.jpeg',
  brandText: 'NICHO', brandLogo: '', perks: ['Tamaño grande gratis', 'Bebida gratis'] as string[],
}

interface PremiumConfig {
  name: string; reward: string; icon: string; color: string
  iconColor: string; logo: string; logoColor: string; image: string; brandText: string; brandLogo: string
  perks: string[]
}

interface Customer {
  id: string; name: string; phone: string; visits: number; confirmed: boolean
}

type Step = 'form' | 'card'

export default function CardPremiumPage() {
  const [step, setStep] = useState<Step>('form')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cfg, setCfg] = useState<PremiumConfig>(DEFAULT_PREMIUM)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      fetch(`/api/loyalty/${saved}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) { setCustomer(data); setStep('card') } })
        .catch(() => {})
    }
    // Cargar parámetros de la categoría "Premium" desde /admin/tarjetas.
    // El logo y el nombre de marca caen a la "Identidad del restaurante" si la
    // categoría no los sobreescribe explícitamente (el color sí es propio del premium).
    Promise.all([
      fetch(`/api/settings?key=${CATEGORIES_KEY}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/settings?key=restaurant_name').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=profile_logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo_color').then(r => r.json()).catch(() => ({})),
    ]).then(([catRes, nameRes, logoRes, pLogoRes, logoColorRes]) => {
      const brandName = nameRes?.value || DEFAULT_PREMIUM.brandText
      const brandLogoUrl = logoRes?.value || pLogoRes?.value || DEFAULT_PREMIUM.logo
      const brandLogoColor = logoColorRes?.value || ''

      let promo: (PremiumConfig & { id: string }) | null = null
      if (catRes?.value) {
        try {
          const list = JSON.parse(catRes.value)
          promo = Array.isArray(list) ? list.find((c: PremiumConfig & { id: string }) => c.id === CATEGORY_ID) : null
        } catch {}
      }

      setCfg({
        name: promo?.name ?? DEFAULT_PREMIUM.name,
        reward: promo?.reward ?? DEFAULT_PREMIUM.reward,
        icon: promo?.icon ?? DEFAULT_PREMIUM.icon,
        color: promo?.color ?? DEFAULT_PREMIUM.color,
        iconColor: promo?.iconColor || DEFAULT_PREMIUM.iconColor,
        logo: promo?.logo || brandLogoUrl,
        logoColor: brandLogoColor,
        image: promo?.image || DEFAULT_PREMIUM.image,
        brandText: promo?.brandText || brandName,
        brandLogo: promo?.brandLogo || DEFAULT_PREMIUM.brandLogo,
        perks: promo && Array.isArray(promo.perks) ? promo.perks : DEFAULT_PREMIUM.perks,
      })
    })
  }, [])

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) { setError('Completa todos los campos'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), cardType: 'premium' }),
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
            Versión Premium
            <RewardIcon name={cfg.icon} size={16} style={{ color: cfg.color }} />
          </p>
        </div>

        <div className="w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-3" style={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a' }}>
          <p className="text-center text-xs font-bold uppercase tracking-widest pb-1" style={{ color: cfg.color }}>Activa tu versión Premium</p>

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
            className="w-full font-black py-4 rounded-2xl text-base disabled:opacity-60 transition-colors"
            style={{ backgroundColor: cfg.color, color: cfg.iconColor }}>
            {submitting ? 'Cargando...' : 'Ver mi versión Premium'}
          </button>
        </div>
      </div>
    )
  }

  const lightColor = `color-mix(in srgb, ${cfg.color} 55%, #fff)`
  const perks = cfg.perks.length ? cfg.perks : [cfg.reward]
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
              height: '480px',
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

              {/* Imagen con badge PREMIUM */}
              <div className="relative" style={{ height: '150px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cfg.image} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
                  <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(4px)' }}>
                    <RewardIcon name={cfg.icon} size={30} style={{ color: '#fff' }} />
                    <span className="text-white font-black text-2xl leading-none tracking-widest">PREMIUM</span>
                  </div>
                </div>
              </div>

              {/* Beneficios incluidos */}
              <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: lightColor }}>Tu versión Premium incluye</p>
                <div className="space-y-2">
                  {perks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                        style={{ backgroundColor: '#fff', color: cfg.color }}>✓</span>
                      <span className="text-white text-sm font-semibold">{perk}</span>
                    </div>
                  ))}
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

              {/* QR centrado con el aviso justo encima */}
              <div className="flex-1 flex flex-col items-center justify-center px-5">
                <p className="text-sm font-semibold text-center text-white mb-3">
                  Muestra este QR al empleado para tus beneficios Premium
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

        <p className="text-xs text-center max-w-sm mt-4" style={{ color: '#666' }}>
          Versión Premium de {cfg.brandText || 'el local'}. Beneficios sujetos a disponibilidad.
        </p>
      </div>

      <CustomerNav active="card" />
    </div>
  )
}
