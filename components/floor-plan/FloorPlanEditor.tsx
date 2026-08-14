"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import {
  FloorPlan,
  RestaurantTable,
  TableType,
  TableStatus,
  TYPE_META,
  STATUS_META,
  STATUS_ORDER,
  FLOOR_PLAN_STORAGE_KEY,
  newTableId,
} from "./types"
import FloorToolbar from "./FloorToolbar"
import TablePropertiesPanel from "./TablePropertiesPanel"

// react-konva no soporta SSR: el lienzo se carga solo en cliente.
const FloorCanvas = dynamic(() => import("./FloorCanvas"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-xl"
      style={{ height: 600, background: "#0b1020", color: "var(--ad-sub)" }}
    >
      Cargando lienzo…
    </div>
  ),
})

const PLAN_WIDTH = 1000
const PLAN_HEIGHT = 600
const GRID_SIZE = 25

// Mapeo de estado entre canvas y DB
const TO_DB: Record<string, string> = {
  free: 'libre', occupied: 'ocupada', reserved: 'reservada', cleaning: 'limpieza',
}
const FROM_DB: Record<string, TableStatus> = {
  libre: 'free', ocupada: 'occupied', reservada: 'reserved', limpieza: 'cleaning',
}

interface DBTable { id: string; label: string; seats: number; zone: string; status: string }

const S = {
  card: "var(--ad-card)",
  accent: "var(--ad-accent)",
  text: "var(--ad-text)",
  sub: "var(--ad-sub)",
  border: "var(--ad-border)",
}

function emptyPlan(): FloorPlan {
  return {
    id: "plan-1",
    restaurantId: "default",
    name: "Plano principal",
    width: PLAN_WIDTH,
    height: PLAN_HEIGHT,
    tables: [],
  }
}

// Plano de ejemplo para el primer arranque (si no hay nada guardado).
function seedPlan(): FloorPlan {
  const plan = emptyPlan()
  plan.tables = [
    { id: newTableId(), name: "M1", type: "round",     capacity: 4, x: 160, y: 140, width: 80,  height: 80,  rotation: 0, zone: "Salón",   status: "free" },
    { id: newTableId(), name: "M2", type: "square",    capacity: 2, x: 320, y: 140, width: 70,  height: 70,  rotation: 0, zone: "Salón",   status: "occupied" },
    { id: newTableId(), name: "M3", type: "rectangle", capacity: 6, x: 540, y: 160, width: 130, height: 70,  rotation: 0, zone: "Salón",   status: "reserved" },
    { id: newTableId(), name: "Barra", type: "bar",    capacity: 8, x: 360, y: 360, width: 320, height: 42,  rotation: 0, zone: "Barra",   status: "free" },
  ]
  return plan
}

