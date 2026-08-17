'use client'

// Formulario público para dejar una reseña. Las reseñas solo se ven en el
// admin (/admin/reviews) — este formulario no muestra ninguna reseña.
import { useState, useEffect } from 'react'
import { BrandLogo } from '@/app/components/BrandLogo'
import { useBrand } from '@/app/components/BrandProvider'

const RATING_LABELS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente']
const RATING_COLORS = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-emerald-400']

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  const active = hover || value
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} type="button"
            onClick={() => onChange(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            className={`text-4xl transition-all active:scale-90 ${
              i <= active ? 'text-yellow-400 scale-110' : 'text-gray-600'
            }`}>
            ★
          </button>
        ))}
      </div>
      {active > 0 && (
        <p className={`text-sm font-bold ${RATING_COLORS[active]}`}>{RATING_LABELS[active]}</p>
      )}
    </div>
  )
}

// Texto negro o blanco según la luminancia del color de fondo, para que el
// contraste nunca se pierda sin importar qué color esté configurado.
function contrastText(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#000' : '#fff'
}
// Versión atenuada del color de contraste, para textos secundarios.
function contrastTextSoft(hex: string): string {
  return contrastText(hex) === '#000' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)'
}

export default function ReviewPage() {
  const [rating, setRating] = useState(0)
  const [customerName, setCustomerName] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(false)

  // Nombre/logo/acento ya disponibles sin fetch (layout → BrandProvider) —
  // se usan como semilla inicial para no mostrar el logo/color anteriores
  // mientras el fetch de abajo (más lento) todavía no resuelve.
  const brand = useBrand()
  const [accent, setAccent] = useState(() => brand.accent || '#B90F45')
  const [bgColor, setBgColor] = useState('#000000')
  const [btnColor, setBtnColor] = useState('#0d0d0d')
  const [logo, setLogo] = useState(() => brand.logo || '/logo.png')
  const [logoColor, setLogoColor] = useState(() => brand.logoColor || '')
  const [brandName, setBrandName] = useState(() => brand.name || 'Restaurante')

  useEffect(() => {
    Promise.all([
      fetch('/api/settings?key=menu_hover_color').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=sidebar_accent').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_bg_color').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_btn_color').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=profile_logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=menu_logo_color').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings?key=restaurant_name').then(r => r.json()).catch(() => ({})),
    ]).then(([hoverRes, accentRes, bgRes, btnRes, logoRes, pLogoRes, logoColorRes, nameRes]) => {
      const finalAccent = hoverRes?.value || accentRes?.value
      const finalLogo = logoRes?.value || pLogoRes?.value
      if (finalAccent) setAccent(finalAccent)
      if (bgRes?.value) setBgColor(bgRes.value)
      if (btnRes?.value) setBtnColor(btnRes.value)
      if (finalLogo) setLogo(finalLogo)
      setLogoColor(logoColorRes?.value || '')
      if (nameRes?.value) setBrandName(nameRes.value)
    })
  }, [])

  const accentText = contrastText(accent)
  const bgText = contrastText(bgColor)
  const btnText = contrastText(btnColor)
  const btnTextSoft = contrastTextSoft(btnColor)

  async function submitReview() {
    setReviewError('')
    if (rating === 0) { setReviewError('Selecciona una calificación.'); return }
    if (!customerName.trim()) { setReviewError('El nombre es obligatorio.'); return }
    if (!comment.trim()) { setReviewError('El comentario es obligatorio.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, customerName: customerName.trim(), comment: comment.trim() }),
      })
      if (res.ok) {
        setReviewSuccess(true); setRating(0); setCustomerName(''); setComment('')
      } else {
        const d = await res.json()
        setReviewError(d.error ?? 'Error al enviar la reseña')
      }
    } catch {
      setReviewError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const INPUT = 'w-full border border-white/20 rounded-2xl px-4 py-3 text-white bg-[#1a1a1a] placeholder-gray-500 focus:outline-none transition-colors'

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: bgColor }}>
      {/* Header */}
      <div className="sticky top-0 z-20 shadow-lg" style={{ backgroundColor: bgColor, borderBottom: `1px solid ${accent}` }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <BrandLogo src={logo} color={logoColor} alt={brandName} className="h-9 w-auto" />
          <h1 className="font-black text-base tracking-tight" style={{ color: bgText }}>Reseñas</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-5">

        {/* Form */}
        <section className="rounded-3xl overflow-hidden" style={{ backgroundColor: btnColor }}>
          <div className="px-5 py-4">
            <h2 className="text-base font-black" style={{ color: btnText }}>Deja tu reseña</h2>
            <p className="text-xs mt-0.5" style={{ color: btnTextSoft }}>Tu opinión nos ayuda a mejorar</p>
          </div>

          {reviewSuccess ? (
            <div className="p-8 text-center">
              <p className="text-5xl mb-3">🎉</p>
              <p className="font-black text-xl" style={{ color: btnText }}>¡Gracias por tu reseña!</p>
              <p className="text-sm mt-1" style={{ color: btnTextSoft }}>Tu opinión ya fue enviada</p>
              <button type="button" onClick={() => setReviewSuccess(false)}
                className="mt-4 text-sm font-semibold underline" style={{ color: accent }}>
                Escribir otra reseña
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: btnTextSoft }}>Calificación</label>
                <StarPicker value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: btnTextSoft }}>Tu nombre</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                  placeholder="Ej. María González" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: btnTextSoft }}>Comentario</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Cuéntanos tu experiencia..." rows={3}
                  className="w-full border border-white/20 rounded-2xl px-4 py-3 text-sm text-white bg-[#1a1a1a] placeholder-gray-500 focus:outline-none resize-none transition-colors" />
              </div>
              {reviewError && (
                <div className="border rounded-2xl px-4 py-3 text-sm font-medium text-red-300" style={{ backgroundColor: '#2d0a0a', borderColor: '#7f1d1d' }}>{reviewError}</div>
              )}
              <button type="button" onClick={submitReview} disabled={submitting}
                className="w-full font-black py-4 rounded-2xl text-base disabled:opacity-60 transition-colors"
                style={{ backgroundColor: accent, color: accentText }}>
                {submitting ? 'Enviando...' : '★ Enviar reseña'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
