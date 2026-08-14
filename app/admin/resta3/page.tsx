'use client'

import { useState, useEffect } from 'react'
import AdminNav from '@/app/components/AdminNav'

const S = {
  bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)',
  text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)',
  elevated: 'var(--ad-elevated)',
}

interface Resta3User {
  id: string
  name: string
  role: string
  createdAt: string
}

export default function AdminResta3UsersPage() {
  const [users, setUsers]       = useState<Resta3User[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [showPw, setShowPw]     = useState(false)

  const [form, setForm] = useState({ name: '', password: '' })

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/resta3/users')
      if (res.ok) setUsers(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { queueMicrotask(load) }, [])

  function resetForm() {
    setForm({ name: '', password: '' })
    setShowPw(false)
    setError('')
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.password) { setError('Nombre y contraseña requeridos'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/resta3/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), password: form.password }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`Usuario "${form.name.trim()}" creado`)
        resetForm()
        setShowForm(false)
        load()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error ?? 'Error al crear usuario')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(user: Resta3User) {
    if (!confirm(`¿Eliminar al usuario "${user.name}"? Esta acción no se puede deshacer.`)) return
    setDeleting(user.id)
    try {
      await fetch(`/api/resta3/users?id=${user.id}`, { method: 'DELETE' })
      setUsers(prev => prev.filter(u => u.id !== user.id))
      setSuccess(`Usuario "${user.name}" eliminado`)
      setTimeout(() => setSuccess(''), 3000)
    } finally {
      setDeleting(null)
    }
  }

  const INPUT = 'w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors'

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: S.bg }}>
      <AdminNav />
      <main className="flex-1 p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black" style={{ color: S.text }}>Usuarios Resta3</h1>
              <p className="text-sm mt-0.5" style={{ color: S.sub }}>Gestiona las cuentas de acceso al panel Resta3</p>
            </div>
            <button onClick={() => { setShowForm(v => !v); resetForm() }}
              className="px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
              style={{ backgroundColor: S.accent, color: '#000' }}>
              {showForm ? 'Cancelar' : '+ Nuevo usuario'}
            </button>
          </div>

          {/* Toast */}
          {success && (
            <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium"
              style={{ backgroundColor: '#052e16', color: '#86efac', border: '1px solid #166534' }}>
              {success}
            </div>
          )}

          {/* Formulario */}
          {showForm && (
            <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
              <h2 className="font-bold mb-4" style={{ color: S.text }}>Nuevo usuario Resta3</h2>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: S.sub }}>Nombre / usuario</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ej. Carlos López" autoComplete="off"
                    className={INPUT} style={{ backgroundColor: S.elevated, color: S.text, border: `1px solid ${S.border}` }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: S.sub }}>Contraseña</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Contraseña para el usuario" autoComplete="new-password"
                      className={INPUT + ' pr-12'} style={{ backgroundColor: S.elevated, color: S.text, border: `1px solid ${S.border}` }} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-opacity hover:opacity-80"
                      style={{ color: S.sub }} aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                      {showPw
                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="border rounded-xl px-4 py-3 text-sm font-medium text-red-300"
                    style={{ backgroundColor: '#2d0a0a', borderColor: '#7f1d1d' }}>
                    {error}
                  </div>
                )}
                <button type="submit" disabled={saving}
                  className="w-full font-black py-3 rounded-xl text-sm disabled:opacity-60 transition-colors"
                  style={{ backgroundColor: S.accent, color: '#000' }}>
                  {saving ? 'Guardando...' : 'Crear usuario'}
                </button>
              </form>
            </div>
          )}

          {/* Lista de usuarios */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            {loading ? (
              <div className="p-8 text-center text-sm" style={{ color: S.sub }}>Cargando...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium" style={{ color: S.sub }}>Sin usuarios Resta3 registrados</p>
                <p className="text-xs mt-1" style={{ color: S.sub }}>Agrega el primero con el botón de arriba</p>
              </div>
            ) : (
              <ul>
                {users.map((user, i) => (
                  <li key={user.id} className="flex items-center gap-4 px-5 py-4"
                    style={{ borderTop: i === 0 ? 'none' : `1px solid ${S.border}` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                      style={{ backgroundColor: S.elevated, color: S.accent }}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: S.text }}>{user.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: S.sub }}>Resta3</p>
                    </div>
                    <button onClick={() => handleDelete(user)} disabled={deleting === user.id}
                      className="p-2 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40 flex-shrink-0"
                      style={{ color: '#f87171' }} aria-label="Eliminar usuario">
                      {deleting === user.id
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      }
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
