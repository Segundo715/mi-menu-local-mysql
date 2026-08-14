'use client'

// Sidebar del administrador: el orden de los links se persiste en localStorage (admin_nav_order)
// y es drag-reorderable. Los links con feature deshabilitada aparecen grises con badge "PRO".
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { FeatureKey } from '@/lib/features'
import AdminThemeToggle from '@/app/components/AdminThemeToggle'
import { useBrand } from '@/app/components/BrandProvider'
import { BrandLogo } from '@/app/components/BrandLogo'

interface NavLink {
  href: string; icon: string; label: string; exact?: boolean; feature?: FeatureKey
}

const NAV_LINKS: NavLink[] = [
  { href: '/admin/menu',            icon: 'menu',             label: 'Menú Inteligente' },
  { href: '/admin/orders',          icon: 'operaciones',      label: 'Pedidos' },
  { href: '/admin/reviews',         icon: 'reviews',          label: 'Reseñas', feature: 'reviews' },
  { href: '/admin/configuracion',   icon: 'settings',         label: 'Configuración' },
]

const ORDER_KEY = 'admin_nav_order'
const DRAG_THRESHOLD = 8

const ICONS: Record<string, string> = {
  home:             '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  loyalty:          '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
  tv:               '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  menu:             '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
  analytics:        '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  ventas:           '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  marketing:        '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  crm:              '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>',
  calendar:         '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  operaciones:      '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  automatizaciones: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  produccion:       '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  reportes:         '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  settings:         '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  recipes:          '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  card:             '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/>',
  reviews:          '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  scan:             '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><line x1="14" y1="14" x2="21" y2="14"/><line x1="14" y1="18" x2="18" y2="18"/><line x1="14" y1="21" x2="21" y2="21"/>',
  logout:           '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  flag:             '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  navbar:           '<rect x="3" y="14" width="18" height="7" rx="2"/><circle cx="8" cy="17.5" r="1"/><circle cx="12" cy="17.5" r="1"/><circle cx="16" cy="17.5" r="1"/><path d="M12 3v8M8 7l4-4 4 4"/>',
  demo:             '<polygon points="5 3 19 12 5 21 5 3"/>',
  birthday:         '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 3v1"/><path d="M8 7h1M15 7h1"/>',
  resta3:           '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><circle cx="12" cy="10" r="3"/>',
}

function NavIcon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[name] ?? '' }} />
  )
}

function isEnabled(features: Partial<Record<FeatureKey, boolean>> | undefined, feature?: FeatureKey) {
  if (!feature) return true
  return features?.[feature] ?? true
}

// Texto negro o blanco según la luminancia del color de fondo, para que contraste.
function contrastText(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#000'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#000' : '#fff'
}

function normalizeOrder(saved: string[], ids: string[]) {
  return [...saved.filter(id => ids.includes(id)), ...ids.filter(id => !saved.includes(id))]
}

