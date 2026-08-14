'use client'

// Sugerencias de automatización IA. Aplicar/Descartar solo mutan estado local;
// no hay integración real con ningún servicio externo.
import { useState } from 'react'
import AdminNav from '@/app/components/AdminNav'
import { Icon } from '@/app/components/Icon'

const S = {
  bg:     'var(--ad-bg)',
  card:   'var(--ad-card)',
  accent: 'var(--ad-accent)',
  text:   'var(--ad-text)',
  sub:    'var(--ad-sub)',
  border: 'var(--ad-border)',
}

interface Automation {
  id: number; title: string; description: string; impact: string
  type: string; status: 'active' | 'pending' | 'applied'
  metric: string; value: string
}

const AUTOMATIONS: Automation[] = [
  {
    id: 1, title: 'Recuperar clientes inactivos',
    description: 'Enviar mensaje de WhatsApp a 23 clientes sin visitar en +14 días con un cupón de 10% descuento.',
    impact: '+$3,200 ingresos estimados', type: 'CRM', status: 'pending',
    metric: 'Clientes inactivos', value: '23',
  },
  {
    id: 2, title: 'Publicar oferta de madrugada',
    description: 'Automatizar posts de Instagram a las 9:00 AM con el producto más vendido del día anterior.',
    impact: '+18% alcance orgánico', type: 'Marketing', status: 'active',
    metric: 'Posts automatizados', value: '12',
  },
  {
    id: 3, title: 'Reorden de café de especialidad',
    description: 'Stock de Café Etiopía bajo (3 kg). Enviar orden de compra al proveedor automáticamente.',
    impact: 'Evitar quiebre de stock', type: 'Producción', status: 'pending',
    metric: 'Stock actual', value: '3 kg',
  },
  {
    id: 4, title: 'Notificar premio de fidelidad',
    description: '8 clientes alcanzaron 5 sellos hoy. Enviar notificación de café gratis disponible.',
    impact: '+35% tasa de redención', type: 'Fidelización', status: 'applied',
    metric: 'Premios listos', value: '8',
  },
  {
    id: 5, title: 'Optimizar precios del menú',
    description: 'Café Latte tiene margen del 68%. Subir precio de $65 a $70 en horario de 14:00-17:00.',
    impact: '+$890/semana estimado', type: 'Menú', status: 'pending',
    metric: 'Margen actual', value: '68%',
  },
  {
    id: 6, title: 'Responder reseñas negativas',
    description: '2 reseñas con 1-2 estrellas sin responder en Google. Sugerir respuesta personalizada.',
    impact: 'Mejorar reputación online', type: 'Reseñas', status: 'pending',
    metric: 'Reseñas pendientes', value: '2',
  },
]

const TYPE_COLORS: Record<string, string> = {
  CRM: '#4f6ef7', Marketing: '#c084fc', Producción: '#fb923c',
  Fidelización: S.accent, Menú: '#06b6d4', Reseñas: '#f59e0b',
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:  { bg: 'rgba(0,230,118,0.15)',  color: S.accent,  label: 'Activa'   },
  pending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Pendiente'},
  applied: { bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc', label: 'Aplicada' },
}

export default function AdminAutomatizacionesPage() {
  const [autos, setAutos] = useState(AUTOMATIONS)

  function applyAuto(id: number) {
    setAutos(prev => prev.map(a => a.id === id ? { ...a, status: 'applied' as const } : a))
  }
  function dismissAuto(id: number) {
    setAutos(prev => prev.filter(a => a.id !== id))
  }

  const active = autos.filter(a => a.status === 'active').length
  const pending = autos.filter(a => a.status === 'pending').length
  const applied = autos.filter(a => a.status === 'applied').length

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />

      <div className="max-w-3xl mx-auto p-4 space-y-5">
        <h1 className="text-xl font-black pt-1" style={{ color: S.text }}>Automatizaciones IA</h1>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Activas', value: active, color: S.accent },
            { label: 'Pendientes', value: pending, color: '#fbbf24' },
            { label: 'Aplicadas', value: applied, color: '#a5b4fc' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: S.sub }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {autos.map(a => {
            const typeColor = TYPE_COLORS[a.type] ?? S.accent
            const st = STATUS_STYLE[a.status]
            return (
              <div key={a.id} className="rounded-2xl p-4"
                style={{
                  backgroundColor: S.card,
                  border: `1px solid ${a.status === 'pending' ? 'rgba(251,191,36,0.3)' : S.border}`,
                }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${typeColor}20`, color: typeColor }}>{a.type}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium" style={{ color: S.sub }}>{a.metric}</p>
                    <p className="font-black text-sm" style={{ color: typeColor }}>{a.value}</p>
                  </div>
                </div>

                <p className="font-bold text-sm mb-1" style={{ color: S.text }}>{a.title}</p>
                <p className="text-xs mb-2" style={{ color: S.sub }}>{a.description}</p>
                <p className="text-xs font-semibold mb-3 flex items-center gap-1" style={{ color: S.accent }}><Icon name="zap" size={12} /> {a.impact}</p>

                {a.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => applyAuto(a.id)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold"
                      style={{ backgroundColor: S.accent, color: '#000' }}>
                      <span className="inline-flex items-center justify-center gap-1.5"><Icon name="check" size={13} /> Aplicar</span>
                    </button>
                    <button
                      className="flex-1 py-2 rounded-xl text-xs font-medium"
                      style={{ border: `1px solid rgba(99,102,241,0.4)`, color: '#a5b4fc', backgroundColor: 'transparent' }}>
                      Simular
                    </button>
                    <button onClick={() => dismissAuto(a.id)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium"
                      style={{ border: `1px solid ${S.border}`, color: S.sub, backgroundColor: 'transparent' }}>
                      Descartar
                    </button>
                  </div>
                )}
                {a.status === 'applied' && (
                  <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#a5b4fc' }}><Icon name="check" size={13} /> Automatización aplicada</p>
                )}
              </div>
            )
          })}

          {autos.length === 0 && (
            <div className="flex flex-col items-center py-16 rounded-2xl" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
              <span className="mb-3" style={{ color: S.sub }}><Icon name="bot" size={44} /></span>
              <p className="font-semibold" style={{ color: S.text }}>Todas las automatizaciones atendidas</p>
              <p className="text-sm mt-1" style={{ color: S.sub }}>La IA generará nuevas sugerencias pronto</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
