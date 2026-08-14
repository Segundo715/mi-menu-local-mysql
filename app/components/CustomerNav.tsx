'use client'

// Nav inferior del cliente: configuración completa viene de settings.customer_nav (JSON).
// Los tabs, colores y radio se normalizan con normalizeNavConfig; cada tab puede habilitarse
// por módulo de usuario (TAB_USER_MODULE) o mostrarse siempre si no tiene restricción.
import { useEffect, useState } from 'react'
// Iconos integrados (markup interno del <svg>) para los botones por defecto.
export const BUILTIN_ICONS: Record<string, string> = {
  menu:   '<path d="M3 3v7a3 3 0 0 0 3 3v8M6 3v7M9 3v7M18 3c-1.5 1-2 3-2 6s.5 4 2 5v7" />',
  review: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.2l5.9-.9z" />',
  card:   '<path d="M4 8h12v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" /><path d="M16 9h2a2 2 0 0 1 0 4h-2" /><path d="M7 2v2M10 2v2M13 2v2" />',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" />',
}

// Mapeo de tab ID → módulo de usuario en Supabase
const TAB_USER_MODULE: Record<string, string> = {
  menu:   'usr_menu',
  review: 'usr_resenas',
  card:   'usr_tarjeta',
}

// ── Config editable desde /admin/navegador (clave de settings: customer_nav) ──
export interface NavTab {
  id: string      // id estable; los de fábrica son 'menu' | 'review' | 'card'
  label: string
  href: string
  icon: string    // URL de imagen subida; vacío = usa el icono integrado del id
}
export interface NavConfig {
  bg: string; border: string; accent: string; inactive: string; radius: number
  tabs: NavTab[]
  showLogout: boolean
}
export const DEFAULT_NAV: NavConfig = {
  bg: '#0d0d0d', border: '#1a1a1a', accent: '#B90F45', inactive: '#6b7280', radius: 9999,
  tabs: [
    { id: 'menu',   label: 'Menú',    href: '/menu',   icon: '' },
  ],
  showLogout: false,
}

// Acepta config nueva (tabs) y migra la antigua (labels) sin romper nada.
export function normalizeNavConfig(v: unknown): NavConfig {
  const o = (v ?? {}) as Record<string, unknown>
  let tabs: NavTab[]
  if (Array.isArray(o.tabs)) {
    tabs = (o.tabs as Partial<NavTab>[])
      .filter(t => t && typeof t.href === 'string')
      .map((t, i) => ({
        id: String(t!.id ?? `tab${i}`),
        label: String(t!.label ?? ''),
        href: String(t!.href ?? '/'),
        icon: String(t!.icon ?? ''),
      }))
  } else {
    const labels = (o.labels ?? {}) as Record<string, string>
    tabs = DEFAULT_NAV.tabs.map(t => ({ ...t, label: labels[t.id] ?? t.label }))
  }
  return {
    bg: typeof o.bg === 'string' ? o.bg : DEFAULT_NAV.bg,
    border: typeof o.border === 'string' ? o.border : DEFAULT_NAV.border,
    accent: typeof o.accent === 'string' ? o.accent : DEFAULT_NAV.accent,
    inactive: typeof o.inactive === 'string' ? o.inactive : DEFAULT_NAV.inactive,
    radius: typeof o.radius === 'number' ? o.radius : DEFAULT_NAV.radius,
    tabs: tabs.length ? tabs : DEFAULT_NAV.tabs,
    showLogout: o.showLogout !== false,
  }
}

function TabIcon({ icon, builtin, className }: { icon: string; builtin?: string; className?: string }) {
  if (icon) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={icon} alt="" className={className} style={{ width: 24, height: 24, objectFit: 'contain' }} />
  }
  const inner = builtin ? BUILTIN_ICONS[builtin] : undefined
  if (inner) {
    return (
      <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: inner }} />
    )
  }
  return <span className={`rounded-full border-2 border-current ${className ?? ''}`} style={{ width: 18, height: 18 }} />
}

function logout() {
  localStorage.removeItem('registro_card_id')
  localStorage.removeItem('loyalty_pending_id')
  window.location.href = '/registro'
}

export default function CustomerNav({ active }: { active?: string }) {
  const [cfg, setCfg] = useState<NavConfig>(DEFAULT_NAV)
  const [pathname, setPathname] = useState('')
  const [userPerms, setUserPerms] = useState<Record<string, boolean>>({})

  useEffect(() => {
    queueMicrotask(() => {
      setPathname(window.location.pathname)
      localStorage.removeItem('customer_nav_order')
    })
    fetch('/api/settings?key=customer_nav')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.value) { try { setCfg(normalizeNavConfig(JSON.parse(d.value))) } catch {} } })
      .catch(() => {})
    fetch('/api/permissions')
      .then(r => r.json())
      .then(d => setUserPerms(d.user ?? {}))
      .catch(() => {})
  }, [])

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden max-w-lg mx-auto"
      style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: `${cfg.radius}px` }}>
      <div className="flex">
        {cfg.tabs.map(tab => {
          const userModule = TAB_USER_MODULE[tab.id]
          const locked = userModule ? userPerms[userModule] === false : false
          if (locked) return null
          const isActive = tab.id === active || (!!pathname && tab.href !== '/' && pathname.startsWith(tab.href))
          const col = isActive ? cfg.accent : cfg.inactive

          return (
            <a key={tab.id} href={tab.href}
              className="flex-1 py-2.5 flex flex-col items-center gap-0.5 relative transition-colors"
              style={{ color: col, cursor: 'pointer' }}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: cfg.accent }} />
              )}
              <TabIcon icon={tab.icon} builtin={tab.id}
                className={`transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-xs font-bold">{tab.label}</span>
            </a>
          )
        })}
        {cfg.showLogout && (
          <button type="button" onClick={logout}
            className="flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-colors"
            style={{ color: cfg.inactive, cursor: 'pointer' }}
          >
            <TabIcon icon="" builtin="logout" />
            <span className="text-xs font-bold">Salir</span>
          </button>
        )}
      </div>
    </div>
  )
}
