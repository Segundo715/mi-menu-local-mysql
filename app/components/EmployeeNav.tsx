'use client'

// Sidebar del empleado. /employee/menu es pública (sin login) — no hay sesión que
// cerrar ni módulos por habilitar; el nav es un único link fijo a "Menú".
import { useEffect, useState } from 'react'
import AdminThemeToggle from '@/app/components/AdminThemeToggle'
import { useBrand } from '@/app/components/BrandProvider'
import { BrandLogo } from '@/app/components/BrandLogo'

const ICONS: Record<string, string> = {
  menu: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
  flag: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
}

function NavIcon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[name] ?? '' }} />
  )
}

function contrastText(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#000'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#000' : '#fff'
}

export default function EmployeeNav() {
  const [open, setOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportMsg, setReportMsg] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [subtitle, setSubtitle] = useState('Dirección General')
  const brand = useBrand()

  useEffect(() => {
    fetch('/api/settings?key=admin_subtitle')
      .then(r => r.json())
      .then(d => { if (d?.value) setSubtitle(d.value) })
      .catch(() => {})
  }, [])

  async function sendReport() {
    if (!reportMsg.trim()) return
    setReportSending(true)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_name: 'Empleado', from_role: 'Empleado', message: reportMsg.trim() }),
      })
      if (res.ok) {
        setReportSent(true)
        setTimeout(() => { setReportOpen(false); setReportSent(false); setReportMsg('') }, 2000)
      }
    } finally {
      setReportSending(false)
    }
  }

  const brandName = brand.name || 'NICHO'
  const brandLogo = brand.logo || '/logo.png'
  const logoBgStyle = brand.logoBg ? { backgroundColor: brand.logoBg } : undefined
  const accentColor = brand.accent || 'var(--ad-accent)'
  const accentText = contrastText(brand.accent)
  const navActive = { backgroundColor: accentColor, color: accentText }

  const S = {
    sidebar: { backgroundColor: 'var(--ad-sidebar)', borderRight: '1px solid var(--ad-border)' },
    text:    { color: 'var(--ad-text)' },
    sub:     { color: 'var(--ad-sub)' },
  }

  return (
    <>
      <div className="hidden md:flex fixed top-5 right-[250px] z-[100] items-center gap-3">
        <img src="/L_agencia/logo_singular.svg" alt="Singular" className="ad-logo h-6 w-auto pointer-events-none" />
        <AdminThemeToggle />
      </div>

      {/* ===== TOPBAR mobile ===== */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: 'var(--ad-sidebar)', borderBottom: '1px solid var(--ad-border)' }}>
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2.5">
          <div className="flex flex-col gap-1">
            {[0, 1, 2].map(i => (
              <span key={i} className="block h-0.5 rounded-full w-5" style={{ backgroundColor: 'var(--ad-text)' }} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center" style={logoBgStyle}>
              <BrandLogo src={brandLogo} color={brand.logoColor} className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-sm" style={S.text}>{brandName}</span>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <img src="/L_agencia/logo_singular.svg" alt="Singular" className="ad-logo h-6 w-auto" />
          <AdminThemeToggle />
        </div>
      </div>

      {/* ===== SIDEBAR desktop ===== */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 w-[240px]" style={S.sidebar}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center relative flex-shrink-0 overflow-hidden" style={logoBgStyle}>
            <BrandLogo src={brandLogo} color={brand.logoColor} className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-wide" style={S.text}>{brandName}</div>
            <div className="text-[11px] uppercase tracking-widest font-semibold" style={S.sub}>{subtitle}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto">
          <a href="/employee/menu"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={navActive}>
            <NavIcon name="menu" />
            <span className="flex-1">Menú</span>
          </a>
        </nav>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: '1px solid var(--ad-border)' }}>
          <div className="flex items-center gap-3 p-2 rounded-lg mb-1"
            style={{ backgroundColor: 'var(--ad-overlay)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: 'var(--ad-accent)', color: accentText }}>
              E
            </div>
            <div>
              <div className="text-sm font-semibold" style={S.text}>Empleado</div>
              <div className="text-xs" style={S.sub}>Sesión activa</div>
            </div>
          </div>
          <button type="button" onClick={() => setReportOpen(true)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ color: 'var(--ad-sub)' }}>
            <NavIcon name="flag" />
            <span>Reportar problema</span>
          </button>
        </div>
      </aside>

      {/* ===== MOBILE DRAWER ===== */}
      <div className={`md:hidden fixed inset-0 z-50 transition-all duration-200 ${open ? 'visible' : 'invisible pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black transition-opacity duration-200 ${open ? 'opacity-60' : 'opacity-0'}`}
          onClick={() => setOpen(false)} />

        <aside className={`relative w-64 h-full flex flex-col shadow-2xl transform transition-transform duration-250 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
          style={S.sidebar}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--ad-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center" style={logoBgStyle}>
                <BrandLogo src={brandLogo} color={brand.logoColor} className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="font-extrabold text-sm" style={S.text}>{brandName}</div>
                <div className="text-[10px] uppercase tracking-widest" style={S.sub}>{subtitle}</div>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: 'var(--ad-overlay)', color: 'var(--ad-sub)' }}>×</button>
          </div>

          <nav className="flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto">
            <a href="/employee/menu"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium"
              style={navActive}>
              <NavIcon name="menu" />
              <span className="flex-1">Menú</span>
            </a>
          </nav>

          <div className="p-3" style={{ borderTop: '1px solid var(--ad-border)' }}>
            <button type="button" onClick={() => { setOpen(false); setReportOpen(true) }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium"
              style={{ color: 'var(--ad-sub)' }}>
              <NavIcon name="flag" />
              <span>Reportar problema</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Report modal */}
      {reportOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }}
            onClick={() => { setReportOpen(false); setReportMsg(''); setReportSent(false) }} />
          <div style={{ position: 'relative', background: 'var(--ad-sidebar)', border: '1px solid var(--ad-border)', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '420px' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ad-text)', marginBottom: '6px' }}>Reportar problema</div>
            <div style={{ fontSize: '.82rem', color: 'var(--ad-sub)', marginBottom: '16px' }}>Describe el problema para que el SuperAdmin te ayude.</div>
            {reportSent ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#22c55e', fontWeight: 600, fontSize: '1rem' }}>✓ Reporte enviado</div>
            ) : (
              <>
                <textarea
                  value={reportMsg}
                  onChange={e => setReportMsg(e.target.value)}
                  placeholder="Describe el problema..."
                  rows={4}
                  style={{ width: '100%', background: 'var(--ad-overlay)', border: '1px solid var(--ad-border)', borderRadius: '8px', padding: '10px', color: 'var(--ad-text)', fontSize: '.88rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setReportOpen(false); setReportMsg('') }}
                    style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--ad-overlay)', color: 'var(--ad-sub)', border: '1px solid var(--ad-border)', cursor: 'pointer', fontSize: '.88rem' }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={sendReport} disabled={reportSending || !reportMsg.trim()}
                    style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--ad-accent)', color: '#fff', border: 'none', cursor: reportSending || !reportMsg.trim() ? 'not-allowed' : 'pointer', fontSize: '.88rem', opacity: reportSending || !reportMsg.trim() ? 0.6 : 1 }}>
                    {reportSending ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
