'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Resta3Nav from '@/app/components/Resta3Nav'
import { Icon } from '@/app/components/Icon'

const FloorPlanEditor = dynamic(() => import('@/components/floor-plan/FloorPlanEditor'), { ssr: false })
const ServiceView     = dynamic(() => import('@/components/service/ServiceView'),         { ssr: false })
const GuestProfiles   = dynamic(() => import('@/components/guests/GuestProfiles'),         { ssr: false })
const TimelineView    = dynamic(() => import('@/components/timeline/TimelineView'),         { ssr: false })
const SpendAlerts     = dynamic(() => import('@/components/spend/SpendAlerts'),             { ssr: false })
const ShiftPlanner    = dynamic(() => import('@/components/shifts/ShiftPlanner'),           { ssr: false })

const S = {
  bg:     'var(--ad-bg)',
  card:   'var(--ad-card)',
  accent: 'var(--ad-accent)',
  text:   'var(--ad-text)',
  sub:    'var(--ad-sub)',
  border: 'var(--ad-border)',
  input:  'var(--ad-elevated)',
}

const INPUT_CLS = 'w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors'
const inputStyle = { backgroundColor: S.input, color: S.text, border: `1px solid color-mix(in srgb, var(--ad-accent) 25%, transparent)` }

// ── Tipos ─────────────────────────────────────────────────────────────────────
type TableStatus = 'libre' | 'ocupada' | 'reservada' | 'limpieza'
interface Table { id: string; label: string; seats: number; status: TableStatus; customer?: string; since?: string; zone: string }

const STATUS_CFG: Record<TableStatus, { label: string; color: string; bg: string; border: string }> = {
  libre:     { label: 'Libre',     color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)' },
  ocupada:   { label: 'Ocupada',   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)' },
  reservada: { label: 'Reservada', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
  limpieza:  { label: 'Limpieza',  color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)' },
}

// ── Reservaciones ─────────────────────────────────────────────────────────────
interface Reservation {
  id: number; name: string; time: string; guests: number; phone: string; notes: string
  table: string; tableId: string; status: 'confirmed' | 'pending' | 'cancelled'
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  confirmed: { bg: 'rgba(34,197,94,0.15)',  color: '#4ade80', label: 'Confirmada' },
  pending:   { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Pendiente'  },
  cancelled: { bg: 'rgba(239,68,68,0.15)',  color: '#f87171', label: 'Cancelada'  },
}

function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
      <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: S.sub }}>{label}</p>
      <p className="text-2xl font-black" style={{ color: color ?? S.text }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: S.sub }}>{sub}</p>}
    </div>
  )
}

// ── Tabs disponibles ──────────────────────────────────────────────────────────
const TABS = [
  { key: 'mesas',    label: 'Mesas',    icon: 'chair' },
  { key: 'plano',    label: 'Plano',    icon: 'map' },
  { key: 'reservas', label: 'Reservas', icon: 'clipboard' },
  { key: 'servicio', label: 'Servicio', icon: 'utensils' },
  { key: 'perfiles', label: 'Perfiles', icon: 'users' },
  { key: 'timeline', label: 'Timeline', icon: 'clock' },
  { key: 'consumo',  label: 'Consumo',  icon: 'chart' },
  { key: 'turnos',   label: 'Turnos',   icon: 'refresh' },
] as const

type Tab = typeof TABS[number]['key']

// ─────────────────────────────────────────────────────────────────────────────

