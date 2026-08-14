'use client'

// Tarjeta estilo wallet con diseño tipo pase de Apple Wallet.
// useMemo + useRef se usan para animar el flip de la tarjeta sin re-renders innecesarios.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import CustomerNav from '@/app/components/CustomerNav'
import { RewardIcon } from '@/app/components/RewardIcon'
import { BrandLogo } from '@/app/components/BrandLogo'

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false })

const ACCOUNT_KEY = 'loyalty_account_id'
const CATEGORIES_KEY = 'reward_categories'

interface Customer {
  id: string
  name: string
  phone: string
  age?: number
  visits: number
  confirmed: boolean
  registeredAt: string
}

interface RewardCategory {
  id: string
  name: string
  reward: string
  goal: number
  icon: string
  color: string
  iconColor?: string
  logo?: string
  logoColor?: string
  image?: string
  brandText?: string
  brandLogo?: string
  perks?: string[]
}

type Mode = 'login' | 'register'

const DEFAULT_CATEGORIES: RewardCategory[] = [
  { id: 'cafe', name: 'Tarjeta de Cafe', reward: 'Cafe gratis', goal: 5, icon: 'coffee', color: '#B90F45', iconColor: '#ffffff', logo: '/logo.png', brandText: 'NICHO' },
  { id: 'dosxuno', name: 'Tarjeta 2x1', reward: 'Segundo producto gratis', goal: 4, icon: 'gift', color: '#60a5fa', iconColor: '#ffffff', logo: '/logo.png', brandText: 'NICHO' },
  { id: 'descuento', name: 'Descuento Directo', reward: '20% de descuento', goal: 3, icon: 'percent', color: '#fb923c', iconColor: '#ffffff', logo: '/logo.png', brandText: 'NICHO' },
  { id: 'premium', name: 'Upgrade Premium', reward: 'Beneficios premium', goal: 1, icon: 'crown', color: '#fbbf24', iconColor: '#000000', logo: '/logo.png', brandText: 'NICHO', perks: ['Tamano grande gratis', 'Bebida gratis'] },
]

const INPUT = 'w-full rounded-2xl px-4 py-3.5 text-white bg-[#141414] placeholder-gray-500 focus:outline-none text-sm transition-colors'
const SWIPE_THRESHOLD = 45

function clampProgress(visits: number, goal: number) {
  if (goal <= 0) return 0
  return Math.min(100, Math.round((visits / goal) * 100))
}

