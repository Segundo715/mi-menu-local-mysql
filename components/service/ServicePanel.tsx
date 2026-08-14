"use client"

import React from "react"
import { RestaurantTable } from "../floor-plan/types"
import {
  Party,
  PARTY_STATUS_META,
  minutesSince,
  formatDuration,
} from "./serviceTypes"

const S = {
  card: "var(--ad-card)",
  elevated: "var(--ad-elevated)",
  accent: "var(--ad-accent)",
  text: "var(--ad-text)",
  sub: "var(--ad-sub)",
  border: "var(--ad-border)",
}

type Props = {
  parties: Party[]
  tables: RestaurantTable[]
  selectedTableId: string | null
  selectedPartyId: string | null
  /** `now` se inyecta desde el padre (tras montar) para no romper la hidratación. */
  now: Date | null
  onSelectParty: (id: string) => void
  onSeat: (id: string) => void
  onNotify: (id: string) => void
  onNoShow: (id: string) => void
  onFinish: (id: string) => void
}

export default function ServicePanel({
  parties,
  tables,
  selectedTableId,
  selectedPartyId,
  now,
  onSelectParty,
  onSeat,
  onNotify,
  onNoShow,
  onFinish,
}: Props) {
  const waitlist = parties.filter(p => p.kind === "waitlist" && p.status !== "finished" && p.status !== "no_show")
  const reservations = parties.filter(p => p.kind === "reservation" && p.status !== "finished" && p.status !== "no_show")

  // Indicador de ocupación: mesas ocupadas/reservadas vs total.
  const total = tables.length
  const occupied = tables.filter(t => t.status === "occupied").length
  const reserved = tables.filter(t => t.status === "reserved").length
  const busy = occupied + reserved
  const pct = total > 0 ? Math.round((busy / total) * 100) : 0
  const seatedDiners = parties.filter(p => p.status === "seated").reduce((s, p) => s + p.size, 0)

  return (
    <aside
      className="rounded-2xl flex flex-col w-full lg:w-[340px] shrink-0 overflow-hidden"
      style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, maxHeight: 720 }}
    >
      {/* Encabezado + ocupación */}
      <div className="p-4 border-b" style={{ borderColor: S.border }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-black" style={{ color: S.text }}>Servicio en sala</h3>
          <span className="text-xs font-bold" style={{ color: pct >= 80 ? "#ef4444" : pct >= 50 ? "#f59e0b" : S.accent }}>
            {pct}% ocupación
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: S.elevated }}>
          <div
            className="h-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#ef4444" : pct >= 50 ? "#f59e0b" : S.accent }}
          />
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: S.sub }}>
          <span>🟢 {occupied} ocupadas</span>
          <span>🔵 {reserved} reservadas</span>
          <span>🍽 {seatedDiners} comensales</span>
        </div>
      </div>

      {/* Listas */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        <Section title="Lista de espera" count={waitlist.length} hint={!selectedTableId ? "Selecciona una mesa para sentar" : undefined}>
          {waitlist.length === 0 ? (
            <Empty text="Sin clientes en espera" />
          ) : (
            waitlist.map(p => (
              <PartyRow
                key={p.id} party={p} now={now}
                selected={p.id === selectedPartyId}
                canSeat={!!selectedTableId}
                onSelect={() => onSelectParty(p.id)}
                onSeat={() => onSeat(p.id)}
                onNotify={() => onNotify(p.id)}
                onNoShow={() => onNoShow(p.id)}
                onFinish={() => onFinish(p.id)}
              />
            ))
          )}
        </Section>

        <Section title="Reservaciones" count={reservations.length}>
          {reservations.length === 0 ? (
            <Empty text="Sin reservaciones activas" />
          ) : (
            reservations.map(p => (
              <PartyRow
                key={p.id} party={p} now={now}
                selected={p.id === selectedPartyId}
                canSeat={!!selectedTableId}
                onSelect={() => onSelectParty(p.id)}
                onSeat={() => onSeat(p.id)}
                onNotify={() => onNotify(p.id)}
                onNoShow={() => onNoShow(p.id)}
                onFinish={() => onFinish(p.id)}
              />
            ))
          )}
        </Section>
      </div>
    </aside>
  )
}

