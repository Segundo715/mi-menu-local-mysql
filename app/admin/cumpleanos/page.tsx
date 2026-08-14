'use client'

import { useState, useEffect } from 'react'
import AdminNav from '@/app/components/AdminNav'
import { Icon } from '@/app/components/Icon'

interface Registro {
  id: string
  name: string
  phone: string
  birthdate: string
  createdAt: string
}

const S = {
  bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)',
  text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)',
}

function fmtBirthdate(iso: string) {
  const [, m, d] = iso.split('-')
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`
}

function todayMonth() {
  return new Date().getMonth() + 1
}

function todayDay() {
  return new Date().getDate()
}

function isThisMonth(iso: string) {
  const m = parseInt(iso.split('-')[1])
  return m === todayMonth()
}

function isToday(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return m === todayMonth() && d === todayDay()
}

function daysUntilBirthday(iso: string): number {
  const [, m, d] = iso.split('-').map(Number)
  const now = new Date()
  const next = new Date(now.getFullYear(), m - 1, d)
  if (next < now) next.setFullYear(next.getFullYear() + 1)
  return Math.ceil((next.getTime() - now.getTime()) / 86400000)
}

export default function AdminCumpleanosPage() {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todos' | 'mes' | 'hoy'>('todos')

  async function fetchRegistros() {
    setLoading(true)
    try {
      const res = await fetch('/api/cumpleanos')
      if (res.ok) setRegistros(await res.json())
    } finally { setLoading(false) }
  }

  useEffect(() => { queueMicrotask(fetchRegistros) }, [])

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    await fetch(`/api/cumpleanos/${id}`, { method: 'DELETE' })
    fetchRegistros()
  }

  const filtered = registros
    .filter(r => {
      if (filter === 'hoy') return isToday(r.birthdate)
      if (filter === 'mes') return isThisMonth(r.birthdate)
      return true
    })
    .filter(r => {
      const q = search.toLowerCase()
      return !q || r.name.toLowerCase().includes(q) || r.phone.includes(q)
    })
    .sort((a, b) => daysUntilBirthday(a.birthdate) - daysUntilBirthday(b.birthdate))

  const hoy = registros.filter(r => isToday(r.birthdate))
  const esteMes = registros.filter(r => isThisMonth(r.birthdate))

  function copyQR() {
    const url = `${window.location.origin}/cumpleanos`
    navigator.clipboard.writeText(url).then(() => alert('Link copiado: ' + url))
  }

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-black" style={{ color: S.text }}>Club de Cumpleaños</h1>
          <button onClick={copyQR}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ backgroundColor: S.accent, color: '#000' }}>
            <Icon name="link" size={15} /> Copiar link del formulario
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Registrados', value: registros.length, icon: 'users' as const, color: S.accent },
            { label: 'Este mes', value: esteMes.length, icon: 'calendar' as const, color: '#818cf8' },
            { label: 'Hoy', value: hoy.length, icon: 'gift' as const, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
              <span style={{ color: s.color }}><Icon name={s.icon} size={20} /></span>
              <p className="font-black text-xl" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs font-medium" style={{ color: S.sub }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex p-1 gap-1 rounded-2xl flex-1" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            {(['todos', 'mes', 'hoy'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all"
                style={filter === f
                  ? { backgroundColor: S.accent, color: '#000' }
                  : { color: S.sub, backgroundColor: 'transparent' }}>
                {f === 'todos' ? 'Todos' : f === 'mes' ? 'Este mes' : 'Hoy'}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nombre o teléfono..."
            className="rounded-2xl px-4 py-2 text-sm focus:outline-none flex-1 min-w-[180px]"
            style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }}
          />
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-10" style={{ color: S.accent }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16" style={{ color: S.sub }}>
            <span className="text-4xl mb-3">🎂</span>
            <p className="font-semibold" style={{ color: S.text }}>Sin registros</p>
            <p className="text-sm mt-1">Comparte el link del formulario con tus clientes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const cumpleHoy = isToday(r.birthdate)
              const dias = daysUntilBirthday(r.birthdate)
              return (
                <div key={r.id} className="rounded-2xl p-4 flex items-center gap-3"
                  style={{
                    backgroundColor: S.card,
                    border: `1px solid ${cumpleHoy ? 'color-mix(in srgb, var(--ad-accent) 40%, transparent)' : S.border}`,
                  }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shrink-0"
                    style={{ background: cumpleHoy ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>
                    {cumpleHoy ? '🎂' : r.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold truncate" style={{ color: S.text }}>{r.name}</p>
                      {cumpleHoy && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                          ¡Hoy! 🎉
                        </span>
                      )}
                      {!cumpleHoy && dias <= 7 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--ad-accent) 15%, transparent)', color: 'var(--ad-accent)' }}>
                          En {dias} días
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: S.sub }}>
                      {r.phone} · Cumpleaños: {fmtBirthdate(r.birthdate)}
                    </p>
                  </div>
                  <a href={`https://wa.me/${r.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-xl shrink-0"
                    style={{ color: '#4ade80', backgroundColor: 'rgba(74,222,128,0.1)' }}
                    title="Enviar WhatsApp">
                    <Icon name="message" size={16} />
                  </a>
                  <button onClick={() => eliminar(r.id)}
                    className="p-2 rounded-xl shrink-0"
                    style={{ color: '#f87171', backgroundColor: 'rgba(239,68,68,0.1)' }}
                    title="Eliminar">
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
