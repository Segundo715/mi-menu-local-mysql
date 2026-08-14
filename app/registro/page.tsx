'use client'

// Registro de lealtad con máquina de estados: checking → form → already → success.
// En "checking" valida registro_card_id en localStorage contra /api/loyalty para evitar
// duplicados si el cliente recarga o vuelve a abrir el link.
import { useState, useEffect } from 'react'

type Step = 'checking' | 'form' | 'already' | 'waiting' | 'active'

const LS_KEY = 'registro_card_id'
const DEFAULT_TITLE = '¡Bienvenido!'
const DEFAULT_SUBTITLE = 'Completa tus datos para registrarte. La información será guardada de forma segura.'

interface Card { id: string; name: string; visits: number; phone: string }

export default function RegistroPage() {
  const [step, setStep] = useState<Step>('checking')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [birth, setBirth] = useState('')
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [welcomeTitle, setWelcomeTitle] = useState(DEFAULT_TITLE)
  const [welcomeSubtitle, setWelcomeSubtitle] = useState(DEFAULT_SUBTITLE)
  const [existingCard, setExistingCard] = useState<Card | null>(null)

  // Auto-redirige a /card cuando la tarjeta ya está activa
  useEffect(() => {
    if (step !== 'active') return
    const t = setTimeout(() => { window.location.href = '/card' }, 3000)
    return () => clearTimeout(t)
  }, [step])

  // Pollea activación cuando está en espera — debe ir antes de los returns condicionales
  useEffect(() => {
    if (step !== 'waiting' || !existingCard) return
    const id = setInterval(() => {
      fetch(`/api/loyalty/${existingCard.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.active) setStep('active') })
        .catch(() => {})
    }, 5000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, existingCard?.id])

  useEffect(() => {
    fetch('/api/settings?key=registro_titulo').then(r => r.json()).then(d => { if (d.value) setWelcomeTitle(d.value) })
    fetch('/api/settings?key=registro_subtitulo').then(r => r.json()).then(d => { if (d.value) setWelcomeSubtitle(d.value) })

    // Verificar si ya está registrado en este dispositivo
    const savedId = localStorage.getItem(LS_KEY)
    if (savedId) {
      fetch(`/api/loyalty/${savedId}`)
        .then(r => r.ok ? r.json() : null)
        .then(card => {
          if (card?.id) {
            setExistingCard(card)
            setStep('already')
          } else {
            localStorage.removeItem(LS_KEY)
            setStep('form')
          }
        })
        .catch(() => { localStorage.removeItem(LS_KEY); setStep('form') })
    } else {
      queueMicrotask(() => setStep('form'))
    }
  }, [])

  async function handleSubmit() {
    if (!name.trim()) { setError('Ingresa tu nombre completo'); return }
    if (!phone.trim()) { setError('Ingresa tu número de WhatsApp'); return }
    if (!birth) { setError('Ingresa tu fecha de nacimiento'); return }
    if (!terms) { setError('Debes aceptar los términos y condiciones'); return }
    setError('')
    setSubmitting(true)
    try {
      const age = Math.floor((Date.now() - new Date(birth).getTime()) / (365.25 * 86400000))
      const res = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), age, cardType: 'cafe' }),
      })
      const card = await res.json()
      if (res.ok) {
        localStorage.setItem(LS_KEY, card.id)
        setExistingCard(card)
        if (res.status === 200) {
          setStep('already')
        } else {
          setStep('active')
        }
      } else {
        setError(card.error ?? 'Error al registrar')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  function registerAnother() {
    localStorage.removeItem(LS_KEY)
    setExistingCard(null)
    setName(''); setPhone(''); setBirth(''); setTerms(false); setError('')
    setStep('form')
  }

  // Pantalla de carga inicial
  if (step === 'checking') {
    return (
      <div key="checking" translate="no" className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0d0d0d' }}>
        <div className="text-center">
          <img src="/logo.png" alt="NICHO" className="h-20 w-auto mx-auto mb-4 animate-pulse" />
          <p className="text-sm" style={{ color: '#555' }}>Verificando...</p>
        </div>
      </div>
    )
  }

  // Ya registrado en este dispositivo
  if (step === 'already' && existingCard) {
    return (
      <div key="already" translate="no" className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#0d0d0d' }}>
        <div className="w-full max-w-sm text-center space-y-6">
          <img src="/logo.png" alt="NICHO" className="h-24 w-auto mx-auto" />
          <div className="rounded-3xl p-8 space-y-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #B90F45' }}>
            <div className="text-5xl">👋</div>
            <h2 className="text-2xl font-black text-white">¡Hola, {existingCard.name.split(' ')[0]}!</h2>
            <p className="text-sm" style={{ color: '#aaa' }}>
              Ya estás registrado en NICHO. Tu número <span className="font-bold text-white">{existingCard.phone}</span> ya tiene una tarjeta activa.
            </p>
            <div className="rounded-2xl py-3 px-4" style={{ backgroundColor: '#0d0d0d' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#555' }}>Sellos acumulados</p>
              <div className="flex justify-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-2xl" style={{ opacity: i < existingCard.visits ? 1 : 0.2 }}>☕</span>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: '#B90F45' }}>
                {existingCard.visits >= 5 ? '¡Tienes un café gratis! 🎉' : `${existingCard.visits}/5 — te faltan ${5 - existingCard.visits}`}
              </p>
            </div>
          </div>
          <button onClick={registerAnother} className="text-sm font-semibold" style={{ color: '#555' }}>
            Registrar a otra persona
          </button>
        </div>
      </div>
    )
  }

  if (step === 'waiting') {
    return (
      <div key="waiting" translate="no" className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#0d0d0d' }}>
        <div className="w-full max-w-sm text-center space-y-6">
          <img src="/logo.png" alt="NICHO" className="h-24 w-auto mx-auto" />
          <div className="rounded-3xl p-8 space-y-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #B90F45' }}>
            <div className="text-5xl animate-pulse">⏳</div>
            <h2 className="text-2xl font-black text-white">¡Registro recibido!</h2>
            <p className="text-sm" style={{ color: '#aaa' }}>
              Hola <span className="font-bold text-white">{existingCard?.name?.split(' ')[0]}</span>, tu solicitud fue enviada al administrador.
            </p>
            <p className="text-xs font-bold" style={{ color: '#B90F45' }}>
              Tu tarjeta se activará en breve. Esta página se actualizará automáticamente.
            </p>
            <div className="flex justify-center gap-1.5 pt-1">
              {[0,1,2].map(i => (
                <span key={i} className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: '#B90F45', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
          <button onClick={registerAnother} className="text-sm font-semibold" style={{ color: '#555' }}>
            Registrar otra persona
          </button>
        </div>
      </div>
    )
  }

  if (step === 'active') {
    return (
      <div key="active" translate="no" className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#0d0d0d' }}>
        <div className="w-full max-w-sm text-center space-y-6">
          <img src="/logo.png" alt="NICHO" className="h-24 w-auto mx-auto" />
          <div className="rounded-3xl p-8 space-y-3" style={{ backgroundColor: '#1a1a1a', border: '1px solid #B90F45' }}>
            <div className="text-5xl">🎉</div>
            <h2 className="text-2xl font-black text-white">¡Tarjeta activada!</h2>
            <p className="text-sm" style={{ color: '#aaa' }}>
              Hola <span className="font-bold text-white">{existingCard?.name?.split(' ')[0]}</span>, tu tarjeta de fidelización ya está activa.
            </p>
            <p className="text-xs font-bold" style={{ color: '#B90F45' }}>
              Acumula 5 visitas y gana un café gratis ☕
            </p>
            <p className="text-xs" style={{ color: '#555' }}>Redirigiendo a tu tarjeta...</p>
          </div>
          <a href="/card"
            className="block w-full py-4 rounded-2xl text-white font-black text-base text-center transition-all"
            style={{ backgroundColor: '#B90F45' }}>
            Ver mi tarjeta ahora
          </a>
          <button onClick={registerAnother} className="text-sm font-semibold" style={{ color: '#555' }}>
            Registrar otra persona
          </button>
        </div>
      </div>
    )
  }

  // Formulario
  return (
    <div key="form" translate="no" className="min-h-screen flex flex-col" style={{ backgroundColor: '#0d0d0d' }}>
      <div className="relative flex flex-col items-center pt-10 pb-6 px-4"
        style={{ background: 'linear-gradient(180deg, #B90F45 0%, #7a0a2e 70%, #0d0d0d 100%)' }}>
        <img src="/logo.png" alt="NICHO" className="h-20 w-auto mb-3" />
        <p className="text-white font-black text-base tracking-widest text-center">Únete a nuestra comunidad</p>
      </div>

      <div className="flex-1 px-5 pb-10 max-w-sm mx-auto w-full space-y-5 pt-4">

        <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#111', border: '1px solid #B90F45' }}>
          <p className="font-black text-white text-base">{welcomeTitle}</p>
          <p className="text-xs mt-1" style={{ color: '#aaa' }}>{welcomeSubtitle}</p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-black text-white mb-2">
            <span style={{ color: '#B90F45' }}>👤</span> Nombre Completo *
          </label>
          <input type="text" value={name} onChange={e => { setName(e.target.value); setError('') }}
            placeholder="Ej: Juan Pérez García"
            className="w-full px-4 py-3.5 rounded-2xl text-sm text-white placeholder-gray-500 outline-none"
            style={{ backgroundColor: '#1a1a1a', border: '1.5px solid #333' }} />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-black text-white mb-2">
            <span style={{ color: '#B90F45' }}>📱</span> Número de WhatsApp *
          </label>
          <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setError('') }}
            placeholder="Ej: 443 123 4567"
            className="w-full px-4 py-3.5 rounded-2xl text-sm text-white placeholder-gray-500 outline-none"
            style={{ backgroundColor: '#1a1a1a', border: '1.5px solid #333' }} />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-black text-white mb-2">
            <span style={{ color: '#B90F45' }}>🎂</span> Fecha de Nacimiento *
          </label>
          <input type="date" value={birth} onChange={e => { setBirth(e.target.value); setError('') }}
            className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
            style={{ backgroundColor: '#1a1a1a', border: '1.5px solid #333', color: birth ? '#fff' : '#6b7280', colorScheme: 'dark' }} />
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative mt-0.5 shrink-0">
            <input type="checkbox" checked={terms} onChange={e => { setTerms(e.target.checked); setError('') }} className="sr-only" />
            <div className="w-5 h-5 rounded flex items-center justify-center border-2 transition-all"
              style={{ backgroundColor: terms ? '#B90F45' : 'transparent', borderColor: terms ? '#B90F45' : '#555' }}>
              {terms && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
            </div>
          </div>
          <p className="text-xs" style={{ color: '#aaa' }}>
            He leído y acepto los{' '}
            <span className="font-bold" style={{ color: '#B90F45' }}>términos y condiciones</span>
            {' '}y la{' '}
            <span className="font-bold" style={{ color: '#B90F45' }}>política de privacidad</span> *
          </p>
        </label>

        {error && (
          <div className="rounded-2xl px-4 py-3 text-sm font-medium text-red-300"
            style={{ backgroundColor: '#2d0a0a', border: '1px solid #7f1d1d' }}>{error}</div>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-4 rounded-2xl text-white font-black text-base disabled:opacity-60 transition-all"
          style={{ backgroundColor: '#B90F45' }}>
          {submitting ? 'Registrando...' : '☕ Unirme a NICHO'}
        </button>
      </div>
    </div>
  )
}