function Section({ title, count, hint, children }: { title: string; count: number; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: S.sub }}>
          {title} <span style={{ color: S.accent }}>({count})</span>
        </p>
        {hint && <p className="text-[10px]" style={{ color: "#f59e0b" }}>{hint}</p>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <p className="text-xs text-center py-3 rounded-xl" style={{ color: S.sub, backgroundColor: S.elevated }}>
      {text}
    </p>
  )
}

// =============================================================================
// Una fila = una reserva / grupo de clientes.
// =============================================================================
function PartyRow({
  party, now, selected, canSeat,
  onSelect, onSeat, onNotify, onNoShow, onFinish,
}: {
  party: Party
  now: Date | null
  selected: boolean
  canSeat: boolean
  onSelect: () => void
  onSeat: () => void
  onNotify: () => void
  onNoShow: () => void
  onFinish: () => void
}) {
  const meta = PARTY_STATUS_META[party.status]
  const isSeated = party.status === "seated"

  // Tiempo mostrado: permanencia (si está sentado) o espera/cuenta regresiva.
  let timeChip = ""
  if (now) {
    if (isSeated) {
      timeChip = `⏱ ${formatDuration(minutesSince(party.seatedSince, now))} en mesa`
    } else if (party.kind === "reservation") {
      const diff = minutesSince(party.arrival, now)
      timeChip = diff < 0 ? `🕒 en ${formatDuration(diff)}` : `🕒 hace ${formatDuration(diff)}`
    } else {
      timeChip = `⌛ ${formatDuration(minutesSince(party.arrival, now))} esperando`
    }
  }

  return (
    <div
      onClick={onSelect}
      className="rounded-xl p-2.5 cursor-pointer transition relative overflow-hidden"
      style={{
        backgroundColor: "var(--ad-elevated)",
        border: `1px solid ${selected ? meta.color : "var(--ad-border)"}`,
        boxShadow: selected ? `0 0 0 1px ${meta.color}` : undefined,
      }}
    >
      {/* Franja de color de estado a la izquierda */}
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: meta.color }} />

      <div className="pl-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-sm truncate" style={{ color: S.text }}>{party.name}</p>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0"
            style={{ backgroundColor: meta.color + "22", color: meta.color }}
          >
            {meta.label}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap" style={{ color: S.sub }}>
          <span>👥 {party.size}p</span>
          <span>·</span>
          <span style={{ color: party.tableName ? S.text : S.sub }}>
            {party.tableName ? `🪑 ${party.tableName}` : "Sin mesa"}
          </span>
          <span>·</span>
          <span>{timeChip || `🕒 ${party.arrival}`}</span>
        </div>

        {party.notes && (
          <p className="text-[11px] mt-1 font-medium" style={{ color: "#fbbf24" }}>📝 {party.notes}</p>
        )}

        {/* Iconos de acción rápida del personal */}
        <div className="flex items-center gap-1.5 mt-2">
          {!isSeated && (
            <ActionIcon
              title={canSeat ? "Sentar en la mesa seleccionada" : "Selecciona una mesa primero"}
              label="Sentar" icon="🪑" disabled={!canSeat}
              onClick={(e) => { e.stopPropagation(); onSeat() }}
              color={S.accent}
            />
          )}
          {isSeated && (
            <ActionIcon
              title="Liberar mesa (terminó el servicio)"
              label="Liberar" icon="✔"
              onClick={(e) => { e.stopPropagation(); onFinish() }}
              color="#22c55e"
            />
          )}
          <ActionIcon
            title="Avisar al cliente (mesa lista)"
            label="Avisar" icon="📲"
            onClick={(e) => { e.stopPropagation(); onNotify() }}
          />
          <ActionIcon
            title="Marcar como no presentado"
            label="No llegó" icon="✖"
            onClick={(e) => { e.stopPropagation(); onNoShow() }}
            color="#f87171"
          />
        </div>
      </div>
    </div>
  )
}

function ActionIcon({
  title, label, icon, color, disabled, onClick,
}: {
  title: string
  label: string
  icon: string
  color?: string
  disabled?: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition hover:brightness-125 disabled:opacity-35 disabled:cursor-not-allowed"
      style={{ backgroundColor: "var(--ad-card)", color: color ?? "var(--ad-sub)", border: "1px solid var(--ad-border)" }}
    >
      <span>{icon}</span>
      <span className="hidden xl:inline">{label}</span>
    </button>
  )
}
