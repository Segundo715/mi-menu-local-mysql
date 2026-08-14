'use client'

// Rail derecho fijo del panel RESTA3. Pieza de chrome compartida (como Resta3Nav):
// fijo en escritorio (lg+), drawer en móvil/tablet. Vive en el layout y expone, vía
// contexto, el nodo DOM donde las páginas portan su contenido (createPortal) sin tener
// que levantar su estado local. Cuando ninguna página lo llena, muestra DefaultRailContent.
// Usa las CSS vars --ad-* y el acento de marca (useBrand) igual que el resto del panel.
import { createContext, useContext, useEffect, useState } from 'react'
import { useBrand } from '@/app/components/BrandProvider'

interface RightRailApi {
  mount: HTMLElement | null          // nodo destino del portal
  setFilled: (b: boolean) => void    // la página declara que llena el rail
  setTitle: (t: string) => void      // título del encabezado
  open: boolean                      // estado del drawer (móvil/tablet)
  setOpen: (b: boolean) => void
}

const RightRailContext = createContext<RightRailApi>({
  mount: null,
  setFilled: () => {},
  setTitle: () => {},
  open: false,
  setOpen: () => {},
})

export function useRightRail(): RightRailApi {
  return useContext(RightRailContext)
}

const S = {
  card: 'var(--ad-card)',
  bg: 'var(--ad-bg)',
  text: 'var(--ad-text)',
  sub: 'var(--ad-sub)',
  border: 'var(--ad-border)',
  accent: 'var(--ad-accent)',
}

export default function RightRail({ children }: { children: React.ReactNode }) {
  const [mount, setMount] = useState<HTMLElement | null>(null)
  const [filled, setFilled] = useState(false)
  const [title, setTitle] = useState('Panel')
  const [open, setOpen] = useState(false)

  return (
    <RightRailContext.Provider value={{ mount, setFilled, setTitle, open, setOpen }}>
      {/* Reserva el espacio derecho global en escritorio sin tocar cada página */}
      <div className="lg:mr-[420px]">{children}</div>

      {/* Botón de apertura (móvil/tablet) — lengüeta en el borde derecho */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir panel"
        className="lg:hidden fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1 px-2 py-3 rounded-l-xl shadow-lg"
        style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderRight: 'none', color: S.text }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {filled && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: S.accent }} />}
      </button>

      {/* Overlay (móvil/tablet) */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
      )}

      {/* Rail: fijo en lg+, drawer translado en pantallas menores */}
      <aside
        className={`fixed top-0 right-0 h-screen w-[420px] z-40 flex flex-col transition-transform duration-250 ease-out lg:translate-x-0 ${open ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:shadow-none'}`}
        style={{ backgroundColor: S.card, borderLeft: `1px solid ${S.border}` }}>
        {/* Encabezado */}
        <div className="px-4 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid ${S.border}` }}>
          <p className="font-black text-sm tracking-wide" style={{ color: S.text }}>{title}</p>
          <button onClick={() => setOpen(false)} aria-label="Cerrar panel"
            className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: S.sub }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          {/* Slot del portal (lo llenan las páginas) */}
          <div ref={setMount} className="flex-1 min-h-0 flex flex-col" />
          {/* Contenido por defecto cuando ninguna página inyecta */}
          {!filled && <DefaultRailContent />}
        </div>
      </aside>
    </RightRailContext.Provider>
  )
}

// Placeholder mostrado cuando el rail está vacío. Punto de partida para futuras
// funciones fijas (atajos, KPIs, reloj, etc.).
function DefaultRailContent() {
  const brand = useBrand()
  const [now, setNow] = useState('')

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000 * 30)
    return () => clearInterval(id)
  }, [])

  const shortcuts = [
    { href: '/resta3/menu', label: 'Menú', emoji: '🍽' },
  ]

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
        <p className="text-3xl font-black tabular-nums" style={{ color: S.text }}>{now || '—'}</p>
        <p className="text-xs mt-1" style={{ color: S.sub }}>{brand.name || 'RESTA3'}</p>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: S.sub }}>Accesos rápidos</p>
        <div className="space-y-1.5">
          {shortcuts.map(s => (
            <a key={s.href} href={s.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.01]"
              style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }}>
              <span className="text-base">{s.emoji}</span>{s.label}
            </a>
          ))}
        </div>
      </div>

      <p className="text-[11px] mt-auto text-center" style={{ color: S.sub }}>
        Panel fijo · espacio para más funciones
      </p>
    </div>
  )
}
