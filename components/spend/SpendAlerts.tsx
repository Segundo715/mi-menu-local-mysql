"use client"

import React, { useEffect, useMemo, useState } from "react"

// =============================================================================
// Real-time spend alerts — seguimiento del consumo por mesa en tiempo real.
// Simula incrementos de ticket en mesas activas, calcula ticket promedio y
// ventas, y dispara alertas accionables para el personal.
// =============================================================================

type ActiveTable = {
  id: string
  name: string
  party: number
  spend: number
  target: number        // gasto esperado (objetivo) según comensales
  openedMinAgo: number  // minutos desde que abrió la cuenta
  lastOrderMinAgo: number
  billRequested: boolean
}

const S = {
  card: "var(--ad-card)", elevated: "var(--ad-elevated)", accent: "var(--ad-accent)",
  text: "var(--ad-text)", sub: "var(--ad-sub)", border: "var(--ad-border)",
}

const newId = () => "s" + Math.random().toString(36).slice(2, 7)

function seed(): ActiveTable[] {
  return [
    { id: newId(), name: "M1", party: 4, spend: 1180, target: 1600, openedMinAgo: 52, lastOrderMinAgo: 8,  billRequested: false },
    { id: newId(), name: "M2", party: 2, spend: 420,  target: 800,  openedMinAgo: 23, lastOrderMinAgo: 3,  billRequested: false },
    { id: newId(), name: "M3", party: 6, spend: 3240, target: 2400, openedMinAgo: 74, lastOrderMinAgo: 26, billRequested: true },
    { id: newId(), name: "Barra", party: 3, spend: 540, target: 900, openedMinAgo: 95, lastOrderMinAgo: 41, billRequested: false },
  ]
}

type Alert = { id: string; level: "high" | "warn" | "info"; icon: string; text: string }

function buildAlerts(tables: ActiveTable[]): Alert[] {
  const out: Alert[] = []
  for (const t of tables) {
    if (t.billRequested) out.push({ id: t.id + "-bill", level: "high", icon: "🧾", text: `${t.name} solicitó la cuenta · $${t.spend.toLocaleString()}` })
    if (t.spend >= t.target * 1.25) out.push({ id: t.id + "-high", level: "info", icon: "💎", text: `${t.name} supera el objetivo (+${Math.round((t.spend / t.target - 1) * 100)}%) · ticket alto` })
    if (t.lastOrderMinAgo >= 30 && !t.billRequested) out.push({ id: t.id + "-idle", level: "warn", icon: "⏳", text: `${t.name} sin pedir hace ${t.lastOrderMinAgo} min` })
    if (t.openedMinAgo >= 90 && !t.billRequested) out.push({ id: t.id + "-long", level: "warn", icon: "🕒", text: `${t.name} lleva ${Math.floor(t.openedMinAgo / 60)}h ${t.openedMinAgo % 60}m en mesa` })
  }
  const order = { high: 0, warn: 1, info: 2 }
  return out.sort((a, b) => order[a.level] - order[b.level])
}

const ALERT_COLOR = { high: "#ef4444", warn: "#f59e0b", info: "#3b82f6" }

