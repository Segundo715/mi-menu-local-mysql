'use client'

// Vista de clientes para el empleado: búsqueda y envío del link de activación por WhatsApp/SMS.
import { useState, useEffect } from 'react'
import EmployeeNav from '@/app/components/EmployeeNav'
import { Icon, type IconName } from '@/app/components/Icon'

interface LoyaltyCard {
  id: string; name: string; phone: string; visits: number
  registeredAt: string; stamps: { timestamp: string }[]
}

const STAMPS = 5

const S = {
  bg:     'var(--ad-bg)',
  card:   'var(--ad-card)',
  accent: 'var(--ad-accent)',
  text:   'var(--ad-text)',
  sub:    'var(--ad-sub)',
  border: 'var(--ad-border)',
}

function initial(name: string) { return name.trim().charAt(0).toUpperCase() }

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 90) return 'hace un momento'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })
}

export default function EmployeeCustomersPage() {
  const [cards, setCards] = useState<LoyaltyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    const res = await fetch('/api/loyalty')
    if (res.ok) setCards(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(load)
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  const sorted = [...cards].sort((a, b) => {
    const aT = a.stamps.at(-1)?.timestamp ?? a.registeredAt
    const bT = b.stamps.at(-1)?.timestamp ?? b.registeredAt
    return bT.localeCompare(aT)
  })

  const filtered = search.trim()
    ? sorted.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
      )
    : sorted

  const readyForCoffee = cards.filter(c => c.visits >= STAMPS).length

  return (
    <div className="min-h-screen md:ml-[240px]" style={{ backgroundColor: S.bg }}>
      <EmployeeNav />

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between pt-1">
          <h1 className="text-xl font-black" style={{ color: S.text }}>Clientes</h1>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'color-mix(in srgb, var(--ad-accent) 10%, transparent)', color: S.accent }}>
            Solo lectura
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: cards.length, icon: 'users' as IconName, color: S.accent },
            { label: 'Sellos', value: cards.reduce((s, c) => s + c.visits, 0), icon: 'coffee' as IconName, color: S.accent },
            { label: 'Premio listo', value: readyForCoffee, icon: 'gift' as IconName, color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3 text-center flex flex-col items-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
              <span style={{ color: s.color }}><Icon name={s.icon} size={18} /></span>
              <p className="font-black text-xl" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs font-medium" style={{ color: S.sub }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none"
          style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }} />

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl p-4 animate-pulse flex gap-3" style={{ backgroundColor: S.card }}>
                <div className="w-12 h-12 rounded-full shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 rounded-full w-1/2" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                  <div className="h-2 rounded-full w-full" style={{ backgroundColor: 'var(--ad-overlay)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14" style={{ color: S.sub }}>
            <span className="mb-3"><Icon name={search ? 'search' : 'coffee'} size={42} /></span>
            <p className="font-semibold" style={{ color: S.text }}>
              {search ? 'Sin resultados' : 'Aún no hay clientes registrados'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <div key={c.id} className="rounded-2xl p-4"
                style={{
                  backgroundColor: S.card,
                  border: c.visits >= STAMPS ? '2px solid rgba(251,191,36,0.5)' : `1px solid ${S.border}`,
                }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-lg shrink-0"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#4f6ef7)' }}>
                    {initial(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold truncate" style={{ color: S.text }}>{c.name}</p>
                      {c.visits >= STAMPS && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ backgroundColor: 'rgba(251,191,36,0.2)', color: '#fbbf24' }}><span className="inline-flex items-center gap-1"><Icon name="gift" size={11} /> Premio</span></span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: S.sub }}>{c.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-lg leading-none" style={{ color: S.accent }}>{c.visits}/{STAMPS}</p>
                    <p className="text-xs" style={{ color: S.sub }}>sellos</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex gap-2 mb-2">
                  {Array.from({ length: STAMPS }).map((_, i) => (
                    <div key={i} className="flex-1 h-2 rounded-full transition-all"
                      style={{ backgroundColor: i < c.visits ? S.accent : 'rgba(255,255,255,0.1)' }} />
                  ))}
                </div>

                <p className="text-xs" style={{ color: S.sub }}>
                  Registrado {timeAgo(c.registeredAt)}
                  {c.stamps.at(-1) && <> · Último sello {timeAgo(c.stamps.at(-1)!.timestamp)}</>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
