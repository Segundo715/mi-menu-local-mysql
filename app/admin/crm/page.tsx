'use client'

// Vista CRM con búsqueda local. Datos demo; el CRM real de clientes de lealtad está en /admin/customers.
import { useState } from 'react'
import AdminNav from '@/app/components/AdminNav'
import { Icon } from '@/app/components/Icon'

const S = {
  bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)',
  text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)',
}

const CLIENTS = [
  { name: 'Roberto García', phone: '+52 55 1234-5678', visits: 45, spend: '$89,200', tier: 'Platinum', tierBg: 'rgba(168,85,247,.12)', tierColor: '#c084fc', pts: '15,200' },
  { name: 'Ana Martínez',   phone: '+52 55 9876-5432', visits: 23, spend: '$47,500', tier: 'Gold',     tierBg: 'rgba(251,191,36,.12)', tierColor: '#fbbf24', pts: '8,450'  },
  { name: 'María López',    phone: '+52 55 5555-1234', visits: 8,  spend: '$12,400', tier: 'Silver',   tierBg: 'rgba(59,130,246,.12)', tierColor: '#60a5fa', pts: '2,100'  },
  { name: 'Pedro Sánchez',  phone: '+52 55 4321-8765', visits: 3,  spend: '$4,200',  tier: 'Bronze',   tierBg: 'rgba(100,116,139,.12)',tierColor: '#94a3b8', pts: '420'    },
]

export default function AdminCRMPage() {
  const [search, setSearch] = useState('')
  const filtered = search ? CLIENTS.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : CLIENTS

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />
      <div className="max-w-[1200px] mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2" style={{ color: S.text }}><Icon name="users" size={20} /> CRM</h1>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>Clientes, segmentos y lealtad</p>
          </div>
          <button className="text-sm px-4 py-2 rounded-xl font-bold" style={{ backgroundColor: S.accent, color: '#000' }}>+ Nuevo cliente</button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total clientes',  value: '1,247',   delta: '↑ +23 este mes' },
            { label: 'Activos (30d)',   value: '342',     delta: null              },
            { label: 'LTV promedio',    value: '$18,500', delta: null              },
            { label: 'Retorno',         value: '68%',     delta: '↑ +3pp'         },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
              <p className="text-xs font-medium mb-2" style={{ color: S.sub }}>{k.label}</p>
              <p className="text-2xl font-black" style={{ color: S.text }}>{k.value}</p>
              {k.delta && <p className="text-xs font-medium mt-1" style={{ color: '#4ade80' }}>{k.delta}</p>}
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
            <span className="font-bold text-sm" style={{ color: S.text }}>Clientes recientes</span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ backgroundColor: 'var(--ad-overlay)', border: `1px solid ${S.border}` }}>
              <span style={{ color: S.sub }}><Icon name="search" size={15} /></span>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="bg-transparent text-sm focus:outline-none w-32"
                style={{ color: S.text }}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                  {['Cliente','Teléfono','Visitas','Gasto total','Tier','Puntos'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: S.sub }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.name} style={{ borderBottom: `1px solid ${S.border}` }}
                    className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-bold" style={{ color: S.text }}>{c.name}</td>
                    <td className="px-5 py-3" style={{ color: S.sub }}>{c.phone}</td>
                    <td className="px-5 py-3" style={{ color: S.text }}>{c.visits}</td>
                    <td className="px-5 py-3 font-bold" style={{ color: S.text }}>{c.spend}</td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: c.tierBg, color: c.tierColor }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.tierColor }} />
                        {c.tier}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium" style={{ color: S.text }}>{c.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
