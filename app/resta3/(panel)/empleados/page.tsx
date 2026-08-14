'use client'

// Gestión de turnos de empleados. Estado en localStorage (no persiste en Supabase aún).
import { useEffect, useState } from 'react'
import Resta3Nav from '@/app/components/Resta3Nav'
import { Icon } from '@/app/components/Icon'

const S = { bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)', text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)' }

interface Employee { id: string; name: string; createdAt: string }
interface ShiftEntry { employeeId: string; role: string; shift: string; active: boolean }

const ROLES = ['Mesero', 'Cocinero', 'Cajero', 'Gerente', 'Hostess', 'Bartender']
const SHIFTS = ['Matutino 7-15h', 'Vespertino 15-23h', 'Nocturno 23-7h']
const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#f97316']

export default function EmpleadosPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Record<string, ShiftEntry>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPass, setNewPass] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    try {
      const r = await fetch('/api/employee/auth', { method: 'GET' })
      if (r.ok) {
        const data = await r.json()
        if (Array.isArray(data)) setEmployees(data)
      }
    } catch {}
    const saved = localStorage.getItem('resta3_shifts')
    if (saved) setShifts(JSON.parse(saved))
    setLoading(false)
  }

  useEffect(() => { queueMicrotask(load) }, [])

  function getShift(empId: string): ShiftEntry {
    return shifts[empId] ?? { employeeId: empId, role: ROLES[0], shift: SHIFTS[0], active: true }
  }

  function updateShift(empId: string, patch: Partial<ShiftEntry>) {
    const updated = { ...shifts, [empId]: { ...getShift(empId), ...patch } }
    setShifts(updated)
    localStorage.setItem('resta3_shifts', JSON.stringify(updated))
  }

  async function addEmployee() {
    if (!newName.trim() || !newPass) { setError('Completa los campos'); return }
    if (newPass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/employee/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', name: newName.trim(), password: newPass }),
      })
      const d = await r.json()
      if (r.ok) { setNewName(''); setNewPass(''); setShowForm(false); load() }
      else setError(d.error ?? 'Error al crear')
    } catch { setError('Error de conexión') }
    setSaving(false)
  }

  const activeCount = employees.filter(e => getShift(e.id).active).length

  return (
    <div className="min-h-screen md:ml-[240px]" style={{ backgroundColor: S.bg }}>
      <Resta3Nav />
      <div className="max-w-[900px] mx-auto p-4 space-y-4">

        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-black" style={{ color: S.text }}>Empleados</h1>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>{employees.length} registrados · {activeCount} activos hoy</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: S.accent, color: '#fff' }}>
            + Agregar empleado
          </button>
        </div>

        {/* Stats turnos */}
        <div className="grid grid-cols-3 gap-3">
          {SHIFTS.map((shift, i) => {
            const count = employees.filter(e => getShift(e.id).shift === shift && getShift(e.id).active).length
            return (
              <div key={shift} className="rounded-2xl p-3 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                <p className="text-lg font-black" style={{ color: COLORS[i] }}>{count}</p>
                <p className="text-[10px] font-bold mt-0.5" style={{ color: S.sub }}>{shift}</p>
              </div>
            )
          })}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: S.sub }}>Cargando...</div>
        ) : employees.length === 0 ? (
          <div className="text-center py-12 rounded-2xl text-sm" style={{ color: S.sub, backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            Sin empleados registrados
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <div className="divide-y" style={{ borderColor: S.border }}>
              {employees.map((emp, i) => {
                const entry = getShift(emp.id)
                const color = COLORS[i % COLORS.length]
                return (
                  <div key={emp.id} className="px-4 py-4 flex items-center gap-4 flex-wrap">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shrink-0"
                      style={{ backgroundColor: `${color}18`, color }}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-[120px]">
                      <p className="font-bold" style={{ color: S.text }}>{emp.name}</p>
                      <p className="text-xs" style={{ color: S.sub }}>
                        Desde {new Date(emp.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Rol */}
                    <select value={entry.role} onChange={e => updateShift(emp.id, { role: e.target.value })}
                      className="text-xs font-bold px-2 py-1.5 rounded-xl outline-none cursor-pointer"
                      style={{ backgroundColor: 'var(--ad-elevated)', color: S.text, border: `1px solid ${S.border}` }}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>

                    {/* Turno */}
                    <select value={entry.shift} onChange={e => updateShift(emp.id, { shift: e.target.value })}
                      className="text-xs font-bold px-2 py-1.5 rounded-xl outline-none cursor-pointer"
                      style={{ backgroundColor: 'var(--ad-elevated)', color: S.text, border: `1px solid ${S.border}` }}>
                      {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {/* Activo toggle */}
                    <button onClick={() => updateShift(emp.id, { active: !entry.active })}
                      className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all"
                      style={entry.active
                        ? { backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }
                        : { backgroundColor: 'rgba(100,116,139,0.12)', color: S.sub }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.active ? '#22c55e' : S.sub }} />
                      {entry.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal agregar empleado */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
            style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <div className="flex items-center justify-between">
              <h2 className="font-black" style={{ color: S.text }}>Nuevo empleado</h2>
              <button onClick={() => { setShowForm(false); setError('') }} aria-label="Cerrar" style={{ color: S.sub }}><Icon name="x" size={18} /></button>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Nombre</label>
              <input value={newName} onChange={e => { setNewName(e.target.value); setError('') }}
                placeholder="Nombre del empleado"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Contraseña (mín. 6 caracteres)</label>
              <input type="password" value={newPass} onChange={e => { setNewPass(e.target.value); setError('') }}
                placeholder="••••••"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }} />
            </div>
            {error && <p className="text-xs font-bold" style={{ color: '#f87171' }}>{error}</p>}
            <button onClick={addEmployee} disabled={saving}
              className="w-full py-3 rounded-xl font-black text-sm disabled:opacity-50"
              style={{ backgroundColor: S.accent, color: '#fff' }}>
              {saving ? 'Creando...' : 'Crear empleado'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
