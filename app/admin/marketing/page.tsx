'use client'

// Resumen de campañas publicitarias con ROI por canal.
// Datos estáticos/demo; no conecta a Meta Ads, TikTok ni Google Ads.
import AdminNav from '@/app/components/AdminNav'

const S = {
  bg:     'var(--ad-bg)',
  card:   'var(--ad-card)',
  accent: 'var(--ad-accent)',
  text:   'var(--ad-text)',
  sub:    'var(--ad-sub)',
  border: 'var(--ad-border)',
}

const CAMPAIGNS = [
  { platform: 'Meta Ads',   budget: 12000, spent: 8400,  roi: 4.8, clicks: 24300, leads: 342, status: 'active'  },
  { platform: 'TikTok Ads', budget: 8000,  spent: 6200,  roi: 3.9, clicks: 51800, leads: 198, status: 'active'  },
  { platform: 'Google Ads', budget: 15000, spent: 11300, roi: 5.2, clicks: 18600, leads: 521, status: 'active'  },
  { platform: 'Email',      budget: 2000,  spent: 1800,  roi: 6.1, clicks: 4200,  leads: 186, status: 'paused'  },
  { platform: 'WhatsApp',   budget: 3000,  spent: 2100,  roi: 8.3, clicks: 0,     leads: 423, status: 'active'  },
]

const totalBudget = CAMPAIGNS.reduce((s, c) => s + c.budget, 0)
const totalSpent = CAMPAIGNS.reduce((s, c) => s + c.spent, 0)
const avgRoi = CAMPAIGNS.reduce((s, c) => s + c.roi, 0) / CAMPAIGNS.length
const totalLeads = CAMPAIGNS.reduce((s, c) => s + c.leads, 0)

function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
      <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: S.sub }}>{label}</p>
      <p className="text-2xl font-black" style={{ color: color ?? S.text }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: S.sub }}>{sub}</p>}
    </div>
  )
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', label: 'Activa' },
  paused: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Pausada' },
}

export default function AdminMarketingPage() {
  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />

      <div className="max-w-4xl mx-auto p-4 space-y-5">
        <div className="flex items-center justify-between pt-1">
          <h1 className="text-xl font-black" style={{ color: S.text }}>Marketing</h1>
          <button className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ backgroundColor: S.accent, color: '#000' }}>
            + Nueva campaña
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPI label="Presupuesto" value={`$${(totalBudget / 1000).toFixed(0)}k`} sub="total campañas" />
          <KPI label="ROI promedio" value={`${avgRoi.toFixed(1)}x`} sub="retorno de inversión" color={S.accent} />
          <KPI label="Leads" value={totalLeads.toLocaleString()} sub="este mes" />
          <KPI label="Gastado" value={`$${(totalSpent / 1000).toFixed(1)}k`} sub={`${Math.round(totalSpent / totalBudget * 100)}% del presupuesto`} />
        </div>

        {/* Budget progress */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: S.sub }}>Presupuesto total</p>
            <p className="text-xs font-bold" style={{ color: S.accent }}>${totalSpent.toLocaleString()} / ${totalBudget.toLocaleString()}</p>
          </div>
          <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--ad-border)' }}>
            <div className="h-2 rounded-full transition-all"
              style={{ width: `${(totalSpent / totalBudget) * 100}%`, backgroundColor: S.accent }} />
          </div>
        </div>

        {/* Campaigns table */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <div className="px-4 py-3 grid grid-cols-6 text-xs font-bold uppercase tracking-wide"
            style={{ borderBottom: `1px solid ${S.border}`, color: S.sub }}>
            <span className="col-span-2">Plataforma</span>
            <span className="text-right">Presupuesto</span>
            <span className="text-right">ROI</span>
            <span className="text-right">Leads</span>
            <span className="text-right">Estado</span>
          </div>
          {CAMPAIGNS.map((c, i) => {
            const st = STATUS_STYLE[c.status]
            return (
              <div key={c.platform} className="px-4 py-3 grid grid-cols-6 items-center"
                style={{ borderTop: i > 0 ? `1px solid ${S.border}` : 'none' }}>
                <span className="col-span-2 font-semibold text-sm" style={{ color: S.text }}>{c.platform}</span>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: S.text }}>${c.budget.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: S.sub }}>${c.spent.toLocaleString()} gastado</p>
                </div>
                <p className="text-right font-black text-sm" style={{ color: S.accent }}>{c.roi}x</p>
                <p className="text-right font-semibold text-sm" style={{ color: S.text }}>{c.leads}</p>
                <div className="flex justify-end">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Channel performance */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-4" style={{ color: S.sub }}>ROI por canal</p>
          <div className="space-y-3">
            {[...CAMPAIGNS].sort((a, b) => b.roi - a.roi).map(c => (
              <div key={c.platform} className="flex items-center gap-3">
                <span className="text-sm font-medium w-28 shrink-0" style={{ color: S.text }}>{c.platform}</span>
                <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'var(--ad-border)' }}>
                  <div className="h-2 rounded-full"
                    style={{ width: `${(c.roi / 10) * 100}%`, backgroundColor: S.accent, opacity: 0.85 }} />
                </div>
                <span className="text-sm font-black w-10 text-right" style={{ color: S.accent }}>{c.roi}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
