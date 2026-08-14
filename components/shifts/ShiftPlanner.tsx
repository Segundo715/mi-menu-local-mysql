"use client"

import React, { useEffect, useMemo, useState } from "react"

// =============================================================================
// Shift planning and analysis — planeación de turnos + análisis de cobertura.
// Rejilla empleados × franjas horarias: clic para asignar/quitar turno.
// Calcula cobertura por hora vs. demanda esperada y comensales por mesero.
// =============================================================================

type Role = "mesero" | "cocina" | "host" | "bar"

type Staff = {
  id: string
  name: string
  role: Role
  blocks: boolean[] // un booleano por franja horaria (asignado o no)
}

const S = {
  card: "var(--ad-card)", elevated: "var(--ad-elevated)", accent: "var(--ad-accent)",
  text: "var(--ad-text)", sub: "var(--ad-sub)", border: "var(--ad-border)",
}

const ROLE_META: Record<Role, { label: string; color: string }> = {
  mesero: { label: "Mesero", color: "#22c55e" },
  cocina: { label: "Cocina", color: "#f59e0b" },
  host:   { label: "Host",   color: "#3b82f6" },
  bar:    { label: "Bar",    color: "#a855f7" },
}

const OPEN = 12, CLOSE = 23
const HOURS = Array.from({ length: CLOSE - OPEN }, (_, i) => OPEN + i) // franjas de 1h
const N = HOURS.length

// Demanda esperada de comensales por franja (curva con picos de comida/cena).
const DEMAND = [30, 55, 70, 45, 25, 20, 35, 60, 80, 65, 40]
// Cada mesero cubre cómodamente ~20 comensales/hora.
const COVERS_PER_SERVER = 20

const STORAGE_KEY = "shift_plan_v1"
const newId = () => "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

function blocksFrom(start: number, end: number): boolean[] {
  return HOURS.map(h => h >= start && h < end)
}

function seed(): Staff[] {
  return [
    { id: newId(), name: "Lucía",   role: "mesero", blocks: blocksFrom(12, 18) },
    { id: newId(), name: "Marco",   role: "mesero", blocks: blocksFrom(16, 23) },
    { id: newId(), name: "Sofía",   role: "host",   blocks: blocksFrom(12, 20) },
    { id: newId(), name: "Diego",   role: "bar",    blocks: blocksFrom(17, 23) },
    { id: newId(), name: "Chef Ana",role: "cocina", blocks: blocksFrom(12, 23) },
  ]
}

