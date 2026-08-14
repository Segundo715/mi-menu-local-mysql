'use client'

// Única vista que lee clientes reales de la BD (GET /api/customers).
// Polling cada 10 s para detectar check-ins (requestedAt < 3 min) y notificarlos en tiempo real.
import { useState, useEffect } from 'react'
import AdminNav from '@/app/components/AdminNav'
import { Icon, type IconName } from '@/app/components/Icon'

interface Stamp { timestamp: string; visitsAfter: number }
interface Customer {
  id: string; name: string; phone: string; visits: number
  confirmed: boolean; registeredAt: string; stamps: Stamp[]; requestedAt?: string
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
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function segment(visits: number) {
  if (visits >= 20) return { label: 'Platinum', color: '#c084fc', bg: 'rgba(168,85,247,0.12)' }
  if (visits >= 10) return { label: 'Gold',     color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' }
  if (visits >= 5)  return { label: 'Silver',   color: '#60a5fa', bg: 'rgba(59,130,246,0.12)'  }
  return                   { label: 'Bronze',   color: '#94a3b8', bg: 'rgba(100,116,139,0.12)' }
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [origin, setOrigin] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'activos' | 'pendientes'>('activos')
  const [now, setNow] = useState(() => Date.now())

  async function load() {
    const res = await fetch('/api/customers')
    if (res.ok) setCustomers(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => setOrigin(window.location.origin))
    queueMicrotask(load)
    const interval = setInterval(() => { load(); setNow(Date.now()) }, 10000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function activate(id: string) {
    await fetch(`/api/customers/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm' }),
    })
    load()
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    load()
  }

  function waLink(c: Customer) {
    const link = `${origin}/activate?id=${c.id}`
    const msg = encodeURIComponent(`¡Hola ${c.name}! 🎉 Tu tarjeta de lealtad está lista.\n\nActívala aquí:\n${link}\n\n¡Gracias!`)
    return `https://wa.me/${c.phone.replace(/\D/g, '')}?text=${msg}`
  }

  const pending = customers.filter(c => !c.confirmed)
  const confirmed = customers.filter(c => c.confirmed)
  const checkIns = customers.filter(c => c.requestedAt && now - new Date(c.requestedAt).getTime() < 3 * 60 * 1000)

  const sorted = [...confirmed].sort((a, b) => {
    const aT = a.stamps.at(-1)?.timestamp ?? a.registeredAt
    const bT = b.stamps.at(-1)?.timestamp ?? b.registeredAt
    return bT.localeCompare(aT)
  })

  const filtered = search.trim()
    ? sorted.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
    : sorted

  const totalStamps = confirmed.reduce((s, c) => s + c.visits, 0)
  const readyForCoffee = confirmed.filter(c => c.visits >= STAMPS).length
  const avgVisits = confirmed.length ? (totalStamps / confirmed.length).toFixed(1) : '0'

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />

      <div className="max-w-4xl mx-auto p-4 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-black" style={{ color: S.text }}>Clientes</h1>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>Gestión de tarjetas y activaciones</p>
          </div>
          <button onClick={load} className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ backgroundColor: 'rgba(0,230,118,0.1)', color: S.accent, border: '1px solid rgba(0,230,118,0.3)' }}>
            ↻ Actualizar
          </button>
        </div>

        {/* Check-in alerts */}
        {checkIns.map(c => (
          <div key={c.id} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ backgroundColor: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.4)' }}>
            <span className="animate-bounce" style={{ color: S.accent }}><Icon name="bell" size={26} /></span>
            <div className="flex-1">
              <p className="font-black text-sm" style={{ color: S.accent }}>{c.name} está en el mostrador</p>
              <p className="text-xs" style={{ color: S.sub }}>{c.phone} · {c.visits}/{STAMPS} sellos · {timeAgo(c.requestedAt!)}</p>
            </div>
          </div>
        ))}

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total clientes',   value: confirmed.length,  icon: 'users' as IconName, color: S.accent  },
            { label: 'Sellos totales',   value: totalStamps,       icon: 'coffee' as IconName, color: S.accent  },
            { label: 'Visitas promedio', value: avgVisits,         icon: 'refresh' as IconName, color: '#60a5fa' },
            { label: 'Premio listo',     value: readyForCoffee,    icon: 'gift' as IconName, color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium" style={{ color: S.sub }}>{s.label}</p>
                <span style={{ color: s.color }}><Icon name={s.icon} size={17} /></span>
              </div>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl p-1 gap-1" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <button onClick={() => setTab('activos')}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={tab === 'activos' ? { backgroundColor: S.accent, color: '#000' } : { color: S.sub, backgroundColor: 'transparent' }}>
            Clientes activos ({confirmed.length})
          </button>
          <button onClick={() => setTab('pendientes')}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold relative"
            style={tab === 'pendientes' ? { backgroundColor: '#ef4444', color: '#fff' } : { color: S.sub, backgroundColor: 'transparent' }}>
            Pendientes ({pending.length})
            {pending.length > 0 && tab !== 'pendientes' && (
              <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            )}
          </button>
        </div>

        {/* Search (only on activos tab) */}
        {tab === 'activos' && (
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none"
            style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }} />
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ backgroundColor: S.card }} />
            ))}
          </div>
        ) : tab === 'pendientes' ? (
          pending.length === 0 ? (
            <div className="flex flex-col items-center py-14 rounded-2xl" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
              <span className="mb-2" style={{ color: '#22c55e' }}><Icon name="checkCircle" size={34} /></span>
              <p className="font-semibold" style={{ color: S.text }}>Sin pendientes</p>
              <p className="text-sm mt-1" style={{ color: S.sub }}>Todos los clientes están activados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(c => (
                <div key={c.id} className="rounded-2xl p-4"
                  style={{ backgroundColor: S.card, border: '1px solid rgba(239,68,68,0.25)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-lg shrink-0"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#4f6ef7)' }}>
                      {initial(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold" style={{ color: S.text }}>{c.name}</p>
                      <p className="text-sm" style={{ color: S.sub }}>{c.phone}</p>
                      <p className="text-xs" style={{ color: S.sub }}>Registrado {timeAgo(c.registeredAt)}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full shrink-0"
                      style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}>Pendiente</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => activate(c.id)}
                      className="flex-1 font-bold py-2.5 rounded-xl text-sm"
                      style={{ backgroundColor: S.accent, color: '#000' }}>
                      <span className="inline-flex items-center justify-center gap-1.5"><Icon name="check" size={14} /> Activar</span>
                    </button>
                    {c.phone && (
                      <a href={waLink(c)} target="_blank" rel="noopener noreferrer"
                        className="flex-1 font-bold py-2.5 rounded-xl text-sm text-center"
                        style={{ backgroundColor: '#22c55e', color: '#000' }}>
                        <span className="inline-flex items-center justify-center gap-1.5"><Icon name="message" size={14} /> Enviar link</span>
                      </a>
                    )}
                    <button onClick={() => remove(c.id)}
                      className="px-3 py-2.5 rounded-xl text-sm font-medium"
                      style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', backgroundColor: 'transparent' }} aria-label="Eliminar">
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14 rounded-2xl" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <span className="mb-3" style={{ color: S.sub }}><Icon name={search ? 'search' : 'users'} size={42} /></span>
            <p className="font-semibold" style={{ color: S.text }}>{search ? 'Sin resultados' : 'Sin clientes activos'}</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-12 px-4 py-2.5 text-xs font-bold uppercase tracking-wide"
              style={{ borderBottom: `1px solid ${S.border}`, color: S.sub }}>
              <span className="col-span-4">Cliente</span>
              <span className="col-span-2">Teléfono</span>
              <span className="col-span-2 text-center">Visitas</span>
              <span className="col-span-2 text-center">Tier</span>
              <span className="col-span-2 text-right">Último sello</span>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: S.border }}>
              {filtered.map(c => {
                const seg = segment(c.visits)
                return (
                  <div key={c.id} className="px-4 py-3">
                    {/* Mobile layout */}
                    <div className="flex items-center gap-3 sm:hidden">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#4f6ef7)', color: '#fff' }}>
                        {initial(c.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm truncate" style={{ color: S.text }}>{c.name}</p>
                          {c.visits >= STAMPS && <span style={{ color: '#fbbf24' }}><Icon name="gift" size={12} /></span>}
                        </div>
                        <p className="text-xs" style={{ color: S.sub }}>{c.phone}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-sm" style={{ color: S.accent }}>{c.visits}/{STAMPS}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: seg.bg, color: seg.color }}>{seg.label}</span>
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden sm:grid grid-cols-12 items-center">
                      <div className="col-span-4 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#4f6ef7)', color: '#fff' }}>
                          {initial(c.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate" style={{ color: S.text }}>{c.name}</p>
                          {c.visits >= STAMPS && (
                            <span className="text-xs font-bold inline-flex items-center gap-1" style={{ color: '#fbbf24' }}><Icon name="gift" size={12} /> Premio listo</span>
                          )}
                        </div>
                      </div>
                      <span className="col-span-2 text-sm" style={{ color: S.sub }}>{c.phone}</span>
                      <div className="col-span-2 text-center">
                        <p className="font-bold text-sm" style={{ color: S.accent }}>{c.visits}/{STAMPS}</p>
                        <div className="flex gap-0.5 justify-center mt-1">
                          {Array.from({ length: STAMPS }).map((_, i) => (
                            <div key={i} className="w-3 h-1 rounded-full"
                              style={{ backgroundColor: i < c.visits ? S.accent : 'rgba(255,255,255,0.1)' }} />
                          ))}
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: seg.bg, color: seg.color }}>{seg.label}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-xs" style={{ color: S.sub }}>
                          {c.stamps.at(-1) ? timeAgo(c.stamps.at(-1)!.timestamp) : timeAgo(c.registeredAt)}
                        </p>
                        <button onClick={() => remove(c.id)}
                          className="text-xs mt-0.5 px-2 py-0.5 rounded-lg"
                          style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', backgroundColor: 'transparent' }}>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
