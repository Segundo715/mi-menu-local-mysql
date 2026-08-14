'use client'

// Vista simple: solo lista los comentarios de las reseñas, sin controles de
// publicar/despublicar ni estadísticas. Las buenas (≥4★) ya se publican
// automáticamente en /review; las negativas (≤3★) ya disparan el email de alerta.
import { useState, useEffect } from 'react'
import AdminNav from '@/app/components/AdminNav'
import { Icon } from '@/app/components/Icon'

interface Review {
  id: string; customerName: string; rating: number; comment: string
  createdAt: string; published: boolean; bad: boolean
}

const S = {
  bg:     'var(--ad-bg)',
  card:   'var(--ad-card)',
  accent: 'var(--ad-accent)',
  text:   'var(--ad-text)',
  sub:    'var(--ad-sub)',
  border: 'var(--ad-border)',
}

function initial(name: string) { return name.trim().charAt(0).toUpperCase() }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < rating ? '#facc15' : 'rgba(148,163,184,.3)' }}><Icon name="star" size={13} /></span>
      ))}
    </span>
  )
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchReviews() }, [])

  async function fetchReviews() {
    setLoading(true)
    try {
      const res = await fetch('/api/reviews?all=1')
      if (res.ok) setReviews(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const sorted = [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="pt-1">
          <h1 className="text-xl font-black" style={{ color: S.text }}>Reseñas</h1>
          <p className="text-xs mt-0.5" style={{ color: S.sub }}>Comentarios de los clientes</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl p-4 animate-pulse flex gap-3" style={{ backgroundColor: S.card }}>
                <div className="w-10 h-10 rounded-full shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded-full w-1/3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                  <div className="h-3 rounded-full w-full" style={{ backgroundColor: 'var(--ad-overlay)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center py-16" style={{ color: S.sub }}>
            <span className="mb-3"><Icon name="message" size={42} /></span>
            <p className="font-semibold text-lg" style={{ color: S.text }}>Aún no hay reseñas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map(review => (
              <div key={review.id} className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black shrink-0"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#4f6ef7)' }}>
                    {initial(review.customerName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold" style={{ color: S.text }}>{review.customerName}</p>
                      <p className="text-xs shrink-0" style={{ color: S.sub }}>{fmtDate(review.createdAt)}</p>
                    </div>
                    <StarDisplay rating={review.rating} />
                    <p className="text-sm mt-1 leading-relaxed" style={{ color: S.sub }}>{review.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
