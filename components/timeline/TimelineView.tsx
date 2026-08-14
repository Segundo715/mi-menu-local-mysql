"use client"

import React, { useEffect, useMemo, useState } from "react"
import { FloorPlan, FLOOR_PLAN_STORAGE_KEY } from "../floor-plan/types"

// =============================================================================
// Timeline view — vista cronológica de reservas y ocupación.
// Filas = mesas (del plano guardado); eje X = horas del servicio.
// Cada barra es una reserva/turno de mesa, coloreada por estado.
// =============================================================================

type SlotStatus = "reserved" | "seated" | "finished" | "blocked"

type Booking = {
  id: string
  tableName: string
  guest: string
  size: number
  start: string   // HH:MM
  durationMin: number
  status: SlotStatus
}

const S = {
  card: "var(--ad-card)", elevated: "var(--ad-elevated)", accent: "var(--ad-accent)",
  text: "var(--ad-text)", sub: "var(--ad-sub)", border: "var(--ad-border)",
}

const STATUS_META: Record<SlotStatus, { label: string; color: string }> = {
  reserved: { label: "Reservada", color: "#3b82f6" },
  seated:   { label: "Ocupada",   color: "#22c55e" },
  finished: { label: "Finalizada",color: "#6b7280" },
  blocked:  { label: "Bloqueada", color: "#ef4444" },
}

const OPEN_HOUR = 12
const CLOSE_HOUR = 23
const TOTAL_MIN = (CLOSE_HOUR - OPEN_HOUR) * 60

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return (h - OPEN_HOUR) * 60 + (m || 0) }
const pct = (min: number) => (min / TOTAL_MIN) * 100

const DEFAULT_TABLES = ["M1", "M2", "M3", "M4", "Barra"]

function seedBookings(tables: string[]): Booking[] {
  const t = (i: number) => tables[i % tables.length] ?? "M1"
  return [
    { id: "b1", tableName: t(0), guest: "Carlos Mendoza", size: 4, start: "13:00", durationMin: 90, status: "seated" },
    { id: "b2", tableName: t(0), guest: "Familia Ruiz",    size: 4, start: "15:00", durationMin: 90, status: "reserved" },
    { id: "b3", tableName: t(1), guest: "Ana García",      size: 2, start: "13:30", durationMin: 75, status: "reserved" },
    { id: "b4", tableName: t(2), guest: "Roberto Silva",   size: 6, start: "14:00", durationMin: 120, status: "reserved" },
    { id: "b5", tableName: t(2), guest: "Patricia Torres", size: 6, start: "16:30", durationMin: 120, status: "reserved" },
    { id: "b6", tableName: t(3), guest: "Mantenimiento",   size: 0, start: "12:00", durationMin: 60, status: "blocked" },
    { id: "b7", tableName: t(4), guest: "Walk-in",         size: 3, start: "12:30", durationMin: 60, status: "finished" },
    { id: "b8", tableName: t(4), guest: "Grupo Diego",     size: 2, start: "14:00", durationMin: 80, status: "seated" },
  ]
}