export default function WalletPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [categories, setCategories] = useState<RewardCategory[]>(DEFAULT_CATEGORIES)
  const [selected, setSelected] = useState(0)
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [birth, setBirth] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [flipped, setFlipped] = useState(false)
  const swipeStartRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem(ACCOUNT_KEY)
    if (saved) {
      fetch(`/api/loyalty/${saved}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setCustomer(data) })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      queueMicrotask(() => setLoading(false))
    }

    // El logo y el nombre de marca de cada categoría caen a la "Identidad del
    // restaurante" si no están personalizados (el color sí es propio de cada una).
    Promise.all([
      fetch(`/api/settings?key=${CATEGORIES_KEY}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/settings?key=restaurant_name').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=profile_logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo_color').then(r => r.json()).catch(() => ({})),
    ]).then(([catRes, nameRes, logoRes, pLogoRes, logoColorRes]) => {
      const brandName = nameRes?.value || 'Restaurante'
      const brandLogoUrl = logoRes?.value || pLogoRes?.value || '/logo.png'
      const brandLogoColor = logoColorRes?.value || ''
      if (!catRes?.value) {
        setCategories(prev => prev.map(c => ({ ...c, logo: c.logo || brandLogoUrl, logoColor: c.logo ? c.logoColor : brandLogoColor, brandText: c.brandText || brandName })))
        return
      }
      try {
        const parsed = JSON.parse(catRes.value)
        if (Array.isArray(parsed) && parsed.length) {
          setCategories(parsed.map((category: RewardCategory) => ({
            ...category,
            logo: category.logo || brandLogoUrl,
            logoColor: category.logo ? category.logoColor : brandLogoColor,
            brandText: category.brandText || brandName,
          })))
        }
      } catch {}
    })
  }, [])

  const activeCard = categories[selected] ?? categories[0]

  const orderedCards = useMemo(() => {
    return categories.map((category, index) => {
      const offset = index - selected
      const wrappedOffset = offset < 0 ? offset + categories.length : offset
      return { category, index, offset: wrappedOffset }
    })
  }, [categories, selected])

  function changeCard(direction: 1 | -1) {
    setFlipped(false)
    setSelected(prev => (prev + direction + categories.length) % categories.length)
  }

  function handlePointerDown(e: React.PointerEvent<HTMLElement>) {
    swipeStartRef.current = e.clientX
  }

  function handlePointerUp(e: React.PointerEvent<HTMLElement>) {
    if (swipeStartRef.current === null) return

    const delta = e.clientX - swipeStartRef.current
    swipeStartRef.current = null

    if (Math.abs(delta) < SWIPE_THRESHOLD) return

    suppressClickRef.current = true
    changeCard(delta < 0 ? 1 : -1)
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 0)
  }

  function handleCardClick() {
    if (suppressClickRef.current) return
    setFlipped(value => !value)
  }

  async function handleSubmit() {
    if (!name.trim() || !password) {
      setError('Ingresa tu nombre y contrasena')
      return
    }
    if (mode === 'register' && !phone.trim()) {
      setError('Ingresa tu telefono')
      return
    }

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
          action: mode,
          name: name.trim(),
          password,
          phone: phone.trim() || undefined,
          age,
        }),
      })

      if (res.ok) {
        const data: Customer = await res.json()
        localStorage.setItem(ACCOUNT_KEY, data.id)
        setCustomer(data)
      } else {
        const d = await res.json()
        setError(d.error ?? 'No se pudo continuar')
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  function logout() {
    localStorage.removeItem(ACCOUNT_KEY)
    setCustomer(null)
    setPassword('')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ backgroundColor: '#000' }}>
        <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-[#B90F45] animate-spin" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-5 overflow-y-auto" style={{ backgroundColor: '#000' }}>
        <div className="text-center mb-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" className="h-20 w-auto mx-auto mb-3" />
          <p className="text-sm font-medium text-[#B90F45]">Wallet de tarjetas</p>
        </div>

        <div className="w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-3" style={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a' }}>
          <div className="flex rounded-2xl p-1" style={{ backgroundColor: '#1a1a1a' }}>
            {(['login', 'register'] as Mode[]).map(item => (
              <button key={item} type="button"
                onClick={() => { setMode(item); setError('') }}
                className="flex-1 py-2 rounded-xl text-xs font-black uppercase transition-colors"
                style={mode === item ? { backgroundColor: '#B90F45', color: '#fff' } : { color: '#888' }}>
                {item === 'login' ? 'Entrar' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Nombre</span>
            <input value={name} onChange={e => { setName(e.target.value); setError('') }}
              placeholder="Ej. Maria Gonzalez" className={INPUT} style={{ border: '1px solid rgba(185,15,69,0.4)' }} />
          </label>

          <label className="block">
            <span className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Contrasena</span>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="********" className={INPUT} style={{ border: '1px solid rgba(185,15,69,0.4)' }} />
          </label>

          {mode === 'register' && (
            <>
              <label className="block">
                <span className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Telefono</span>
                <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setError('') }}
                  placeholder="Ej. 55 1234 5678" className={INPUT} style={{ border: '1px solid rgba(185,15,69,0.4)' }} />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Fecha de nacimiento</span>
                <input type="date" value={birth} onChange={e => { setBirth(e.target.value); setError('') }}
                  className={INPUT} style={{ border: '1px solid rgba(185,15,69,0.4)', colorScheme: 'dark' }} />
              </label>
            </>
          )}

          {error && (
            <div className="rounded-2xl px-4 py-3 text-sm font-medium text-red-300"
              style={{ backgroundColor: '#2d0a0a', border: '1px solid #7f1d1d' }}>
              {error}
            </div>
          )}

          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="w-full text-white font-black py-4 rounded-2xl text-base disabled:opacity-60 transition-colors"
            style={{ backgroundColor: '#B90F45' }}>
            {submitting ? 'Cargando...' : mode === 'login' ? 'Abrir wallet' : 'Crear wallet'}
          </button>
        </div>

        <CustomerNav active="card" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28 overflow-hidden" style={{ backgroundColor: '#000' }}>
      <main className="mx-auto w-full max-w-lg px-4 pt-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B90F45]">Wallet</p>
            <h1 className="text-white text-2xl font-black leading-tight truncate">{customer.name}</h1>
          </div>
          <BrandLogo src={activeCard.logo || '/logo.png'} color={activeCard.logoColor} className="h-10 w-10 object-contain shrink-0" />
        </div>

        <section
          className="relative mt-8 h-[455px] touch-pan-y select-none"
          style={{ perspective: '1600px' }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => { swipeStartRef.current = null }}
        >
          {orderedCards.map(({ category, index, offset }) => {
            const isActive = index === selected
            const depth = isActive ? 0 : Math.min(offset, 4)
            const cardProgress = clampProgress(customer.visits, category.goal)
            const earned = customer.visits >= category.goal
            const lightColor = `color-mix(in srgb, ${category.color} 55%, #fff)`
            const cardGradient = `linear-gradient(135deg, color-mix(in srgb, ${category.color} 25%, #000) 0%, ${category.color} 60%, ${lightColor} 100%)`
            const style: CSSProperties = {
              zIndex: isActive ? 30 : 20 - depth,
              transform: isActive
                ? 'translate3d(0, 0, 80px) rotate(0deg) scale(1)'
                : `translate3d(${depth * 14}px, ${depth * 18}px, ${-depth * 42}px) rotate(${depth * 2.3}deg) scale(${1 - depth * 0.04})`,
              opacity: depth > 3 ? 0 : 1,
              boxShadow: isActive ? '0 24px 54px rgba(0,0,0,0.5)' : '0 18px 45px rgba(0,0,0,0.45)',
              pointerEvents: isActive ? 'auto' : 'none',
            }
            const faceStyle: CSSProperties = {
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: cardGradient,
            }

            return (
              <div key={category.id}
                className="absolute left-0 right-0 top-0 mx-auto h-[405px] w-[92%] max-w-[340px] transition-all duration-500 ease-out sm:h-[430px] sm:max-w-sm"
                style={style}
              >
                <div role="button" tabIndex={isActive ? 0 : -1}
                  onClick={isActive ? handleCardClick : undefined}
                  onKeyDown={e => { if (isActive && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleCardClick() } }}
                  aria-label="Girar tarjeta"
                  className="relative h-full w-full cursor-pointer transition-transform duration-700 ease-out"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isActive && flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}>

                  <div className="absolute inset-0 flex flex-col overflow-hidden rounded-3xl shadow-2xl" style={faceStyle}>
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                      <BrandLogo src={category.logo || '/logo.png'} color={category.logoColor} alt="Logo" className="h-10 w-auto object-contain" />
                      {category.brandLogo
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={category.brandLogo} alt="Marca" className="h-8 w-auto object-contain" />
                        : <span className="text-white font-black text-base tracking-wide">{category.brandText || 'NICHO'}</span>}
                    </div>

                    <div className="relative h-[145px] sm:h-[165px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={category.image || '/uploads/menu/SalmonBowl.jpeg'} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center gap-3 px-6">
                        {Array.from({ length: category.goal }).map((_, stampIndex) => {
                          const filled = stampIndex < customer.visits
                          return (
                            <div key={stampIndex}
                              className="flex-1 aspect-square rounded-full flex items-center justify-center border-2 transition-all"
                              style={{
                                backgroundColor: filled ? category.color : 'rgba(255,255,255,0.18)',
                                borderColor: filled ? 'white' : 'rgba(255,255,255,0.45)',
                                backdropFilter: 'blur(3px)',
                                boxShadow: filled ? `0 0 14px ${category.color}` : 'none',
                              }}>
                              {filled && <RewardIcon name={category.icon} className="h-3/4 w-3/4" style={{ color: category.iconColor || '#fff' }} />}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="flex items-start gap-3 px-5 py-4"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black uppercase tracking-widest" style={{ color: lightColor }}>{category.name}</p>
                        <p className="text-white text-sm font-semibold mt-0.5 inline-flex items-center gap-1.5">
                          Cada {category.goal} avances: {category.reward}
                          <RewardIcon name={category.icon} size={15} style={{ color: category.iconColor || '#fff' }} />
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black uppercase tracking-widest" style={{ color: lightColor }}>Avance</p>
                        <p className="text-white text-sm font-black mt-0.5">
                          {customer.visits}/{category.goal} · {earned ? 'Listo' : `${cardProgress}%`}
                        </p>
                      </div>
                    </div>

                    <div className="px-5">
                      <div className="h-2 overflow-hidden rounded-full bg-white/20">
                        <span className="block h-full rounded-full bg-white transition-all duration-500" style={{ width: `${cardProgress}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 pb-4 mt-auto text-white/80 text-xs font-semibold">
                      <span>Toca para ver tu codigo</span>
                      <span aria-hidden className="text-base leading-none">↻</span>
                    </div>
                  </div>

                  <div className="absolute inset-0 flex flex-col overflow-hidden rounded-3xl shadow-2xl"
                    style={{ ...faceStyle, transform: 'rotateY(180deg)' }}>
                    <div className="flex justify-center pt-5 pb-2">
                      <BrandLogo src={category.logo || '/logo.png'} color={category.logoColor} alt="Logo" className="h-9 w-auto object-contain" />
                    </div>

                    <div className="h-9 w-full mt-2" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} />

                    <div className="flex-1 flex flex-col items-center justify-center px-5">
                      <div className="bg-white rounded-2xl p-4 flex flex-col items-center w-full max-w-[230px]">
                        <QRCode value={`${customer.id}:${category.id}`} size={150} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} />
                      </div>
                      <p className="text-sm mt-4 font-black text-white">{customer.name}</p>
                      <p className="text-xs mt-1 font-semibold text-center text-white/85">
                        Muestra este QR para usar {category.name}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 pb-4 text-white/80 text-xs font-semibold">
                      <span aria-hidden className="text-base leading-none">↻</span>
                      <span>Toca para volver</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        <div className="mt-2 flex justify-center gap-2">
          {categories.map((category, index) => (
            <button key={category.id} type="button" onClick={() => setSelected(index)}
              className="h-2.5 rounded-full transition-all duration-300"
              style={{
                width: selected === index ? 28 : 10,
                backgroundColor: selected === index ? category.color : 'rgba(255,255,255,0.22)',
              }}
              aria-label={`Ver ${category.name}`} />
          ))}
        </div>

        {activeCard.perks && activeCard.perks.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeCard.perks.map(perk => (
              <span key={perk} className="rounded-full px-3 py-1.5 text-xs font-bold text-white"
                style={{ backgroundColor: `${activeCard.color}33`, border: `1px solid ${activeCard.color}66` }}>
                {perk}
              </span>
            ))}
          </div>
        )}

        <button type="button" onClick={logout}
          className="mx-auto mt-6 block text-xs font-semibold text-gray-600">
          Cerrar wallet
        </button>
      </main>

      <CustomerNav active="card" />
    </div>
  )
}