export default function SpendAlerts() {
  const [tables, setTables] = useState<ActiveTable[]>([])
  const [live, setLive] = useState(true)

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setTables(seed())
  }, [])

  // Simulación "tiempo real": cada 4s avanza el tiempo y, a veces, suma consumo.
  useEffect(() => {
    if (!live) return
    const id = setInterval(() => {
      setTables(prev => prev.map(t => {
        if (t.billRequested) return { ...t, openedMinAgo: t.openedMinAgo + 1 }
        const ordered = Math.random() < 0.4
        return {
          ...t,
          openedMinAgo: t.openedMinAgo + 1,
          lastOrderMinAgo: ordered ? 0 : t.lastOrderMinAgo + 1,
          spend: ordered ? t.spend + Math.round((40 + Math.random() * 120)) : t.spend,
        }
      }))
    }, 4000)
    return () => clearInterval(id)
  }, [live])

  const alerts = useMemo(() => buildAlerts(tables), [tables])

  const totalSales = tables.reduce((s, t) => s + t.spend, 0)
  const diners = tables.reduce((s, t) => s + t.party, 0)
  const avgTicket = tables.length ? Math.round(totalSales / tables.length) : 0
  const perDiner = diners ? Math.round(totalSales / diners) : 0

  const requestBill = (id: string) => setTables(prev => prev.map(t => t.id === id ? { ...t, billRequested: true } : t))
  const closeTable = (id: string) => setTables(prev => prev.filter(t => t.id !== id))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          <KPI label="Ventas activas" value={`$${totalSales.toLocaleString()}`} color={S.accent} />
          <KPI label="Ticket prom./mesa" value={`$${avgTicket.toLocaleString()}`} />
          <KPI label="Gasto/comensal" value={`$${perDiner.toLocaleString()}`} />
          <KPI label="Mesas activas" value={String(tables.length)} />
        </div>
        <button onClick={() => setLive(v => !v)} className="text-xs px-3 py-2 rounded-full font-semibold shrink-0"
          style={{ backgroundColor: live ? "rgba(34,197,94,0.15)" : S.elevated, color: live ? "#22c55e" : S.sub, border: `1px solid ${live ? "rgba(34,197,94,0.4)" : S.border}` }}>
          {live ? "● En vivo" : "❚❚ Pausado"}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        {/* Alertas */}
        <div className="rounded-2xl p-3 w-full lg:w-[360px] shrink-0" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2 px-1" style={{ color: S.sub }}>
            Alertas <span style={{ color: alerts.length ? "#f59e0b" : S.accent }}>({alerts.length})</span>
          </p>
          <div className="space-y-2 max-h-[520px] overflow-y-auto custom-scrollbar">
            {alerts.length === 0 && <p className="text-xs text-center py-6 rounded-xl" style={{ color: S.sub, backgroundColor: S.elevated }}>Todo en orden ✓</p>}
            {alerts.map(a => (
              <div key={a.id} className="rounded-xl p-2.5 flex items-start gap-2" style={{ backgroundColor: S.elevated, borderLeft: `3px solid ${ALERT_COLOR[a.level]}` }}>
                <span className="text-base leading-none mt-0.5">{a.icon}</span>
                <p className="text-xs font-medium flex-1" style={{ color: S.text }}>{a.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mesas activas */}
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
          {tables.map(t => {
            const ratio = t.target ? t.spend / t.target : 0
            const barColor = ratio >= 1 ? "#22c55e" : ratio >= 0.6 ? "#f59e0b" : "#3b82f6"
            return (
              <div key={t.id} className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${t.billRequested ? "#ef4444" : S.border}` }}>
                <div className="flex items-center justify-between">
                  <p className="font-black" style={{ color: S.text }}>{t.name} <span className="text-xs font-normal" style={{ color: S.sub }}>· {t.party}p</span></p>
                  {t.billRequested
                    ? <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "#ef444422", color: "#f87171" }}>CUENTA</span>
                    : <span className="text-[10px]" style={{ color: S.sub }}>⏱ {Math.floor(t.openedMinAgo / 60)}h{String(t.openedMinAgo % 60).padStart(2, "0")}</span>}
                </div>
                <p className="text-2xl font-black mt-1" style={{ color: S.text }}>${t.spend.toLocaleString()}</p>
                <div className="flex items-center justify-between text-[11px] mt-0.5" style={{ color: S.sub }}>
                  <span>${Math.round(t.spend / t.party).toLocaleString()}/persona</span>
                  <span>meta ${t.target.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mt-1.5" style={{ backgroundColor: S.elevated }}>
                  <div className="h-full transition-all" style={{ width: `${Math.min(100, ratio * 100)}%`, backgroundColor: barColor }} />
                </div>
                <div className="flex gap-2 mt-3">
                  {!t.billRequested && (
                    <button onClick={() => requestBill(t.id)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: S.elevated, color: S.text, border: `1px solid ${S.border}` }}>🧾 Pedir cuenta</button>
                  )}
                  <button onClick={() => closeTable(t.id)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ color: "#22c55e", border: "1px solid rgba(34,197,94,0.35)" }}>✔ Cerrar mesa</button>
                </div>
              </div>
            )
          })}
          {tables.length === 0 && <p className="text-sm col-span-2 text-center py-10 rounded-2xl" style={{ color: S.sub, backgroundColor: S.card, border: `1px solid ${S.border}` }}>No hay mesas activas.</p>}
        </div>
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