export default function FloorPlanEditor() {
  const [plan, setPlan] = useState<FloorPlan>(emptyPlan)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [preview, setPreview] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const loadedRef = useRef(false)

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1800)
  }

  // --- Cargar el acomodo y sincronizar estados con la DB ---
  useEffect(() => {
    const raw = localStorage.getItem(FLOOR_PLAN_STORAGE_KEY)

    fetch('/api/resta3/tables')
      .then(r => r.json())
      .then((dbTables: DBTable[]) => {
        let parsed: FloorPlan | null = null
        try {
          if (raw) {
            const p = JSON.parse(raw) as FloorPlan
            if (p && Array.isArray(p.tables)) parsed = { ...emptyPlan(), ...p }
          }
        } catch { /* ignore */ }

        if (parsed) {
          // Overlay DB status onto existing canvas tables
          const synced = parsed.tables.map(t => {
            const db = dbTables.find(d => (t.dbId && d.id === t.dbId) || d.label === t.name)
            if (!db) return t
            return { ...t, dbId: db.id, status: FROM_DB[db.status] ?? t.status }
          })
          setPlan({ ...parsed, tables: synced })
        } else if (dbTables.length > 0) {
          // Sin plano guardado: auto-importar las mesas de la DB en una cuadrícula
          const autoTables: RestaurantTable[] = dbTables.map((db, i) => {
            const col = i % 4
            const row = Math.floor(i / 4)
            const type: TableType =
              db.label.toLowerCase().includes('barra') ? 'bar'
              : db.seats >= 6 ? 'rectangle'
              : db.seats <= 2 ? 'square'
              : 'round'
            const m = TYPE_META[type]
            return {
              id: newTableId(), dbId: db.id, name: db.label,
              type, capacity: db.seats,
              x: 80 + col * 220, y: 80 + row * 180,
              width: m.defaultWidth, height: m.defaultHeight,
              rotation: 0, zone: db.zone,
              status: FROM_DB[db.status] ?? 'free',
            }
          })
          setPlan({ ...emptyPlan(), tables: autoTables })
        } else {
          setPlan(seedPlan())
        }
        loadedRef.current = true
      })
      .catch(() => {
        // Sin red: usar localStorage o demo
        try {
          if (raw) {
            const p = JSON.parse(raw) as FloorPlan
            if (p && Array.isArray(p.tables)) { setPlan({ ...emptyPlan(), ...p }); loadedRef.current = true; return }
          }
        } catch { /* ignore */ }
        setPlan(seedPlan())
        loadedRef.current = true
      })
  }, [])

  const selected = plan.tables.find(t => t.id === selectedId) ?? null

  // --- Mutaciones de mesas ---
  const upsertTable = useCallback((table: RestaurantTable) => {
    setPlan(p => ({ ...p, tables: p.tables.map(t => (t.id === table.id ? table : t)) }))
    setDirty(true)
  }, [])

  const patchSelected = useCallback((patch: Partial<RestaurantTable>) => {
    if (!selectedId) return
    setPlan(p => {
      const table = p.tables.find(t => t.id === selectedId)
      if (table && patch.status !== undefined && table.dbId && TO_DB[patch.status]) {
        fetch(`/api/resta3/tables/${table.dbId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: TO_DB[patch.status] }),
        }).catch(() => {})
      }
      return { ...p, tables: p.tables.map(t => t.id === selectedId ? { ...t, ...patch } : t) }
    })
    setDirty(true)
  }, [selectedId])

  const addTable = (type: TableType) => {
    const m = TYPE_META[type]
    const canvasId = newTableId()
    const tableCount = plan.tables.length
    const table: RestaurantTable = {
      id: canvasId,
      name: `Mesa ${tableCount + 1}`,
      type,
      capacity: m.defaultCapacity,
      x: PLAN_WIDTH / 2 + (tableCount % 5) * 12,
      y: PLAN_HEIGHT / 2 + (tableCount % 5) * 12,
      width: m.defaultWidth,
      height: m.defaultHeight,
      rotation: 0,
      zone: "Salón",
      status: "free",
    }
    setPlan(p => ({ ...p, tables: [...p.tables, table] }))
    setSelectedId(canvasId)
    setDirty(true)
    // Crear en DB y guardar el dbId
    fetch('/api/resta3/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: table.name, seats: table.capacity, status: 'libre', zone: table.zone }),
    }).then(r => r.ok ? r.json() : null)
      .then(dbTable => {
        if (dbTable?.id) {
          setPlan(p => ({ ...p, tables: p.tables.map(t => t.id === canvasId ? { ...t, dbId: dbTable.id } : t) }))
        }
      }).catch(() => {})
  }

  const duplicateSelected = () => {
    if (!selected) return
    const copy: RestaurantTable = {
      ...selected,
      id: newTableId(),
      name: selected.name + " copia",
      x: selected.x + 30,
      y: selected.y + 30,
    }
    setPlan(p => ({ ...p, tables: [...p.tables, copy] }))
    setSelectedId(copy.id)
    setDirty(true)
  }

  const deleteSelected = () => {
    if (!selectedId) return
    const table = plan.tables.find(t => t.id === selectedId)
    setPlan(p => ({ ...p, tables: p.tables.filter(t => t.id !== selectedId) }))
    setSelectedId(null)
    setDirty(true)
    if (table?.dbId) {
      fetch(`/api/resta3/tables/${table.dbId}`, { method: 'DELETE' }).catch(() => {})
    }
  }

  const clearPlan = () => {
    if (!window.confirm("¿Vaciar el plano? Se quitarán todas las mesas (no se guarda hasta que pulses Guardar).")) return
    setPlan(p => ({ ...p, tables: [] }))
    setSelectedId(null)
    setDirty(true)
  }

  // Reimporta las mesas desde la DB manteniendo posiciones existentes y añadiendo las nuevas
  const reimport = () => {
    fetch('/api/resta3/tables')
      .then(r => r.json())
      .then((dbTables: DBTable[]) => {
        setPlan(p => {
          const next = [...p.tables]
          dbTables.forEach(db => {
            const idx = next.findIndex(t => (t.dbId && t.dbId === db.id) || t.name === db.label)
            if (idx >= 0) {
              // Mesa ya en el plano: solo actualiza estado y dbId
              next[idx] = { ...next[idx], dbId: db.id, status: FROM_DB[db.status] ?? next[idx].status }
            } else {
              // Nueva mesa: añadir en posición libre
              const col = next.length % 4
              const row = Math.floor(next.length / 4)
              const type: TableType =
                db.label.toLowerCase().includes('barra') ? 'bar'
                : db.seats >= 6 ? 'rectangle'
                : db.seats <= 2 ? 'square'
                : 'round'
              const m = TYPE_META[type]
              next.push({
                id: newTableId(), dbId: db.id, name: db.label,
                type, capacity: db.seats,
                x: 80 + col * 220, y: 80 + row * 180,
                width: m.defaultWidth, height: m.defaultHeight,
                rotation: 0, zone: db.zone,
                status: FROM_DB[db.status] ?? 'free',
              })
            }
          })
          return { ...p, tables: next }
        })
        setDirty(true)
        flash("Mesas actualizadas desde DB ✓")
      })
      .catch(() => flash("No se pudo conectar con la DB"))
  }

  // --- Persistencia ---
  // save() sincroniza el plano con la DB: borra mesas que ya no están,
  // actualiza las existentes y crea las nuevas. La DB queda idéntica al plano.
  const save = async () => {
    try {
      localStorage.setItem(FLOOR_PLAN_STORAGE_KEY, JSON.stringify(plan))
      setDirty(false)
    } catch {
      flash("No se pudo guardar")
      return
    }

    flash("Sincronizando con DB…")

    const res = await fetch('/api/resta3/tables').catch(() => null)
    const dbTables: DBTable[] = res?.ok ? await res.json() : []
    const canvasDbIds = new Set(plan.tables.map(t => t.dbId).filter(Boolean))

    // 1. Borrar de la DB las mesas que ya no están en el plano
    await Promise.all(
      dbTables
        .filter(db => !canvasDbIds.has(db.id))
        .map(db => fetch(`/api/resta3/tables/${db.id}`, { method: 'DELETE' }).catch(() => {}))
    )

    // 2. Actualizar/crear mesas del plano en DB
    const updated = await Promise.all(plan.tables.map(async t => {
      if (t.dbId && dbTables.find(db => db.id === t.dbId)) {
        await fetch(`/api/resta3/tables/${t.dbId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: t.name, seats: t.capacity, zone: t.zone }),
        }).catch(() => {})
        return t
      }
      const r = await fetch('/api/resta3/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: t.name, seats: t.capacity, status: TO_DB[t.status] ?? 'libre', zone: t.zone }),
      }).catch(() => null)
      if (r?.ok) {
        const db: DBTable = await r.json()
        return { ...t, dbId: db.id }
      }
      return t
    }))

    // 3. Actualizar el plano con los dbIds nuevos y persistir
    setPlan(p => {
      const next = { ...p, tables: updated }
      try { localStorage.setItem(FLOOR_PLAN_STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })

    flash("Guardado y sincronizado ✓")
  }

  const load = () => {
    try {
      const raw = localStorage.getItem(FLOOR_PLAN_STORAGE_KEY)
      if (!raw) return flash("No hay acomodo guardado")
      const parsed = JSON.parse(raw) as FloorPlan
      setPlan({ ...emptyPlan(), ...parsed })
      setSelectedId(null)
      setDirty(false)
      flash("Acomodo cargado ✓")
    } catch {
      flash("No se pudo cargar")
    }
  }

  // Atajo: Supr/Backspace elimina la mesa seleccionada (si no se está escribiendo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !preview) {
        e.preventDefault()
        deleteSelected()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, preview])

  return (
    <div className="space-y-3">
      {/* Encabezado del módulo */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black" style={{ color: S.text }}>Editor Visual de Plano de Mesas</h2>
          <p className="text-xs" style={{ color: S.sub }}>
            Arrastra para mover · selecciona para editar · usa las esquinas para rotar/redimensionar
          </p>
        </div>
        {/* Leyenda de estados */}
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map(st => (
            <span key={st} className="flex items-center gap-1 text-[11px]" style={{ color: S.sub }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_META[st].color }} />
              {STATUS_META[st].label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <FloorToolbar
          showGrid={showGrid}
          preview={preview}
          tableCount={plan.tables.length}
          dirty={dirty}
          onAddTable={addTable}
          onToggleGrid={() => setShowGrid(g => !g)}
          onTogglePreview={() => { setPreview(p => !p); setSelectedId(null) }}
          onSave={save}
          onLoad={load}
          onClear={clearPlan}
          onReimport={reimport}
        />

        <div className="flex-1 min-w-0 rounded-2xl p-2" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <FloorCanvas
            tables={plan.tables}
            selectedId={selectedId}
            showGrid={showGrid}
            gridSize={GRID_SIZE}
            preview={preview}
            planWidth={plan.width}
            planHeight={plan.height}
            onSelect={setSelectedId}
            onChange={upsertTable}
          />
        </div>

        {!preview && (
          <TablePropertiesPanel
            table={selected}
            onChange={patchSelected}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
          />
        )}
      </div>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-bold shadow-xl"
          style={{ backgroundColor: S.accent, color: "#000" }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
