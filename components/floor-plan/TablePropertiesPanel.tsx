"use client"

import React from "react"
import {
  RestaurantTable,
  TableStatus,
  TableType,
  STATUS_META,
  STATUS_ORDER,
  TYPE_META,
  TYPE_ORDER,
} from "./types"

const S = {
  card: "var(--ad-card)",
  accent: "var(--ad-accent)",
  text: "var(--ad-text)",
  sub: "var(--ad-sub)",
  border: "var(--ad-border)",
}

const fieldStyle = {
  backgroundColor: "var(--ad-elevated)",
  color: "var(--ad-text)",
  border: "1px solid var(--ad-border)",
}
const FIELD_CLS = "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"

type Props = {
  table: RestaurantTable | null
  onChange: (patch: Partial<RestaurantTable>) => void
  onDuplicate: () => void
  onDelete: () => void
}

export default function TablePropertiesPanel({ table, onChange, onDuplicate, onDelete }: Props) {
  if (!table) {
    return (
      <aside
        className="rounded-2xl p-5 w-full lg:w-72 shrink-0 flex flex-col items-center justify-center text-center"
        style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, minHeight: 200 }}
      >
        <p className="text-3xl mb-2">🪑</p>
        <p className="font-semibold" style={{ color: S.text }}>Ninguna mesa seleccionada</p>
        <p className="text-xs mt-1" style={{ color: S.sub }}>
          Haz clic en una mesa del plano para editar sus propiedades.
        </p>
      </aside>
    )
  }

  return (
    <aside
      className="rounded-2xl p-4 space-y-4 w-full lg:w-72 shrink-0"
      style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold" style={{ color: S.text }}>Propiedades</h3>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
          style={{ backgroundColor: STATUS_META[table.status].color + "22", color: STATUS_META[table.status].color }}
        >
          {STATUS_META[table.status].label}
        </span>
      </div>

      <Field label="Nombre / número">
        <input
          type="text"
          value={table.name}
          onChange={e => onChange({ name: e.target.value })}
          className={FIELD_CLS}
          style={fieldStyle}
          placeholder="Ej. Mesa 12"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select
            value={table.type}
            onChange={e => onChange(applyTypeChange(table, e.target.value as TableType))}
            className={FIELD_CLS}
            style={fieldStyle}
          >
            {TYPE_ORDER.map(t => (
              <option key={t} value={t}>{TYPE_META[t].label}</option>
            ))}
          </select>
        </Field>
        <Field label="Capacidad">
          <input
            type="number"
            min={1}
            max={50}
            value={table.capacity}
            onChange={e => onChange({ capacity: Math.max(1, parseInt(e.target.value) || 1) })}
            className={FIELD_CLS}
            style={fieldStyle}
          />
        </Field>
      </div>

      <Field label="Zona">
        <input
          type="text"
          value={table.zone}
          onChange={e => onChange({ zone: e.target.value })}
          className={FIELD_CLS}
          style={fieldStyle}
          placeholder="Ej. Terraza, Salón, VIP"
        />
      </Field>

      <Field label="Estado">
        <div className="grid grid-cols-3 gap-1.5">
          {STATUS_ORDER.map(st => {
            const active = table.status === st
            const m = STATUS_META[st]
            return (
              <button
                key={st}
                onClick={() => onChange({ status: st as TableStatus })}
                title={m.label}
                className="rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wide transition"
                style={{
                  backgroundColor: active ? m.color : "var(--ad-elevated)",
                  color: active ? "#000" : m.color,
                  border: `1px solid ${active ? m.color : "var(--ad-border)"}`,
                }}
              >
                {m.label.split(" ")[0]}
              </button>
            )
          })}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={`Ancho · ${table.width}px`}>
          <input
            type="range" min={30} max={300} value={table.width}
            onChange={e => onChange(applyWidth(table, parseInt(e.target.value)))}
            className="w-full accent-emerald-500"
          />
        </Field>
        <Field label={`Alto · ${table.height}px`}>
          <input
            type="range" min={30} max={300} value={table.height}
            onChange={e => onChange({ height: parseInt(e.target.value) })}
            disabled={table.type === "round"}
            className="w-full accent-emerald-500 disabled:opacity-40"
          />
        </Field>
      </div>

      <Field label={`Rotación · ${table.rotation}°`}>
        <input
          type="range" min={0} max={360} value={table.rotation}
          onChange={e => onChange({ rotation: parseInt(e.target.value) })}
          className="w-full accent-emerald-500"
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onDuplicate}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition hover:brightness-125"
          style={{ backgroundColor: "var(--ad-elevated)", color: S.text, border: `1px solid ${S.border}` }}
        >
          ⧉ Duplicar
        </button>
        <button
          onClick={onDelete}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition"
          style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.35)", backgroundColor: "transparent" }}
        >
          🗑 Eliminar
        </button>
      </div>
    </aside>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// Al cambiar de tipo ajustamos tamaño/forma coherentes (round = cuadrado).
function applyTypeChange(table: RestaurantTable, type: TableType): Partial<RestaurantTable> {
  const m = TYPE_META[type]
  if (type === "round" || type === "square") {
    const side = type === "round" ? m.defaultWidth : table.width
    return { type, width: side, height: side }
  }
  return { type, width: table.width < 90 ? m.defaultWidth : table.width, height: m.defaultHeight }
}

// La mesa redonda mantiene proporción 1:1.
function applyWidth(table: RestaurantTable, width: number): Partial<RestaurantTable> {
  if (table.type === "round") return { width, height: width }
  return { width }
}