export default function AdminNav() {
  const router = useRouter()
  const [pathname, setPathname] = useState('')
  const [open, setOpen] = useState(false)
  const [order, setOrder] = useState<string[]>([])
  const [draggingHref, setDraggingHref] = useState<string | null>(null)
  const [subtitle, setSubtitle] = useState('Dirección General')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportMsg, setReportMsg] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [liveFeatures, setLiveFeatures] = useState<Partial<Record<FeatureKey, boolean>> | null>(null)
  const dragRef = useRef<{ href: string; startX: number; startY: number; dragging: boolean } | null>(null)
  const suppressClickRef = useRef(false)
  const brand = useBrand()

  useEffect(() => {
    queueMicrotask(() => {
      setPathname(window.location.pathname)
      try {
        const saved = JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]')
        if (Array.isArray(saved)) setOrder(saved.map(String))
      } catch {}
    })
    fetch('/api/settings?key=admin_subtitle')
      .then(r => r.json())
      .then(d => { if (d?.value) setSubtitle(d.value) })
      .catch(() => {})
    const fetchFeatures = () =>
      fetch('/api/features').then(r => r.json()).then(setLiveFeatures).catch(() => {})
    fetchFeatures()
    window.addEventListener('focus', fetchFeatures)
    return () => window.removeEventListener('focus', fetchFeatures)
  }, [])

  const activeFeatures = liveFeatures ?? brand.features

  const brandName = brand.name || 'NICHO'
  const brandLogo = brand.logo || '/logo.png'
  const logoBgStyle = brand.logoBg ? { backgroundColor: brand.logoBg } : undefined
  const accentColor = brand.accent || 'var(--ad-accent)'
  const accentText = contrastText(brand.accent)
  const navActive = { backgroundColor: accentColor, color: accentText }
  // Variables que consume el hover de los enlaces (ver .ad-navlink en globals.css)
  const navVars = { '--ad-nav-hover': accentColor, '--ad-nav-hover-text': accentText } as CSSProperties

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  async function sendReport() {
    if (!reportMsg.trim()) return
    setReportSending(true)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_name: 'Administrador', from_role: 'Admin', message: reportMsg.trim() }),
      })
      if (res.ok) {
        setReportSent(true)
        setTimeout(() => { setReportOpen(false); setReportSent(false); setReportMsg('') }, 2000)
      }
    } finally {
      setReportSending(false)
    }
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const orderedLinks = useMemo(() => {
    const ids = NAV_LINKS.map(link => link.href)
    const normalized = normalizeOrder(order, ids)
    const linksByHref = new Map(NAV_LINKS.map(link => [link.href, link]))
    return normalized.map(href => linksByHref.get(href)).filter(Boolean) as NavLink[]
  }, [order])

  function moveLink(fromHref: string, toHref: string) {
    if (fromHref === toHref) return
    const allIds = NAV_LINKS.map(link => link.href)

    setOrder(prev => {
      const ids = normalizeOrder(prev, allIds)
      const fromIndex = ids.indexOf(fromHref)
      const toIndex = ids.indexOf(toHref)
      if (fromIndex < 0 || toIndex < 0) return prev

      const next = [...ids]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      localStorage.setItem(ORDER_KEY, JSON.stringify(next))
      return next
    })
  }

  function startDrag(href: string, e: React.PointerEvent<HTMLElement>) {
    e.preventDefault()
    dragRef.current = { href, startX: e.clientX, startY: e.clientY, dragging: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function updateDrag(e: React.PointerEvent<HTMLElement>) {
    e.preventDefault()
    const drag = dragRef.current
    if (!drag) return

    const distance = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY)
    if (!drag.dragging && distance > DRAG_THRESHOLD) {
      drag.dragging = true
      suppressClickRef.current = true
      setDraggingHref(drag.href)
    }
    if (!drag.dragging) return

    const list = e.currentTarget.closest<HTMLElement>('[data-admin-nav-list]')
    if (!list) return

    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-admin-nav-href]'))
    const targetIndex = items.findIndex(item => {
      const rect = item.getBoundingClientRect()
      return e.clientY < rect.top + rect.height / 2
    })
    const insertIndex = targetIndex === -1 ? items.length - 1 : targetIndex
    const targetHref = items[insertIndex]?.dataset.adminNavHref
    if (targetHref && targetHref !== drag.href) moveLink(drag.href, targetHref)
  }

  function endDrag() {
    dragRef.current = null
    setDraggingHref(null)
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 0)
  }

  function cancelIfDragging(e: React.MouseEvent<HTMLElement>) {
    if (!suppressClickRef.current) return
    e.preventDefault()
    e.stopPropagation()
  }

  const S = {
    sidebar:   { backgroundColor: 'var(--ad-sidebar)', borderRight: '1px solid var(--ad-border)' },
    card:      { backgroundColor: 'var(--ad-card)', border: '1px solid var(--ad-border)' },
    navActive: { backgroundColor: 'var(--ad-accent)', color: '#000' },
    navHover:  { backgroundColor: 'var(--ad-overlay)' },
    text:      { color: 'var(--ad-text)' },
    sub:       { color: 'var(--ad-sub)' },
    accent:    { color: 'var(--ad-accent)' },
    border:    { borderColor: 'var(--ad-border)' },
  }

  return (
    <>
      {/* ===== Logo agencia + toggle de tema (fijo, escritorio) ===== */}
      <div className="hidden md:flex fixed top-5 right-[250px] z-[100] items-center gap-3">
        <img src="/L_agencia/logo_singular.svg" alt="Singular" className="ad-logo h-6 w-auto pointer-events-none" />
        <AdminThemeToggle />
      </div>

      {/* ===== TOPBAR mobile ===== */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: 'var(--ad-sidebar)', borderBottom: '1px solid var(--ad-border)' }}>
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2.5">
          <div className="flex flex-col gap-1">
            {[0,1,2].map(i => (
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
        <nav data-admin-nav-list className="flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto" style={navVars}>
          {orderedLinks.map(link => {
            const active = isActive(link.href, link.exact)
            const enabled = isEnabled(activeFeatures, link.feature)
            if (!enabled) return null
            const isDragging = draggingHref === link.href
            return (
              <Link key={link.href}
                data-admin-nav-href={link.href}
                draggable={false}
                href={link.href}
                onPointerDown={e => startDrag(link.href, e)}
                onPointerMove={updateDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClick={e => cancelIfDragging(e)}
                className={`ad-navlink flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all touch-none select-none${active ? ' is-active' : ''}`}
                style={active
                  ? { ...navActive, transform: isDragging ? 'scale(1.03)' : 'none', cursor: 'grab' }
                  : { color: 'var(--ad-sub)', opacity: isDragging ? 0.82 : 1, cursor: 'grab', transform: isDragging ? 'scale(1.03)' : 'none' }}>
                <NavIcon name={link.icon} />
                <span className="flex-1">{link.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: '1px solid var(--ad-border)' }}>
          <div className="flex items-center gap-3 p-2 rounded-lg mb-1"
            style={{ backgroundColor: 'var(--ad-overlay)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f6ef7)', color: '#fff' }}>A</div>
            <div>
              <div className="text-sm font-semibold" style={S.text}>Administrador</div>
              <div className="text-xs" style={S.sub}>{subtitle}</div>
            </div>
          </div>
          <button type="button" onClick={() => setReportOpen(true)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ color: 'var(--ad-sub)' }}>
            <NavIcon name="flag" />
            <span>Reportar problema</span>
          </button>
          <button type="button" onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ color: 'var(--ad-sub)' }}>
            <NavIcon name="logout" />
            <span>Cerrar sesión</span>
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

          <nav data-admin-nav-list className="flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto" style={navVars}>
            {orderedLinks.map(link => {
              const active = isActive(link.href, link.exact)
              const enabled = isEnabled(activeFeatures, link.feature)
              if (!enabled) return null
              const isDragging = draggingHref === link.href
              return (
                <Link key={link.href}
                  data-admin-nav-href={link.href}
                  draggable={false}
                  href={link.href}
                  onPointerDown={e => startDrag(link.href, e)}
                  onPointerMove={updateDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onClick={e => { cancelIfDragging(e); if (!suppressClickRef.current) setOpen(false) }}
                  className={`ad-navlink flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium touch-none select-none${active ? ' is-active' : ''}`}
                  style={active
                    ? { ...navActive, transform: isDragging ? 'scale(1.03)' : 'none', cursor: 'grab' }
                    : { color: 'var(--ad-sub)', opacity: isDragging ? 0.82 : 1, transform: isDragging ? 'scale(1.03)' : 'none', cursor: 'grab' }}>
                  <NavIcon name={link.icon} />
                  <span className="flex-1">{link.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-3" style={{ borderTop: '1px solid var(--ad-border)' }}>
            <button type="button" onClick={() => { setOpen(false); setReportOpen(true) }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium"
              style={{ color: 'var(--ad-sub)' }}>
              <NavIcon name="flag" />
              <span>Reportar problema</span>
            </button>
            <button type="button" onClick={logout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium"
              style={{ color: 'var(--ad-sub)' }}>
              <NavIcon name="logout" />
              <span>Cerrar sesión</span>
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
