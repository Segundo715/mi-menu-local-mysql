'use client'

// Cartelería para pantalla en sala: rota slides de /api/tv (15 s imagen, 30 s oferta).
// Recarga el catálogo cada 30 s para reflejar cambios del admin sin recargar la página.
import { useState, useEffect, useRef } from 'react'

interface TVSlide {
  id: string
  title: string
  subtitle?: string
  price?: string
  imageUrl?: string
  isOffer: boolean
  order: number
  active: boolean
}

const IMAGE_DURATION = 15000
const OFFER_DURATION = 30000

export default function TVPage() {
  const [slides, setSlides] = useState<TVSlide[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [progress, setProgress] = useState(0)
  const [time, setTime] = useState('')
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch slides on mount and every 30s
  useEffect(() => {
    fetchSlides()
    const poll = setInterval(fetchSlides, 30000)
    return () => clearInterval(poll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clock
  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-rotate slides
  useEffect(() => {
    if (slides.length <= 1) return
    const duration = slides[currentIdx]?.isOffer ? OFFER_DURATION : IMAGE_DURATION
    startSlideTimer(duration)
    return () => clearTimers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, currentIdx])

  async function fetchSlides() {
    try {
      const res = await fetch('/api/tv')
      if (res.ok) {
        const data: TVSlide[] = await res.json()
        setSlides(data)
      }
    } catch {
      // silently ignore
    }
  }

  function clearTimers() {
    if (progressRef.current) clearInterval(progressRef.current)
    if (slideTimerRef.current) clearTimeout(slideTimerRef.current)
  }

  function startSlideTimer(duration: number) {
    clearTimers()
    setProgress(0)

    const startTime = Date.now()
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min((elapsed / duration) * 100, 100)
      setProgress(pct)
    }, 50)

    slideTimerRef.current = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % slides.length)
        setVisible(true)
        setProgress(0)
      }, 400)
    }, duration)
  }

  const current = slides[currentIdx] ?? null

  return (
    <div className="fixed inset-0 bg-gray-950 overflow-hidden">
      {current ? (
        <div
          className="absolute inset-0 transition-opacity duration-400"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {/* Background image */}
          {current.imageUrl && (
            <img
              src={current.imageUrl}
              alt={current.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

          {/* Content */}
          <div className="absolute bottom-16 left-0 right-0 px-10 pb-4">
            {current.subtitle && (
              <p className="text-amber-400 text-2xl font-medium mb-2">{current.subtitle}</p>
            )}
            <h1 className="text-white text-6xl font-black leading-tight mb-3">
              {current.title}
            </h1>
            {current.price && (
              <p className="text-green-400 text-7xl font-black">{current.price}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
          <span className="text-8xl">☕</span>
          <p className="text-white text-3xl font-bold">Restaurante</p>
        </div>
      )}

      {/* Progress bar */}
      {slides.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
          <div
            className="h-full bg-amber-400 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Slide indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIdx ? 'bg-white w-4' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* Clock */}
      <div className="absolute bottom-4 right-4 text-white/60 text-sm font-mono">
        {time}
      </div>
    </div>
  )
}
