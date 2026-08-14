'use client'

// Gráfica SVG de predicción de ventas (banda de confianza + forecast). Datos demo; no conecta a fuente real.
import AdminNav from '@/app/components/AdminNav'
import { Icon } from '@/app/components/Icon'

const S = {
  bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)',
  text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)',
}

const PRED_REAL = [24580, 21800, null, null, null, null, null]
const PRED_FCST = [24580, 21800, 26000, 24500, 32000, 35000, 28000]
const PRED_HI   = [24580, 21800, 29000, 28000, 36000, 39000, 32000]
const PRED_LO   = [24580, 21800, 23000, 21000, 28000, 31000, 24000]
const DAYS_LBL  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const PRED_MAX  = 39000

export default function AdminEstadisticasPage() {
  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />
      <div className="max-w-[1200px] mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="pt-1">
          <h1 className="text-xl font-black flex items-center gap-2" style={{ color: S.text }}><Icon name="chart" size={20} /> Analytics</h1>
          <p className="text-xs mt-0.5" style={{ color: S.sub }}>Métricas, tendencias y predicciones</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Ventas (mes)',  value: '$2.84M', delta: '↑ 15%' },
            { label: 'Pedidos (mes)', value: '1,847',  delta: null     },
            { label: 'Margen bruto', value: '64.2%',  delta: null     },
            { label: 'Precisión IA', value: '87%',    delta: null     },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
              <p className="text-xs font-medium mb-2" style={{ color: S.sub }}>{k.label}</p>
              <p className="text-2xl font-black" style={{ color: S.text }}>{k.value}</p>
              {k.delta && <p className="text-xs font-medium mt-1" style={{ color: '#4ade80' }}>{k.delta}</p>}
            </div>
          ))}
        </div>

        {/* Prediction chart */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
            <span className="font-bold text-sm" style={{ color: S.text }}>Predicción de ventas — próximos 7 días</span>
          </div>
          <div className="px-5 py-5">
            {/* Legend */}
            <div className="flex gap-5 mb-4">
              {[['#6366f1','Real'],['#a78bfa','Predicción']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5 text-xs" style={{ color: S.sub }}>
                  <div className="w-6 h-0.5" style={{ backgroundColor: c }} />{l}
                </div>
              ))}
            </div>
            {/* Chart area */}
            <div className="relative" style={{ height: 280 }}>
              {/* Confidence band */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 700 280">
                <defs>
                  <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                {/* Confidence band polygon */}
                <polygon
                  fill="url(#bandFill)"
                  points={[
                    ...PRED_HI.map((v, i) => `${i * (700/6)},${280 - (v / PRED_MAX) * 260}`),
                    ...[...PRED_LO].reverse().map((v, i) => `${(6 - i) * (700/6)},${280 - (v / PRED_MAX) * 260}`)
                  ].join(' ')}
                />
                {/* Forecast line */}
                <polyline
                  fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="6 3"
                  points={PRED_FCST.map((v, i) => `${i * (700/6)},${280 - (v / PRED_MAX) * 260}`).join(' ')}
                />
                {/* Real line */}
                <polyline
                  fill="none" stroke="#6366f1" strokeWidth="3"
                  points={PRED_REAL.filter(v => v !== null).map((v, i) => `${i * (700/6)},${280 - ((v as number) / PRED_MAX) * 260}`).join(' ')}
                />
                {/* Real dots */}
                {PRED_REAL.map((v, i) => v !== null && (
                  <circle key={i} cx={i * (700/6)} cy={280 - (v / PRED_MAX) * 260} r="5" fill="#6366f1" />
                ))}
                {/* Forecast dots */}
                {PRED_FCST.map((v, i) => (
                  <circle key={i} cx={i * (700/6)} cy={280 - (v / PRED_MAX) * 260} r="4" fill="#a78bfa" />
                ))}
              </svg>
            </div>
            {/* X labels */}
            <div className="flex justify-between mt-1">
              {DAYS_LBL.map(d => <span key={d} className="text-xs" style={{ color: S.sub }}>{d}</span>)}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
