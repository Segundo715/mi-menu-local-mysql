"use client"

import React from "react"
import { TableType, TYPE_META, TYPE_ORDER } from "./types"

const S = {
  card: "var(--ad-card)",
  accent: "var(--ad-accent)",
  text: "var(--ad-text)",
  sub: "var(--ad-sub)",
  border: "var(--ad-border)",
}

type Props = {
  showGrid: boolean
  preview: boolean
  tableCount: number
  dirty: boolean
  onAddTable: (type: TableType) => void
  onToggleGrid: () => void
  onTogglePreview: () => void
  onSave: () => void
  onLoad: () => void
  onClear: () => void
  onReimport: () => void
}

export default function FloorToolbar({
  showGrid,
  preview,
  tableCount,
  dirty,
  onAddTable,
  onToggleGrid,
  onTogglePreview,
  onSave,
  onLoad,
  onClear,
  onReimport,
}: Props) {
  return (
    <aside
      className="rounded-2xl p-4 space-y-5 w-full lg:w-60 shrink-0"
      style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: S.sub }}>
          Agregar mesa
        </p>
        <div className="grid grid-cols-2 gap-2">
          {TYPE_ORDER.map(type => {
            const m = TYPE_META[type]
            return (
              <button
                key={type}
                onClick={() => onAddTable(type)}
                disabled={preview}
                className="flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-semibold transition hover:brightness-125 disabled:opacity-40"
                style={{ backgroundColor: "var(--ad-elevated)", color: S.text, border: `1px solid ${S.border}` }}
              >
                <span className="text-lg leading-none">{m.emoji}</span>
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: S.sub }}>
          Vista
        </p>
        <ToggleRow label="Cuadrícula" active={showGrid} onClick={onToggleGrid} />
        <ToggleRow label="Vista previa" active={preview} onClick={onTogglePreview} accent="#a855f7" />
      </div>

      <div className="space-y-2 pt-1">
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: S.sub }}>
          Acomodo
        </p>
        <button
          onClick={onSave}
          className="w-full rounded-xl py-2.5 text-sm font-bold transition hover:brightness-110"
          style={{ backgroundColor: S.accent, color: "#000" }}
        >
          💾 Guardar {dirty && <span className="opacity-70">•</span>}
        </button>
        <button
          onClick={onLoad}
          className="w-full rounded-xl py-2.5 text-sm font-semibold transition hover:brightness-125"
          style={{ backgroundColor: "var(--ad-elevated)", color: S.text, border: `1px solid ${S.border}` }}
        >
          ↻ Cargar guardado
        </button>
        <button
          onClick={onReimport}
          className="w-full rounded-xl py-2.5 text-sm font-semibold transition hover:brightness-125"
          style={{ backgroundColor: "var(--ad-elevated)", color: "var(--ad-accent)", border: "1px solid var(--ad-border)" }}
        >
          ⟳ Reimportar desde DB
        </button>
        <button
          onClick={onClear}
          className="w-full rounded-xl py-2 text-sm font-medium transition"
          style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", backgroundColor: "transparent" }}
        >
          Vaciar plano
        </button>
      </div>

      <p className="text-xs text-center pt-1" style={{ color: S.sub }}>
        {tableCount} mesa{tableCount === 1 ? "" : "s"} en el plano
      </p>
    </aside>
  )
}

function ToggleRow({
  label,
  active,
  onClick,
  accent = "var(--ad-accent)",
}: {
  label: string
  active: boolean
  onClick: () => void
  accent?: string
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition"
      style={{ backgroundColor: "var(--ad-elevated)", color: "var(--ad-text)", border: "1px solid var(--ad-border)" }}
    >
      <span>{label}</span>
      <span
        className="w-9 h-5 rounded-full flex items-center transition-all px-0.5"
        style={{ backgroundColor: active ? accent : "var(--ad-border)" }}
      >
        <span
          className="w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: active ? "translateX(16px)" : "translateX(0)" }}
        />
      </span>
    </button>
  )
}
