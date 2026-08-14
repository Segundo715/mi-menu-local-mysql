"use client"

import React, { useEffect, useMemo, useState } from "react"

// =============================================================================
// Perfiles de cliente (Robust guest profiles)
// Lista con búsqueda + panel de detalle: historial de visitas, preferencias,
// alergias, gasto total y ticket promedio. Persiste en localStorage.
// =============================================================================

type GuestTier = "new" | "regular" | "vip"

export type Guest = {
  id: string
  name: string
  phone: string
  email?: string
  visits: number
  lastVisit: string        // YYYY-MM-DD
  totalSpend: number       // acumulado
  tier: GuestTier
  tags: string[]           // preferencias (Ventana, Vino tinto, …)
  allergies: string[]
  notes: string
  favoriteTable?: string
}

const STORAGE_KEY = "guest_profiles_v1"

const S = {
  card: "var(--ad-card)", elevated: "var(--ad-elevated)", accent: "var(--ad-accent)",
  text: "var(--ad-text)", sub: "var(--ad-sub)", border: "var(--ad-border)",
}
const fieldStyle = { backgroundColor: "var(--ad-elevated)", color: "var(--ad-text)", border: "1px solid var(--ad-border)" }
const FIELD = "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"

const TIER_META: Record<GuestTier, { label: string; color: string }> = {
  new:     { label: "Nuevo",   color: "#06b6d4" },
  regular: { label: "Habitual",color: "#22c55e" },
  vip:     { label: "VIP",     color: "#f59e0b" },
}

const newId = () => "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

function seed(): Guest[] {
  return [
    { id: newId(), name: "Carlos Mendoza", phone: "555-1234", email: "carlos@mail.com", visits: 14, lastVisit: "2026-05-22", totalSpend: 9820, tier: "vip", tags: ["Ventana", "Vino tinto"], allergies: [], notes: "Aniversario en mayo. Prefiere mesa tranquila.", favoriteTable: "M3" },
    { id: newId(), name: "Ana García", phone: "555-5678", visits: 6, lastVisit: "2026-05-18", totalSpend: 3140, tier: "regular", tags: ["Terraza"], allergies: ["Gluten"], notes: "Celíaca, confirmar menú sin gluten." },
    { id: newId(), name: "Roberto Silva", phone: "555-9012", visits: 2, lastVisit: "2026-04-30", totalSpend: 880, tier: "new", tags: ["Cumpleaños"], allergies: ["Mariscos"], notes: "" },
    { id: newId(), name: "Patricia Torres", phone: "555-2345", email: "pat@corp.com", visits: 9, lastVisit: "2026-05-25", totalSpend: 15240, tier: "vip", tags: ["Evento corp.", "Salón privado"], allergies: [], notes: "Reserva eventos de empresa. Factura requerida." },
  ]
}