export default function TimelineView() {
  const [tables, setTables] = useState<string[]>(DEFAULT_TABLES)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [now, setNow] = useState<Date | null>(null)
  const [sel, setSel] = useState<Booking | null>(null)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    let names = DEFAULT_TABLES
    try {
      const raw = localStorage.getItem(FLOOR_PLAN_STORAGE_KEY)
      if (raw) {
        const plan = JSON.parse(raw) as FloorPlan
        if (plan?.tables?.length) names = plan.tables.map(t => t.name || "—")
      }
    } catch { /* ignore */ }
    setTables(names)
    setBookings(seedBookings(names))
    setNow(new Date())
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const hours = useMemo(() => Array.from({ length: CLOSE_HOUR - OPEN_HOUR + 1 }, (_, i) => OPEN_HOUR + i), [])

  const nowPct = useMemo(() => {
    if (!now) return null
    const min = (now.getHours() - OPEN_HOUR) * 60 + now.getMinutes()
    if (min < 0 || min > TOTAL_MIN) return null
    return pct(min)
  }, [now])

  const byTable = useMemo(() => {
    const map: Record<string, Booking[]> = {}
    tables.forEach(t => { map[t] = [] })
    bookings.forEach(b => { (map[b.tableName] ??= []).push(b) })
    return map
  }, [tables, bookings])

  const totalCovers = bookings.filter(b => b.status !== "blocked" && b.status !== "finished").reduce((s, b) => s + b.size, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-black" style={{ color: S.text }}>Línea de tiempo del servicio</h2>
          <p className="text-xs" style={{ color: S.sub }}>{OPEN_HOUR}:00–{CLOSE_HOUR}:00 · {bookings.length} reservas · {totalCovers} comensales activos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_META) as SlotStatus[]).map(s => (
            <span key={s} className="flex items-center gap-1 text-[11px]" style={{ color: S.sub }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_META[s].color }} />{STATUS_META[s].label}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-3 overflow-x-auto custom-scrollbar" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
        <div style={{ minWidth: 760 }}>
          {/* Cabecera de horas */}
          <div className="flex items-center mb-1">
            <div className="w-20 shrink-0" />
            <div className="relative flex-1 h-5">
              {hours.map(h => (
                <span key={h} className="absolute text-[10px] -translate-x-1/2" style={{ left: `${pct((h - OPEN_HOUR) * 60)}%`, color: S.sub }}>{h}:00</span>
              ))}
            </div>
          </div>

          {/* Filas por mesa */}
          <div className="relative">
            {/* Línea de "ahora" */}
            {nowPct !== null && (
              <div className="absolute top-0 bottom-0 w-px z-20 pointer-events-none" style={{ left: `calc(5rem + (100% - 5rem) * ${nowPct / 100})`, backgroundColor: S.accent }}>
                <span className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: S.accent }} />
              </div>
            )}

            {tables.map(t => (
              <div key={t} className="flex items-center h-11 border-t" style={{ borderColor: S.border }}>
                <div className="w-20 shrink-0 pr-2 text-xs font-bold truncate" style={{ color: S.text }}>{t}</div>
                <div className="relative flex-1 h-8">
                  {/* rejilla por hora */}
                  {hours.map(h => (
                    <div key={h} className="absolute top-0 bottom-0 w-px" style={{ left: `${pct((h - OPEN_HOUR) * 60)}%`, backgroundColor: "var(--ad-border)" }} />
                  ))}
                  {(byTable[t] ?? []).map(b => {
                    const left = Math.max(0, pct(toMin(b.start)))
                    const width = Math.min(100 - left, pct(b.durationMin))
                    const m = STATUS_META[b.status]
                    return (
                      <button key={b.id} onClick={() => setSel(b)} title={`${b.guest} · ${b.start}`}
                        className="absolute top-0.5 bottom-0.5 rounded-md px-2 text-[10px] font-bold text-white truncate flex items-center transition hover:brightness-110"
                        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: m.color, opacity: b.status === "finished" ? 0.5 : 1, border: sel?.id === b.id ? "2px solid #fff" : "none" }}>
                        {b.guest}{b.size ? ` · ${b.size}p` : ""}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {sel && (
        <div className="rounded-2xl p-4 flex items-center justify-between gap-3" style={{ backgroundColor: S.card, border: `1px solid ${STATUS_META[sel.status].color}` }}>
          <div>
            <p className="font-bold" style={{ color: S.text }}>{sel.guest} <span className="text-xs font-normal" style={{ color: S.sub }}>· {sel.tableName}</span></p>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>
              {sel.start} · {sel.durationMin} min · {sel.size} comensales · <span style={{ color: STATUS_META[sel.status].color }}>{STATUS_META[sel.status].label}</span>
            </p>
          </div>
          <button onClick={() => setSel(null)} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: S.sub, border: `1px solid ${S.border}` }}>Cerrar</button>
        </div>
      )}
    </div>
  )
}
