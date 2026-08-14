'use client'

import { useState, useEffect, useCallback } from 'react'
import Resta3Nav from '@/app/components/Resta3Nav'
import { Icon } from '@/app/components/Icon'

const S = { bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)', text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)', elevated: 'var(--ad-elevated)' }

interface Totals { efectivo: number; tarjeta: number; transferencia: number; domicilio: number; total: number }
interface Corte { id: string; inicio: string; fin: string; by: string; receives: string | null; orders: number; efectivo: number; tarjeta: number; transferencia: number; domicilio: number; total: number }
interface ShiftData { turno: { at: string; by?: string } | null; orders: number; totals: Totals; historial: Corte[] }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}
function fmtDuration(inicio: string, fin: string) {
  const ms = new Date(fin).getTime() - new Date(inicio).getTime()
  const h  = Math.floor(ms / 3600000)
  const m  = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function CorteCajaPage() {
  const [data, setData]     = useState<ShiftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [by, setBy]         = useState('')
  const [receives, setReceives] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState<Corte | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/resta3/corte')
      if (r.ok) setData(await r.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { queueMicrotask(load) }, [load])

  async function ejecutarCorte() {
    if (!by.trim()) { setError('Ingresa el nombre de quien entrega el turno'); return }
    setError(''); setSaving(true)
    try {
      const r = await fetch('/api/resta3/corte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ by: by.trim(), receives: receives.trim() || undefined }),
      })
      const d = await r.json()
      if (r.ok) {
        setSuccess(d)
        setBy(''); setReceives('')
        load()
      } else { setError(d.error ?? 'Error al ejecutar el corte') }
    } finally { setSaving(false) }
  }

  const totals = data?.totals

  return (
    <div className="min-h-screen md:ml-[240px]" style={{ backgroundColor: S.bg }}>
      <Resta3Nav />
      <div className="max-w-2xl mx-auto p-4 space-y-5">

        <div className="flex items-center justify-between pt-1">
          <h1 className="text-xl font-black" style={{ color: S.text }}>Corte de Caja</h1>
          <button onClick={load} className="text-xs px-3 py-1.5 rounded-xl font-bold"
            style={{ backgroundColor: S.card, color: S.sub, border: `1px solid ${S.border}` }}>
            <span className="inline-flex items-center gap-1"><Icon name="refresh" size={13} /> Actualizar</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12" style={{ color: S.sub }}>Cargando turno...</div>
        ) : (
          <>
            {/* Turno actual */}
            <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: S.sub }}>Turno actual</p>
                  <p className="font-bold" style={{ color: S.text }}>
                    {data?.turno ? `Desde ${fmtDate(data.turno.at)}` : 'Sin turno registrado'}
                    {data?.turno?.by && <span className="ml-2 text-xs font-normal" style={{ color: S.sub }}>· {data.turno.by}</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black" style={{ color: S.accent }}>{data?.orders ?? 0}</p>
                  <p className="text-xs" style={{ color: S.sub }}>pedidos</p>
                </div>
              </div>

              {/* Desglose de ingresos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { label: 'Efectivo',      key: 'efectivo',      color: '#22c55e' },
                  { label: 'Tarjeta',       key: 'tarjeta',       color: '#3b82f6' },
                  { label: 'Transferencia', key: 'transferencia', color: '#a855f7' },
                  { label: 'Domicilio',     key: 'domicilio',     color: '#f97316' },
                ] as const).map(({ label, key, color }) => (
                  <div key={key} className="rounded-xl p-3 text-center" style={{ backgroundColor: S.elevated }}>
                    <p className="text-xs font-bold" style={{ color: S.sub }}>{label}</p>
                    <p className="text-base font-black mt-0.5" style={{ color }}>${(totals?.[key] ?? 0).toFixed(0)}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: `color-mix(in srgb, var(--ad-accent) 10%, transparent)`, border: `1px solid color-mix(in srgb, var(--ad-accent) 30%, transparent)` }}>
                <span className="font-bold text-sm" style={{ color: S.text }}>Total del turno</span>
                <span className="text-2xl font-black" style={{ color: S.accent }}>${(totals?.total ?? 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Formulario del corte */}
            <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
              <h2 className="font-bold text-base" style={{ color: S.text }}>Ejecutar corte y cambio de turno</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: S.sub }}>Quien entrega *</label>
                  <input value={by} onChange={e => { setBy(e.target.value); setError('') }}
                    placeholder="Nombre del admin saliente"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: S.elevated, color: S.text, border: `1px solid ${S.border}` }} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: S.sub }}>Quien recibe</label>
                  <input value={receives} onChange={e => setReceives(e.target.value)}
                    placeholder="Nombre del admin entrante"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: S.elevated, color: S.text, border: `1px solid ${S.border}` }} />
                </div>
              </div>

              {error && (
                <div className="rounded-xl px-4 py-2.5 text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                  {error}
                </div>
              )}

              <button onClick={ejecutarCorte} disabled={saving}
                className="w-full py-3.5 rounded-xl font-black text-sm disabled:opacity-50 transition-all"
                style={{ backgroundColor: S.accent, color: '#fff' }}>
                {saving ? 'Ejecutando corte...' : <span className="inline-flex items-center justify-center gap-2"><Icon name="receipt" size={16} /> Cerrar turno y hacer corte</span>}
              </button>
            </div>

            {/* Corte exitoso */}
            {success && (
              <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: S.card, border: '1px solid rgba(34,197,94,0.3)' }}>
                <div className="flex items-center gap-2" style={{ color: '#22c55e' }}>
                  <Icon name="checkCircle" size={18} />
                  <span className="font-bold">Corte ejecutado correctamente</span>
                </div>
                <div className="text-sm space-y-1" style={{ color: S.sub }}>
                  <p>Entregó: <span className="font-bold" style={{ color: S.text }}>{success.by}</span></p>
                  {success.receives && <p>Recibió: <span className="font-bold" style={{ color: S.text }}>{success.receives}</span></p>}
                  <p>Pedidos: <span className="font-bold" style={{ color: S.text }}>{success.orders}</span></p>
                  <p>Total: <span className="font-black text-base" style={{ color: S.accent }}>${success.total.toFixed(2)}</span></p>
                </div>
                <button onClick={() => setSuccess(null)} className="text-xs underline" style={{ color: S.sub }}>Cerrar</button>
              </div>
            )}

            {/* Historial de cortes */}
            {data && data.historial.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
                  <span className="font-bold text-sm" style={{ color: S.text }}>Historial de cortes</span>
                </div>
                <div className="divide-y" style={{ borderColor: S.border }}>
                  {data.historial.map(c => (
                    <div key={c.id} className="px-5 py-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold" style={{ color: S.text }}>
                            {c.by}
                            {c.receives && <span style={{ color: S.sub }}> → {c.receives}</span>}
                          </p>
                          <p className="text-xs" style={{ color: S.sub }}>
                            {fmtDate(c.inicio)} → {fmtDate(c.fin)}
                            <span className="ml-2 opacity-70">({fmtDuration(c.inicio, c.fin)})</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black" style={{ color: S.accent }}>${c.total.toFixed(2)}</p>
                          <p className="text-xs" style={{ color: S.sub }}>{c.orders} pedidos</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center">
                        {([
                          { label: 'Efectivo',  value: c.efectivo,      color: '#22c55e' },
                          { label: 'Tarjeta',   value: c.tarjeta,       color: '#3b82f6' },
                          { label: 'Transfer.', value: c.transferencia, color: '#a855f7' },
                          { label: 'Domicilio', value: c.domicilio,     color: '#f97316' },
                        ]).map(({ label, value, color }) => (
                          <div key={label} className="rounded-lg py-1.5 px-1" style={{ backgroundColor: S.elevated }}>
                            <p className="text-[10px]" style={{ color: S.sub }}>{label}</p>
                            <p className="text-xs font-black" style={{ color }}>${value.toFixed(0)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
