'use client'

// Vista pública de disponibilidad de mesas (datos de /api/resta3/tables), sin autenticación.
// Pensada para una pantalla en el salón; se auto-refresca cada 15 s sin acción del usuario.
import { useState, useEffect } from 'react'

type TableStatus = 'libre' | 'ocupada' | 'reservada' | 'limpieza'

interface Table {
  id: string; label: string; seats: number
  status: TableStatus; customer?: string; since?: string; zone: string
}

const STATUS: Record<TableStatus, { label: string; color: string; bg: string; border: string; icon: string }> = {
  libre:     { label: 'Disponible', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.4)',  icon: '✓' },
  ocupada:   { label: 'Ocupada',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)',  icon: '●' },
  reservada: { label: 'Reservada',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)', icon: '◆' },
  limpieza:  { label: 'Limpieza',   color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.4)', icon: '↻' },
}

export default function SalonPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [time, setTime] = useState(new Date())

  async function load() {
    const r = await fetch('/api/resta3/tables')
    if (r.ok) setTables(await r.json())
  }

  useEffect(() => {
    queueMicrotask(load)
    const dataTimer = setInterval(load, 15000)
    const clockTimer = setInterval(() => setTime(new Date()), 1000)
    return () => { clearInterval(dataTimer); clearInterval(clockTimer) }
  }, [])

  const zones = Array.from(new Set(tables.map(t => t.zone)))
  const libre = tables.filter(t => t.status === 'libre').length
  const ocupada = tables.filter(t => t.status === 'ocupada').length
  const reservada = tables.filter(t => t.status === 'reservada').length

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#000', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5"
        style={{ background: 'linear-gradient(135deg, #B90F45 0%, #7a0a2e 100%)' }}>
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">Disponibilidad de Mesas</h1>
            <p className="text-sm text-white/70">Se actualiza automáticamente cada 15 segundos</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-white">
            {time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-sm text-white/70 capitalize">
            {time.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Stats resumen */}
      <div className="grid grid-cols-3 gap-4 px-8 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {[
          { label: 'Disponibles', count: libre, color: '#22c55e' },
          { label: 'Ocupadas', count: ocupada, color: '#ef4444' },
          { label: 'Reservadas', count: reservada, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="text-center py-3 rounded-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-5xl font-black" style={{ color: s.color }}>{s.count}</p>
            <p className="text-base font-semibold mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Mesas por zona */}
      <div className="flex-1 overflow-auto px-8 py-6 space-y-8">
        {zones.map(zone => {
          const zoneTables = tables.filter(t => t.zone === zone)
          return (
            <div key={zone}>
              <h2 className="text-lg font-black mb-4 uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                — {zone} —
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {zoneTables.map(table => {
                  const cfg = STATUS[table.status]
                  return (
                    <div key={table.id} className="rounded-2xl p-5 text-center transition-all"
                      style={{ backgroundColor: cfg.bg, border: `2px solid ${cfg.border}` }}>

                      {/* Icono estado */}
                      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-black"
                        style={{ backgroundColor: `${cfg.color}25`, color: cfg.color }}>
                        {cfg.icon}
                      </div>

                      {/* Nombre mesa */}
                      <p className="font-black text-base" style={{ color: '#fff' }}>{table.label}</p>

                      {/* Asientos */}
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{table.seats} personas</p>

                      {/* Estado */}
                      <div className="mt-3 py-1.5 rounded-xl font-bold text-sm"
                        style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>
                        {cfg.label}
                      </div>

                      {/* Cliente / reserva */}
                      {table.customer && (
                        <p className="text-xs mt-2 font-semibold truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {table.status === 'reservada' ? `📋 ${table.customer}` : table.customer}
                        </p>
                      )}
                      {table.since && (
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          desde {table.since}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-8 py-3 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-4">
          {(Object.entries(STATUS) as [TableStatus, typeof STATUS[TableStatus]][]).map(([, cfg]) => (
            <div key={cfg.label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{cfg.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Pide al mesero si tienes dudas sobre disponibilidad
        </p>
      </div>
    </div>
  )
}