export default function ShiftPlanner() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    let data: Staff[] | null = null
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) data = JSON.parse(raw) } catch { /* ignore */ }
    const list = data && Array.isArray(data) && data.length
      ? data.map(s => ({ ...s, blocks: s.blocks?.length === N ? s.blocks : blocksFrom(12, 18) }))
      : seed()
    setStaff(list)
    setLoaded(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(staff)) } catch { /* ignore */ }
  }, [staff, loaded])

  const toggle = (id: string, i: number) =>
    setStaff(prev => prev.map(s => s.id === id ? { ...s, blocks: s.blocks.map((b, j) => j === i ? !b : b) } : s))

  const setRole = (id: string, role: Role) => setStaff(prev => prev.map(s => s.id === id ? { ...s, role } : s))
  const rename = (id: string, name: string) => setStaff(prev => prev.map(s => s.id === id ? { ...s, name } : s))
  const remove = (id: string) => setStaff(prev => prev.filter(s => s.id !== id))
  const add = () => setStaff(prev => [...prev, { id: newId(), name: "Nuevo", role: "mesero", blocks: blocksFrom(12, 18) }])

  // --- Análisis de cobertura por franja (solo personal de piso: mesero/host/bar) ---
  const coverage = useMemo(() => HOURS.map((_, i) => {
    const servers = staff.filter(s => (s.role === "mesero" || s.role === "host" || s.role === "bar") && s.blocks[i]).length
    const demand = DEMAND[i] ?? 0
    const capacity = servers * COVERS_PER_SERVER
    const ratio = demand === 0 ? 1 : capacity / demand
    return { servers, demand, ratio }
  }), [staff])

  const totalHours = staff.reduce((sum, s) => sum + s.blocks.filter(Boolean).length, 0)
  const understaffed = coverage.filter(c => c.ratio < 1).length
  const peakDiners = Math.max(...DEMAND)
  const peakServers = Math.max(...coverage.map(c => c.servers))
  const dinersPerServer = peakServers ? Math.round(peakDiners / peakServers) : 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Personal" value={String(staff.length)} color={S.accent} />
        <KPI label="Horas/turno" value={String(totalHours)} />
        <KPI label="Franjas sin cubrir" value={String(understaffed)} color={understaffed ? "#f59e0b" : "#22c55e"} />
        <KPI label="Comensales/mesero (pico)" value={String(dinersPerServer)} color={dinersPerServer > COVERS_PER_SERVER ? "#ef4444" : S.text} />
      </div>

      <div className="rounded-2xl p-3 overflow-x-auto custom-scrollbar" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
        <div style={{ minWidth: 720 }}>
          {/* Cabecera de horas */}
          <div className="flex items-center mb-1.5">
            <div className="w-40 shrink-0" />
            {HOURS.map(h => (
              <div key={h} className="flex-1 text-center text-[10px] font-bold" style={{ color: S.sub }}>{h}h</div>
            ))}
            <div className="w-8 shrink-0" />
          </div>

          {/* Filas de empleados */}
          {staff.map(s => {
            const rm = ROLE_META[s.role]
            return (
              <div key={s.id} className="flex items-center mb-1.5">
                <div className="w-40 shrink-0 pr-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: rm.color }} />
                  <input value={s.name} onChange={e => rename(s.id, e.target.value)} className="bg-transparent text-xs font-bold outline-none w-16 min-w-0 flex-1" style={{ color: S.text }} />
                  <select value={s.role} onChange={e => setRole(s.id, e.target.value as Role)} className="text-[10px] rounded px-1 py-0.5 bg-transparent" style={{ color: rm.color, border: `1px solid ${S.border}` }}>
                    {(Object.keys(ROLE_META) as Role[]).map(r => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
                  </select>
                </div>
                {s.blocks.map((on, i) => (
                  <button key={i} onClick={() => toggle(s.id, i)}
                    className="flex-1 h-7 mx-px rounded transition"
                    style={{ backgroundColor: on ? rm.color : S.elevated, opacity: on ? 0.9 : 1, border: `1px solid ${on ? rm.color : S.border}` }}
                    title={`${s.name} · ${HOURS[i]}:00`} />
                ))}
                <div className="w-8 shrink-0 text-center">
                  <button onClick={() => remove(s.id)} className="text-xs" style={{ color: "#f87171" }} title="Quitar">✕</button>
                </div>
              </div>
            )
          })}

          {/* Fila de cobertura */}
          <div className="flex items-center mt-2 pt-2 border-t" style={{ borderColor: S.border }}>
            <div className="w-40 shrink-0 pr-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: S.sub }}>Cobertura</div>
            {coverage.map((c, i) => {
              const color = c.ratio >= 1 ? "#22c55e" : c.ratio >= 0.7 ? "#f59e0b" : "#ef4444"
              return (
                <div key={i} className="flex-1 mx-px text-center" title={`${c.servers} en piso · demanda ${c.demand} comensales`}>
                  <div className="h-7 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: color }}>{c.servers}</div>
                </div>
              )
            })}
            <div className="w-8 shrink-0" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={add} className="text-sm px-3 py-2 rounded-full font-semibold" style={{ backgroundColor: S.accent, color: "#000" }}>+ Agregar personal</button>
        <p className="text-[11px]" style={{ color: S.sub }}>Verde = cobertura suficiente · Rojo = falta personal para la demanda esperada</p>
      </div>
    </div>
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
