"use client"

import React, { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import {
  FloorPlan,
  RestaurantTable,
  FLOOR_PLAN_STORAGE_KEY,
} from "../floor-plan/types"
import ServicePanel from "./ServicePanel"
import { Party, seedParties } from "./serviceTypes"

const FloorCanvas = dynamic(() => import("../floor-plan/FloorCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center rounded-xl" style={{ height: 480, background: "#0b1020", color: "var(--ad-sub)" }}>
      Cargando plano…
    </div>
  ),
})

const S = {
  card: "var(--ad-card)",
  accent: "var(--ad-accent)",
  text: "var(--ad-text)",
  sub: "var(--ad-sub)",
  border: "var(--ad-border)",
}

const DEFAULT_PLAN: FloorPlan = {
  id: "plan-1", restaurantId: "default", name: "Plano principal",
  width: 1000, height: 600, tables: [],
}

const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`

export default function ServiceView() {
  const [plan, setPlan] = useState<FloorPlan>(DEFAULT_PLAN)
  const [parties, setParties] = useState<Party[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null)
  const [now, setNow] = useState<Date | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1800)
  }

  // Carga inicial: plano guardado + grupos demo + reloj.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = localStorage.getItem(FLOOR_PLAN_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as FloorPlan
        if (parsed && Array.isArray(parsed.tables)) setPlan({ ...DEFAULT_PLAN, ...parsed })
      }
    } catch {
      // ignore
    }
    setParties(seedParties())
    setNow(new Date())
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // Reloj que refresca los tiempos (permanencia / espera) cada 30s.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Persiste el plano (para que la pestaña editor refleje los cambios de estado).
  const persistPlan = (next: FloorPlan) => {
    try {
      localStorage.setItem(FLOOR_PLAN_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  const setTableStatus = (tableId: string, status: RestaurantTable["status"]) => {
    setPlan(p => {
      const next = { ...p, tables: p.tables.map(t => (t.id === tableId ? { ...t, status } : t)) }
      persistPlan(next)
      return next
    })
  }

  // --- Acciones del personal ---
  const seatParty = (partyId: string) => {
    if (!selectedTableId) return flash("Selecciona una mesa en el plano")
    const table = plan.tables.find(t => t.id === selectedTableId)
    if (!table) return
    if (table.status === "occupied") return flash(`${table.name} ya está ocupada`)
    setParties(prev => prev.map(p =>
      p.id === partyId
        ? { ...p, status: "seated", tableId: table.id, tableName: table.name, seatedSince: hhmm(new Date()) }
        : p
    ))
    setTableStatus(table.id, "occupied")
    setSelectedPartyId(null)
    flash(`Sentados en ${table.name} ✓`)
  }

  const finishParty = (partyId: string) => {
    const party = parties.find(p => p.id === partyId)
    setParties(prev => prev.map(p => (p.id === partyId ? { ...p, status: "finished" } : p)))
    if (party?.tableId) setTableStatus(party.tableId, "free")
    flash("Mesa liberada ✓")
  }

  const noShowParty = (partyId: string) => {
    const party = parties.find(p => p.id === partyId)
    setParties(prev => prev.map(p => (p.id === partyId ? { ...p, status: "no_show" } : p)))
    if (party?.tableId) setTableStatus(party.tableId, "free")
    flash("Marcado como no llegó")
  }

  const notifyParty = (partyId: string) => {
    const party = parties.find(p => p.id === partyId)
    flash(party?.phone ? `Aviso enviado a ${party.phone}` : "Aviso enviado")
  }

  const selectedTable = plan.tables.find(t => t.id === selectedTableId) ?? null

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      <ServicePanel
        parties={parties}
        tables={plan.tables}
        selectedTableId={selectedTableId}
        selectedPartyId={selectedPartyId}
        now={now}
        onSelectParty={setSelectedPartyId}
        onSeat={seatParty}
        onNotify={notifyParty}
        onNoShow={noShowParty}
        onFinish={finishParty}
      />

      {/* Plano (solo lectura: selección sí, mover no) */}
      <div className="flex-1 min-w-0 rounded-2xl p-3 space-y-2" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-bold" style={{ color: S.text }}>Plano en vivo</p>
          <p className="text-xs" style={{ color: selectedTable ? S.accent : S.sub }}>
            {selectedTable ? `Mesa seleccionada: ${selectedTable.name}` : "Toca una mesa para asignarla"}
          </p>
        </div>

        {plan.tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center rounded-xl py-16 px-4" style={{ background: "#0b1020", color: S.sub }}>
            <p className="text-3xl mb-2">🗺️</p>
            <p className="font-semibold" style={{ color: S.text }}>Aún no hay plano de mesas</p>
            <p className="text-xs mt-1">Créalo en la pestaña <strong>Plano de mesas</strong> y pulsa Guardar; aparecerá aquí.</p>
          </div>
        ) : (
          <FloorCanvas
            tables={plan.tables}
            selectedId={selectedTableId}
            showGrid={false}
            gridSize={25}
            preview
            planWidth={plan.width}
            planHeight={plan.height}
            onSelect={setSelectedTableId}
            onChange={() => { /* solo lectura en servicio */ }}
          />
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-bold shadow-xl"
          style={{ backgroundColor: S.accent, color: "#000" }}>
          {toast}
        </div>
      )}
    </div>
  )
}