export default function MesasPage() {
  const [tab, setTab] = useState<Tab>('mesas')

  // ── Estado mesas ─────────────────────────────────────────────────────────
  const [tables,          setTables]          = useState<Table[]>([])
  const [loadingTables,   setLoadingTables]   = useState(true)
  const [filter,          setFilter]          = useState<TableStatus | 'todas'>('todas')
  const [zone,            setZone]            = useState('todas')
  const [saving,          setSaving]          = useState(false)
  const [modal,           setModal]           = useState<Table | null>(null)
  const [customerInput,   setCustomerInput]   = useState('')
  const [selectedStatus,  setSelectedStatus]  = useState<TableStatus>('libre')

  // ── Estado reservaciones ──────────────────────────────────────────────────
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [showForm,     setShowForm]     = useState(false)
  const [form,         setForm]         = useState({ name: '', time: '', guests: '2', phone: '', notes: '', table: '' })

  // ── Carga de mesas ────────────────────────────────────────────────────────
  async function loadTables() {
    const r = await fetch('/api/resta3/tables')
    if (r.ok) setTables(await r.json())
    setLoadingTables(false)
  }
  useEffect(() => { queueMicrotask(loadTables) }, [])
  useEffect(() => { if (tab === 'mesas') queueMicrotask(loadTables) }, [tab])

  // ── Handlers mesas ────────────────────────────────────────────────────────
  function openModal(table: Table) {
    setModal(table); setSelectedStatus(table.status); setCustomerInput(table.customer ?? '')
  }
  function closeModal() { setModal(null); setCustomerInput('') }

  async function applyChange() {
    if (!modal) return
    setSaving(true)
    const since = selectedStatus === 'ocupada' || selectedStatus === 'reservada'
      ? new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      : null
    await fetch(`/api/resta3/tables/${modal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: selectedStatus,
        customer: customerInput.trim() || null,
        since: selectedStatus === 'libre' || selectedStatus === 'limpieza' ? null : (modal.since ?? since),
      }),
    })
    await loadTables(); setSaving(false); closeModal()
  }

  // ── Handlers reservaciones ────────────────────────────────────────────────
  async function patchTableStatusR(tableId: string, status: TableStatus) {
    if (!tableId) return
    await fetch(`/api/resta3/tables/${tableId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {})
    loadTables()
  }

  function addReservation() {
    if (!form.name.trim() || !form.time || !form.phone.trim()) return
    const selected = tables.find(t => t.id === form.table)
    const newRes: Reservation = {
      id: Date.now(), name: form.name.trim(), time: form.time,
      guests: parseInt(form.guests) || 2, phone: form.phone.trim(),
      notes: form.notes.trim(), table: selected?.label ?? '', tableId: selected?.id ?? '',
      status: 'pending',
    }
    if (selected) patchTableStatusR(selected.id, 'reservada')
    setReservations(prev => [...prev, newRes])
    setForm({ name: '', time: '', guests: '2', phone: '', notes: '', table: '' })
    setShowForm(false)
  }

  function changeStatus(id: number, status: Reservation['status']) {
    setReservations(prev => prev.map(r => {
      if (r.id !== id) return r
      if (status === 'cancelled' && r.tableId) patchTableStatusR(r.tableId, 'libre')
      if (status === 'confirmed' && r.tableId) patchTableStatusR(r.tableId, 'reservada')
      return { ...r, status }
    }))
  }

  // ── Derivados ─────────────────────────────────────────────────────────────
  const zones    = ['todas', ...Array.from(new Set(tables.map(t => t.zone)))]
  const displayed = tables.filter(t =>
    (filter === 'todas' || t.status === filter) && (zone === 'todas' || t.zone === zone)
  )
  const stats = {
    libre:     tables.filter(t => t.status === 'libre').length,
    ocupada:   tables.filter(t => t.status === 'ocupada').length,
    reservada: tables.filter(t => t.status === 'reservada').length,
    limpieza:  tables.filter(t => t.status === 'limpieza').length,
  }
  const occupancy = tables.length ? Math.round((stats.ocupada / tables.length) * 100) : 0

  const confirmed   = reservations.filter(r => r.status === 'confirmed').length
  const pending     = reservations.filter(r => r.status === 'pending').length
  const totalGuests = reservations.filter(r => r.status !== 'cancelled').reduce((s, r) => s + r.guests, 0)
  const sorted      = [...reservations].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div className="min-h-screen md:ml-[240px]" style={{ backgroundColor: S.bg }}>
      <Resta3Nav />
      <div className="max-w-[1200px] mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-black" style={{ color: S.text }}>Mesas & Reservaciones</h1>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>
              {tables.length} mesas · {occupancy}% ocupación · {confirmed + pending} reservas hoy
            </p>
          </div>
          {tab === 'reservas' && (
            <button onClick={() => setShowForm(p => !p)}
              className="text-xs px-3 py-1.5 rounded-full font-semibold"
              style={{ backgroundColor: S.accent, color: '#000' }}>
              + Nueva reserva
            </button>
          )}
          {tab === 'mesas' && (
            <span className="text-sm font-black px-3 py-1.5 rounded-xl"
              style={{ backgroundColor: `${S.accent}18`, color: S.accent }}>
              {stats.ocupada} ocupadas
            </span>
          )}
        </div>

        {/* Barra de tabs (scroll horizontal en móvil) */}
        <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-1.5 p-1 rounded-xl w-max" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="px-3.5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap inline-flex items-center gap-1.5"
                style={tab === t.key
                  ? { backgroundColor: S.accent, color: '#000' }
                  : { color: S.sub, backgroundColor: 'transparent' }}>
                <Icon name={t.icon} size={14} />{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── TAB: MESAS ───────────────────────────────────────────────────── */}
        {tab === 'mesas' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(stats) as [TableStatus, number][]).map(([status, count]) => {
                const cfg = STATUS_CFG[status]
                return (
                  <button key={status} onClick={() => setFilter(filter === status ? 'todas' : status)}
                    className="rounded-xl p-3 text-center transition-all"
                    style={{ backgroundColor: filter === status ? cfg.bg : S.card, border: `1px solid ${filter === status ? cfg.border : S.border}` }}>
                    <p className="text-xl font-black" style={{ color: cfg.color }}>{count}</p>
                    <p className="text-[10px] font-bold mt-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
                  </button>
                )
              })}
            </div>

            {zones.length > 2 && (
              <div className="flex gap-2 flex-wrap">
                {zones.map(z => (
                  <button key={z} onClick={() => setZone(z)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold capitalize"
                    style={zone === z
                      ? { backgroundColor: `${S.accent}22`, color: S.accent, border: `1px solid ${S.accent}44` }
                      : { backgroundColor: S.card, color: S.sub, border: `1px solid ${S.border}` }}>
                    {z}
                  </button>
                ))}
              </div>
            )}

            {loadingTables ? (
              <div className="text-center py-16 text-sm" style={{ color: S.sub }}>Cargando mesas...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {displayed.map(table => {
                  const cfg = STATUS_CFG[table.status]
                  return (
                    <button key={table.id} onClick={() => openModal(table)}
                      className="rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-95"
                      style={{ backgroundColor: S.card, border: `2px solid ${cfg.border}` }}>
                      <div className="flex items-start justify-between mb-3">
                        <span className="font-black text-sm" style={{ color: S.text }}>{table.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-1 mb-2 flex-wrap">
                        {Array.from({ length: table.seats }).map((_, i) => (
                          <div key={i} className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: table.status === 'ocupada' ? cfg.color : table.status === 'reservada' ? `${cfg.color}66` : 'var(--ad-overlay)' }} />
                        ))}
                        <span className="text-[10px] ml-1" style={{ color: S.sub }}>{table.seats}p</span>
                      </div>
                      {table.customer && <p className="text-xs font-bold truncate" style={{ color: S.text }}>{table.customer}</p>}
                      {table.since    && <p className="text-xs" style={{ color: S.sub }}>desde {table.since}</p>}
                      <p className="text-[9px] mt-2" style={{ color: 'var(--ad-sub)', opacity: 0.6 }}>Toca para gestionar</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: PLANO ───────────────────────────────────────────────────── */}
        {tab === 'plano' && (
          <div className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <FloorPlanEditor />
          </div>
        )}

        {/* ── TAB: RESERVAS ────────────────────────────────────────────────── */}
        {tab === 'reservas' && (
          <div className="max-w-3xl space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPI label="Hoy" value={String(confirmed + pending)} sub="reservaciones" color={S.accent} />
              <KPI label="Confirmadas" value={String(confirmed)} sub="listas" />
              <KPI label="Pendientes" value={String(pending)} sub="por confirmar" />
              <KPI label="Comensales" value={String(totalGuests)} sub="esperados hoy" />
            </div>

            {showForm && (
              <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                <h2 className="font-bold" style={{ color: S.accent }}>Nueva reservación</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Nombre *</label>
                    <input id="res-name" name="res_name" type="text" value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Nombre del cliente" className={INPUT_CLS} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Teléfono *</label>
                    <input id="res-phone" name="res_phone" type="tel" value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="555-0000" className={INPUT_CLS} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Hora *</label>
                    <input id="res-time" name="res_time" type="time" value={form.time}
                      onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                      className={INPUT_CLS} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Personas</label>
                    <input id="res-guests" name="res_guests" type="number" value={form.guests}
                      onChange={e => setForm(p => ({ ...p, guests: e.target.value }))}
                      min="1" max="20" className={INPUT_CLS} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Mesa</label>
                    <select value={form.table} onChange={e => setForm(p => ({ ...p, table: e.target.value }))}
                      className={INPUT_CLS} style={inputStyle}>
                      <option value="">Sin asignar</option>
                      {tables.filter(t => t.status === 'libre').map(t => (
                        <option key={t.id} value={t.id}>{t.label} ({t.seats}p) — {t.zone}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Notas</label>
                    <input id="res-notes" name="res_notes" type="text" value={form.notes}
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Ej. Aniversario, cumpleaños..." className={INPUT_CLS} style={inputStyle} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addReservation}
                    className="flex-1 font-bold py-2.5 rounded-xl text-sm"
                    style={{ backgroundColor: S.accent, color: '#000' }}>
                    Agregar
                  </button>
                  <button onClick={() => setShowForm(false)}
                    className="flex-1 font-bold py-2.5 rounded-xl text-sm"
                    style={{ border: `1px solid ${S.border}`, color: S.sub, backgroundColor: 'transparent' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {sorted.map(r => {
                const st = STATUS_STYLE[r.status]
                return (
                  <div key={r.id} className="rounded-2xl p-4"
                    style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                    <div className="flex items-start gap-3">
                      <div className="text-center shrink-0">
                        <p className="font-black text-xl leading-none" style={{ color: S.accent }}>{r.time}</p>
                        <p className="text-xs mt-0.5" style={{ color: S.sub }}>{r.guests} pers.</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm" style={{ color: S.text }}>{r.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                        <p className="text-xs" style={{ color: S.sub }}>{r.phone}{r.table ? ` · Mesa: ${r.table}` : ''}</p>
                        {r.notes && <p className="text-xs mt-0.5 font-medium flex items-center gap-1" style={{ color: '#fbbf24' }}><Icon name="note" size={12} /> {r.notes}</p>}
                      </div>
                    </div>
                    {r.status !== 'cancelled' && (
                      <div className="flex gap-2 mt-3">
                        {r.status === 'pending' && (
                          <button onClick={() => changeStatus(r.id, 'confirmed')}
                            className="flex-1 py-1.5 rounded-xl text-sm font-medium"
                            style={{ border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80', backgroundColor: 'transparent' }}>
                            Confirmar
                          </button>
                        )}
                        <button onClick={() => changeStatus(r.id, 'cancelled')}
                          className="flex-1 py-1.5 rounded-xl text-sm font-medium"
                          style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', backgroundColor: 'transparent' }}>
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── TAB: SERVICIO ────────────────────────────────────────────────── */}
        {tab === 'servicio' && (
          <div className="w-full">
            <ServiceView />
          </div>
        )}

        {/* ── TAB: PERFILES ────────────────────────────────────────────────── */}
        {tab === 'perfiles' && (
          <div className="w-full">
            <GuestProfiles />
          </div>
        )}

        {/* ── TAB: TIMELINE ────────────────────────────────────────────────── */}
        {tab === 'timeline' && (
          <div className="w-full">
            <TimelineView />
          </div>
        )}

        {/* ── TAB: CONSUMO ─────────────────────────────────────────────────── */}
        {tab === 'consumo' && (
          <div className="w-full">
            <SpendAlerts />
          </div>
        )}

        {/* ── TAB: TURNOS ──────────────────────────────────────────────────── */}
        {tab === 'turnos' && (
          <div className="w-full">
            <ShiftPlanner />
          </div>
        )}

      </div>

      {/* ── Modal gestión de mesa ─────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={closeModal}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
            style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-lg" style={{ color: S.text }}>{modal.label}</h2>
                <p className="text-xs" style={{ color: S.sub }}>{modal.seats} personas · {modal.zone}</p>
              </div>
              <button onClick={closeModal} aria-label="Cerrar" style={{ color: S.sub }} className="inline-flex items-center"><Icon name="x" size={18} /></button>
            </div>
            <div>
              <label htmlFor="mesa-customer" className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: S.sub }}>
                Nombre del cliente / reserva
              </label>
              <input id="mesa-customer" name="mesa_customer"
                value={customerInput}
                onChange={e => setCustomerInput(e.target.value)}
                placeholder="Ej: González, Reserva 8pm..."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: S.sub }}>
                Estado de la mesa
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(STATUS_CFG) as [TableStatus, typeof STATUS_CFG[TableStatus]][]).map(([status, cfg]) => (
                  <button key={status} onClick={() => setSelectedStatus(status)}
                    className="py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    style={selectedStatus === status
                      ? { backgroundColor: cfg.bg, color: cfg.color, border: `2px solid ${cfg.color}` }
                      : { backgroundColor: S.bg, color: S.sub, border: `1px solid ${S.border}` }}>
                    <span style={{ color: cfg.color }}><Icon name="dot" size={10} /></span>
                    <span>{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={applyChange} disabled={saving}
              className="w-full py-3.5 rounded-xl font-black text-sm disabled:opacity-50 transition-all"
              style={{ backgroundColor: S.accent, color: '#000' }}>
              {saving ? 'Guardando...' : `Aplicar → ${STATUS_CFG[selectedStatus].label}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