export default function GuestProfiles() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    let data: Guest[] | null = null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) data = JSON.parse(raw)
    } catch { /* ignore */ }
    const list = data && Array.isArray(data) && data.length ? data : seed()
    setGuests(list)
    setSelectedId(list[0]?.id ?? null)
    setLoaded(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(guests)) } catch { /* ignore */ }
  }, [guests, loaded])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = !q ? guests : guests.filter(g =>
      g.name.toLowerCase().includes(q) || g.phone.includes(q) || g.tags.some(t => t.toLowerCase().includes(q)))
    return [...base].sort((a, b) => b.totalSpend - a.totalSpend)
  }, [guests, query])

  const selected = guests.find(g => g.id === selectedId) ?? null

  const patch = (p: Partial<Guest>) => {
    if (!selectedId) return
    setGuests(prev => prev.map(g => g.id === selectedId ? { ...g, ...p } : g))
  }

  const addGuest = () => {
    const g: Guest = { id: newId(), name: "Nuevo cliente", phone: "", visits: 0, lastVisit: new Date().toISOString().slice(0, 10), totalSpend: 0, tier: "new", tags: [], allergies: [], notes: "" }
    setGuests(prev => [g, ...prev])
    setSelectedId(g.id)
  }

  const removeGuest = (id: string) => {
    setGuests(prev => prev.filter(g => g.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  // KPIs
  const totalGuests = guests.length
  const vips = guests.filter(g => g.tier === "vip").length
  const avgSpend = totalGuests ? Math.round(guests.reduce((s, g) => s + g.totalSpend, 0) / totalGuests) : 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <KPI label="Clientes" value={String(totalGuests)} color={S.accent} />
        <KPI label="VIP" value={String(vips)} color="#f59e0b" />
        <KPI label="Gasto promedio" value={`$${avgSpend.toLocaleString()}`} />
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        {/* Lista */}
        <div className="rounded-2xl p-3 w-full lg:w-[340px] shrink-0 flex flex-col" style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, maxHeight: 640 }}>
          <div className="flex gap-2 mb-3">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar nombre, tel, tag…" className={FIELD} style={fieldStyle} />
            <button onClick={addGuest} className="px-3 rounded-lg text-sm font-bold shrink-0" style={{ backgroundColor: S.accent, color: "#000" }}>+</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {filtered.map(g => {
              const tm = TIER_META[g.tier]
              const active = g.id === selectedId
              return (
                <button key={g.id} onClick={() => setSelectedId(g.id)}
                  className="w-full text-left rounded-xl p-2.5 transition"
                  style={{ backgroundColor: S.elevated, border: `1px solid ${active ? tm.color : S.border}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm truncate" style={{ color: S.text }}>{g.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0" style={{ backgroundColor: tm.color + "22", color: tm.color }}>{tm.label}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px]" style={{ color: S.sub }}>
                    <span>🍽 {g.visits} visitas</span><span>·</span><span>${g.totalSpend.toLocaleString()}</span>
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 && <p className="text-xs text-center py-4" style={{ color: S.sub }}>Sin resultados</p>}
          </div>
        </div>

        {/* Detalle */}
        <div className="flex-1 min-w-0 rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16" style={{ color: S.sub }}>
              <p className="text-3xl mb-2">👤</p><p className="font-semibold" style={{ color: S.text }}>Selecciona un cliente</p>
            </div>
          ) : (
            <GuestDetail guest={selected} patch={patch} onRemove={() => removeGuest(selected.id)} />
          )}
        </div>
      </div>
    </div>
  )
}

function GuestDetail({ guest, patch, onRemove }: { guest: Guest; patch: (p: Partial<Guest>) => void; onRemove: () => void }) {
  const tm = TIER_META[guest.tier]
  const avgTicket = guest.visits > 0 ? Math.round(guest.totalSpend / guest.visits) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <input value={guest.name} onChange={e => patch({ name: e.target.value })}
            className="bg-transparent font-black text-xl outline-none w-full" style={{ color: S.text }} />
          <input value={guest.phone} onChange={e => patch({ phone: e.target.value })} placeholder="Teléfono"
            className="bg-transparent text-sm outline-none w-full mt-0.5" style={{ color: S.sub }} />
        </div>
        <select value={guest.tier} onChange={e => patch({ tier: e.target.value as GuestTier })} className="rounded-lg px-2 py-1 text-xs font-bold" style={{ ...fieldStyle, color: tm.color }}>
          <option value="new">Nuevo</option><option value="regular">Habitual</option><option value="vip">VIP</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Visitas" value={String(guest.visits)} />
        <MiniStat label="Gasto total" value={`$${guest.totalSpend.toLocaleString()}`} />
        <MiniStat label="Ticket prom." value={`$${avgTicket.toLocaleString()}`} color={S.accent} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Última visita">
          <input type="date" value={guest.lastVisit} onChange={e => patch({ lastVisit: e.target.value })} className={FIELD} style={fieldStyle} />
        </Field>
        <Field label="Mesa favorita">
          <input value={guest.favoriteTable ?? ""} onChange={e => patch({ favoriteTable: e.target.value })} placeholder="Ej. M3" className={FIELD} style={fieldStyle} />
        </Field>
      </div>

      <TagEditor label="Preferencias" values={guest.tags} accent="#22c55e" onChange={tags => patch({ tags })} />
      <TagEditor label="Alergias / restricciones" values={guest.allergies} accent="#ef4444" onChange={allergies => patch({ allergies })} />

      <Field label="Notas">
        <textarea value={guest.notes} onChange={e => patch({ notes: e.target.value })} rows={3}
          className={FIELD + " resize-none custom-scrollbar"} style={fieldStyle} placeholder="Preferencias, ocasiones especiales…" />
      </Field>

      <button onClick={onRemove} className="text-sm font-semibold px-3 py-2 rounded-lg" style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
        Eliminar cliente
      </button>
    </div>
  )
}

function TagEditor({ label, values, accent, onChange }: { label: string; values: string[]; accent: string; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("")
  const add = () => { const v = input.trim(); if (v && !values.includes(v)) onChange([...values, v]); setInput("") }
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {values.map(v => (
          <span key={v} className="text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ backgroundColor: accent + "22", color: accent }}>
            {v}<button onClick={() => onChange(values.filter(x => x !== v))} className="opacity-70 hover:opacity-100">×</button>
          </span>
        ))}
        {values.length === 0 && <span className="text-[11px]" style={{ color: S.sub }}>Ninguna</span>}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add() }} placeholder="Agregar y Enter" className={FIELD} style={fieldStyle} />
        <button onClick={add} className="px-3 rounded-lg text-sm font-bold shrink-0" style={{ backgroundColor: S.elevated, color: S.text, border: `1px solid ${S.border}` }}>+</button>
      </div>
    </Field>
  )
}

function KPI({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
      <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: S.sub }}>{label}</p>
      <p className="text-2xl font-black" style={{ color: color ?? S.text }}>{value}</p>
    </div>
  )
}
function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: S.elevated, border: `1px solid ${S.border}` }}>
      <p className="text-[10px] uppercase tracking-wide" style={{ color: S.sub }}>{label}</p>
      <p className="font-black" style={{ color: color ?? S.text }}>{value}</p>
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>{label}</label>{children}</div>)
}
