'use client'

// Recetario público con branding configurable (recetario_color, recetario_logo desde settings).
// El color de marca se propaga a todos los componentes internos en tiempo de render, no vía CSS vars.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Icon } from '@/app/components/Icon'

/* ============================================================================
 * Tema (claro / oscuro). El guinda es constante en ambos.
 * ========================================================================== */
const GUINDA = '#B90F45'
const GUINDA_DARK = '#8E0B34'

const THEMES = {
  light: {
    bg: '#ececec', card: '#ffffff', ink: '#1f1f1f', sub: '#4a4a4a',
    line: 'rgba(0,0,0,0.12)', header: 'rgba(185,15,69,0.16)',
    chip: '#f3f3f3', chipInk: '#555', field: '#f6f6f6', label: GUINDA_DARK,
  },
  dark: {
    bg: '#0a0a0a', card: '#161616', ink: '#f0f0f0', sub: '#9a9a9a',
    line: 'rgba(255,255,255,0.12)', header: 'rgba(185,15,69,0.30)',
    chip: '#1f1f1f', chipInk: '#bbb', field: '#1c1c1c', label: '#E8638A',
  },
} as const
type ThemeName = keyof typeof THEMES

interface Theme {
  bg: string; card: string; ink: string; sub: string; line: string
  header: string; chip: string; chipInk: string; field: string; label: string
}

// Color con transparencia a partir de un hex #rrggbb.
function hexA(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// Mezcla dos colores hex (amount 0..1 hacia el segundo). Sirve para aclarar el guinda.
function mix(hex: string, withHex: string, amount: number): string {
  const toRgb = (h: string) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
  const a = toRgb(hex), b = toRgb(withHex)
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * amount))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

// Construye el tema usando el color de marca elegido en /admin/recipes.
function buildTheme(name: ThemeName, guinda: string): Theme {
  const base = THEMES[name]
  return {
    ...base,
    header: hexA(guinda, name === 'dark' ? 0.30 : 0.16),
    label: name === 'dark' ? mix(guinda, '#ffffff', 0.5) : guinda,
  }
}

/* ============================================================================
 * Iconos planos (SVG)
 * ========================================================================== */
function IconSearch({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  )
}
function IconSun({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.5" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
        <line key={d} x1="12" y1="2" x2="12" y2="4.5" transform={`rotate(${d} 12 12)`} />
      ))}
    </svg>
  )
}
function IconMoon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}
function IconCoffee({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M17 9h2.5a2.5 2.5 0 0 1 0 5H17" />
      <line x1="7" y1="2.5" x2="7" y2="4.5" /><line x1="11" y1="2.5" x2="11" y2="4.5" />
    </svg>
  )
}
function IconFood({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2v8M3 2v4a2 2 0 0 0 2 2M7 2v4a2 2 0 0 1-2 2M5 10v12" />
      <path d="M17 2c-1.7 0-3 2-3 5s1.3 4 3 4v11" />
    </svg>
  )
}
function IconGrid({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

/* ============================================================================
 * Modelo (coincide con /api/recipes y /admin/recipes)
 * ========================================================================== */
interface Recipe {
  id: string
  name: string
  description: string
  category: string
  ingredients: string[]
  steps: string[]
  imageUrl?: string
  createdAt: string
}

// Convierte ingrediente almacenado como objeto JSON a texto legible
function normalizeIngredient(s: string): string {
  try {
    const p = JSON.parse(s)
    if (p && typeof p === 'object' && p.name) {
      const parts = []
      if (p.quantity) parts.push(p.quantity)
      if (p.unit) parts.push(p.unit)
      parts.push(p.name)
      return parts.join(' ')
    }
  } catch {}
  return s
}

// Convierte paso almacenado como objeto JSON a texto legible
function normalizeStep(s: string): string {
  try {
    const p = JSON.parse(s)
    if (p && typeof p === 'object' && p.description) return String(p.description)
  } catch {}
  return s
}

// Adivina si una categoría es bebida (para elegir ícono café vs comida)
const DRINK_HINTS = ['bebida', 'café', 'cafe', 'espresso', 'espresso', 'frap', 'latte', 'moka', 'mocha', 'té', 'te', 'capuch', 'capp', 'smoothie', 'jugo', 'refresc', 'drink']
function isDrinkCategory(cat: string) {
  const c = cat.toLowerCase()
  return DRINK_HINTS.some((h) => c.includes(h))
}

/* ============================================================================
 * Visual de la receta (imagen real o ícono plano según categoría)
 * ========================================================================== */
function RecipeVisual({ recipe, guinda }: { recipe: Recipe; guinda: string }) {
  if (recipe.imageUrl) {
    return (
      <img
        src={recipe.imageUrl}
        alt={recipe.name}
        className="w-full max-w-[560px] aspect-[4/3] object-cover rounded-2xl"
      />
    )
  }
  const drink = isDrinkCategory(recipe.category)
  return (
    <div
      className="w-full max-w-[260px] aspect-square rounded-2xl flex items-center justify-center"
      style={{ background: hexA(guinda, 0.08), border: `2px solid ${guinda}` }}
    >
      {drink ? <IconCoffee size={120} color={guinda} /> : <IconFood size={120} color={guinda} />}
    </div>
  )
}

/* ============================================================================
 * Cuerpo de la receta (encabezado + visual + ingredientes + preparación)
 * ========================================================================== */
function RecipeBody({ recipe, t, controls, guinda, logo }: { recipe: Recipe; t: Theme; controls?: React.ReactNode; guinda: string; logo: string }) {
  const cellBorder = `1px solid ${t.line}`
  // Datos directos de la receta administrada en /admin/recipes (vía /api/recipes).
  const ingredients = recipe.ingredients.map(normalizeIngredient)
  const steps = recipe.steps.map(normalizeStep)
  return (
    <div className="flex flex-col md:h-full md:min-h-0">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-5xl font-black leading-tight" style={{ color: guinda }}>{recipe.name}</h1>
          {recipe.description && (
            <p className="mt-3 text-sm sm:text-lg max-w-2xl" style={{ color: t.ink }}>{recipe.description}</p>
          )}
        </div>
        <div className="shrink-0 hidden sm:block">
          {logo && <img src={logo} alt="Logo" className="h-[88px] w-auto object-contain" />}
        </div>
      </div>

      {/* Botones (debajo de la descripción) */}
      {controls && <div className="mt-5 shrink-0">{controls}</div>}

      <div className="mt-5 h-[3px] w-full rounded shrink-0" style={{ background: guinda }} />

      {/* Cuerpo */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-[560px_1fr] gap-8 md:gap-10 items-start md:flex-1 md:min-h-0">
        <div className="flex justify-center items-start pt-2 md:h-full md:overflow-hidden">
          <RecipeVisual recipe={recipe} guinda={guinda} />
        </div>

        <div className="recipe-scroll min-w-0 md:h-full md:min-h-0 md:overflow-y-auto pr-2">
          {/* Ingredientes */}
          <table className="w-full border-collapse text-sm sm:text-base">
            <thead>
              <tr>
                <th className="text-left px-3 py-2.5 font-bold" style={{ background: t.header, color: t.label, border: cellBorder }}>
                  Ingredientes ({ingredients.length})
                </th>
              </tr>
            </thead>
            <tbody>
              {ingredients.length === 0 ? (
                <tr><td className="px-3 py-2.5" style={{ color: t.sub, border: cellBorder }}>Sin ingredientes registrados</td></tr>
              ) : (
                ingredients.map((ing, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2.5" style={{ color: t.ink, border: cellBorder }}>
                      <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ background: guinda }} />
                      {ing}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Preparación */}
          <div className="mt-7">
            <div className="px-3 py-2.5 font-bold rounded-t text-sm sm:text-base" style={{ background: t.header, color: t.label, border: cellBorder }}>
              Preparación ({steps.length} pasos)
            </div>
            {steps.length === 0 ? (
              <div className="px-3 py-3 text-sm" style={{ color: t.sub, borderLeft: cellBorder, borderRight: cellBorder, borderBottom: cellBorder }}>
                Sin pasos registrados
              </div>
            ) : (
              <ol>
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-3 px-3 py-3 text-sm sm:text-base items-start"
                    style={{ color: t.ink, borderLeft: cellBorder, borderRight: cellBorder, borderBottom: cellBorder }}>
                    <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black mt-0.5" style={{ background: guinda, color: '#fff' }}>{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================================
 * Pedidos (KDS) — mismo estado que /resta3/cocina, con el tema del recetario
 * ========================================================================== */
interface OrderItem { name: string; quantity: number; price: number }
interface Order { id: string; customerName: string; tableNumber?: string; status: string; items: OrderItem[]; notes?: string; createdAt: string }

const KDS = [
  { key: 'pending',   label: 'Nuevo',      color: '#f59e0b', next: 'preparing', nextLabel: 'Iniciar',  icon: 'play'  as const, urgent: 5  },
  { key: 'preparing', label: 'Preparando', color: '#3b82f6', next: 'ready',     nextLabel: 'Listo',    icon: 'check' as const, urgent: 15 },
  { key: 'ready',     label: 'Listo',      color: '#22c55e', next: 'delivered', nextLabel: 'Entregar', icon: 'truck' as const, urgent: 10 },
]

function elapsedMin(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  return { label: mins < 1 ? 'ahora' : `${mins} min`, mins }
}
function noteText(notes?: string) { return (notes ?? '').replace(/^\[\w+\]\s*/, '').trim() }

// Meta de estado para el listado del día (incluye enviado/entregado).
const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Nuevo',      color: '#f59e0b' },
  preparing: { label: 'Preparando', color: '#3b82f6' },
  ready:     { label: 'Listo',      color: '#22c55e' },
  enviado:   { label: 'Enviado',    color: '#0ea5e9' },
  delivered: { label: 'Entregado',  color: '#a855f7' },
}
function fmtClock(iso: string) { return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) }
function isToday(iso: string) {
  const d = new Date(iso), n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

function OrdersBoard({ t, guinda }: { t: Theme; guinda: string }) {
  const [all, setAll] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState<string | null>(null)

  async function load() {
    try {
      const r = await fetch('/api/orders')
      if (r.ok) setAll(await r.json())
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(load)
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [])

  async function advance(id: string, next: string) {
    setAdvancing(id)
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    await load()
    setAdvancing(null)
  }

  if (loading) {
    return <div className="md:flex-1 md:min-h-0 flex items-center justify-center text-sm rounded-2xl shadow-xl" style={{ color: t.sub, background: t.card }}>Cargando pedidos...</div>
  }

  const active = all.filter((o) => o.status !== 'delivered')
  // Todos los pedidos de hoy (cualquier estado), más recientes primero.
  const today = all
    .filter((o) => isToday(o.createdAt))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="md:flex-1 md:min-h-0 flex flex-col md:flex-row gap-4 md:overflow-hidden">

      {/* Tarjeta con el board por estado */}
      <div className="flex-1 min-w-0 shadow-xl rounded-2xl overflow-hidden flex flex-col md:min-h-0" style={{ background: t.card }}>
        <div className="recipe-scroll p-5 sm:p-7 md:flex-1 md:min-h-0 md:overflow-y-auto">
        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16" style={{ color: t.sub }}>
            <span className="mb-3" style={{ color: '#22c55e' }}><Icon name="checkCircle" size={44} /></span>
            <p className="text-lg font-black" style={{ color: t.ink }}>Sin pedidos pendientes</p>
            <p className="text-sm mt-1">Los pedidos en proceso aparecerán aquí</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 items-start">
            {KDS.map((col) => {
              const group = active.filter((o) => o.status === col.key)
              return (
                <div key={col.key}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.color }} />
                    <span className="text-xs font-black uppercase tracking-wide" style={{ color: col.color }}>{col.label}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: hexA(col.color, 0.12), color: col.color }}>{group.length}</span>
                  </div>
                  {group.length === 0 ? (
                    <div className="rounded-2xl p-4 text-center text-xs" style={{ color: t.sub, background: t.field, border: `1px dashed ${t.line}` }}>Sin pedidos</div>
                  ) : (
                  <div className="space-y-3">
                    {group.map((o) => {
                      const { label: elLabel, mins } = elapsedMin(o.createdAt)
                      const urgent = mins >= col.urgent
                      const note = noteText(o.notes)
                      return (
                        <div key={o.id} className="rounded-2xl p-4 space-y-3" style={{ background: t.field, border: `1px solid ${urgent ? hexA(col.color, 0.5) : t.line}` }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-black text-sm" style={{ color: t.ink }}>{o.customerName}</p>
                              {o.tableNumber && <p className="text-xs" style={{ color: t.sub }}>{o.tableNumber}</p>}
                            </div>
                            <span className="text-xs font-black px-2 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1" style={{ background: hexA(col.color, urgent ? 0.25 : 0.12), color: col.color }}>
                              {urgent && <Icon name="alert" size={11} />}{elLabel}
                            </span>
                          </div>
                          {o.items.length > 0 && (
                            <ul className="space-y-1">
                              {o.items.map((it, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: t.ink }}>
                                  <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0" style={{ background: hexA(col.color, 0.14), color: col.color }}>{it.quantity}</span>
                                  {it.name}
                                </li>
                              ))}
                            </ul>
                          )}
                          {note && <p className="text-xs px-2 py-1.5 rounded-lg flex items-start gap-1.5" style={{ background: hexA(guinda, 0.08), color: t.sub }}><Icon name="note" size={13} className="shrink-0 mt-0.5" /><span>{note}</span></p>}
                          <button onClick={() => advance(o.id, col.next)} disabled={advancing === o.id}
                            className="w-full py-2.5 rounded-xl text-sm font-black transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
                            style={{ background: hexA(col.color, 0.16), color: col.color, border: `1px solid ${hexA(col.color, 0.3)}` }}>
                            {advancing === o.id ? 'Guardando...' : <><Icon name={col.icon} size={15} />{col.nextLabel}</>}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        </div>
      </div>

      {/* Listado de todos los pedidos del día (lado derecho, fuera de la tarjeta) */}
      <aside className="shrink-0 md:w-[280px] flex flex-col md:min-h-0 rounded-2xl overflow-hidden shadow-xl" style={{ border: `1px solid ${t.line}`, background: t.card }}>
        <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid ${t.line}` }}>
          <span className="font-black text-sm flex items-center gap-1.5" style={{ color: t.ink }}><Icon name="clipboard" size={15} /> Pedidos del día</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: hexA(guinda, 0.12), color: guinda }}>{today.length}</span>
        </div>
        <div className="recipe-scroll md:flex-1 md:min-h-0 md:overflow-y-auto p-2 space-y-1.5">
          {today.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: t.sub }}>Sin pedidos hoy</p>
          ) : today.map((o) => {
            const st = STATUS_META[o.status] ?? { label: o.status, color: t.sub }
            const itemCount = o.items.reduce((s, it) => s + it.quantity, 0)
            return (
              <div key={o.id} className="rounded-xl p-2.5 flex items-center gap-2.5" style={{ background: t.field, border: `1px solid ${t.line}` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: t.ink }}>{o.customerName}</p>
                  <p className="text-[11px]" style={{ color: t.sub }}>
                    {fmtClock(o.createdAt)}{itemCount > 0 ? ` · ${itemCount} item${itemCount !== 1 ? 's' : ''}` : ''}
                  </p>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0" style={{ background: hexA(st.color, 0.14), color: st.color }}>
                  {st.label}
                </span>
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}

/* ============================================================================
 * Modal de edición de receta
 * ========================================================================== */
function EditRecipeModal({ recipe, guinda, t, onClose, onSaved }: {
  recipe: Recipe; guinda: string; t: Theme; onClose: () => void; onSaved: (r: Recipe) => void
}) {
  const [form, setForm] = useState({
    name: recipe.name,
    description: recipe.description,
    category: recipe.category,
    ingredients: recipe.ingredients.length ? recipe.ingredients.map(normalizeIngredient) : [''],
    steps: recipe.steps.length ? recipe.steps.map(normalizeStep) : [''],
    imageUrl: recipe.imageUrl ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function setIng(i: number, v: string) {
    setForm(f => ({ ...f, ingredients: f.ingredients.map((x, j) => j === i ? v : x) }))
  }
  function addIng() { setForm(f => ({ ...f, ingredients: [...f.ingredients, ''] })) }
  function removeIng(i: number) { setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, j) => j !== i) })) }

  function setStep(i: number, v: string) {
    setForm(f => ({ ...f, steps: f.steps.map((x, j) => j === i ? v : x) }))
  }
  function addStep() { setForm(f => ({ ...f, steps: [...f.steps, ''] })) }
  function removeStep(i: number) { setForm(f => ({ ...f, steps: f.steps.filter((_, j) => j !== i) })) }

  async function uploadImg(file: File) {
    setUploading(true)
    const { uploadWebp: up } = await import('@/lib/uploadWebp')
    const url = await up(file, '/api/recipes/upload')
    if (url) setForm(f => ({ ...f, imageUrl: url }))
    setUploading(false)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      ingredients: form.ingredients.filter(s => s.trim()),
      steps: form.steps.filter(s => s.trim()),
      imageUrl: form.imageUrl || null,
    }
    const r = await fetch(`/api/recipes/${recipe.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (r.ok) { onSaved(await r.json()); onClose() }
    setSaving(false)
  }

  const inp = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none'
  const s = { backgroundColor: t.field, color: t.ink, border: `1px solid ${t.line}` }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
        style={{ backgroundColor: t.card, border: `1px solid ${t.line}` }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black" style={{ color: guinda }}>Editar receta</h2>
          <button onClick={onClose} className="text-xl font-black" style={{ color: t.sub }}>×</button>
        </div>

        {/* Imagen */}
        <div className="flex items-center gap-3">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: hexA(guinda, 0.08), border: `1px solid ${t.line}` }}>
            {form.imageUrl
              ? <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
              : <IconFood size={36} color={guinda} />}
          </div>
          <div className="flex-1">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-full py-2.5 rounded-xl text-sm font-bold border-2 border-dashed"
              style={{ borderColor: t.line, color: t.sub }}>
              {uploading ? 'Subiendo...' : form.imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
            </button>
            {form.imageUrl && (
              <button onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                className="mt-1 text-xs font-semibold underline block text-center" style={{ color: t.sub }}>
                Quitar imagen
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadImg(f) }} />
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: t.sub }}>Nombre *</label>
          <input className={inp} style={s} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre de la receta" />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: t.sub }}>Descripción</label>
          <textarea className={`${inp} resize-none`} style={s} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción breve..." />
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: t.sub }}>Categoría</label>
          <input className={inp} style={s} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="General" />
        </div>

        {/* Ingredientes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: t.sub }}>Ingredientes</label>
            <button onClick={addIng} className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: hexA(guinda, 0.12), color: guinda }}>+ Agregar</button>
          </div>
          <div className="space-y-2">
            {form.ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2">
                <input className={`${inp} flex-1`} style={s} value={ing} onChange={e => setIng(i, e.target.value)} placeholder={`Ingrediente ${i + 1}`} />
                <button onClick={() => removeIng(i)} className="px-2 rounded-xl text-sm font-black" style={{ backgroundColor: 'rgba(239,68,68,.12)', color: '#f87171' }}>×</button>
              </div>
            ))}
          </div>
        </div>

        {/* Pasos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: t.sub }}>Pasos de preparación</label>
            <button onClick={addStep} className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: hexA(guinda, 0.12), color: guinda }}>+ Agregar</button>
          </div>
          <div className="space-y-2">
            {form.steps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black mt-2 shrink-0" style={{ background: guinda, color: '#fff' }}>{i + 1}</span>
                <textarea className={`${inp} flex-1 resize-none`} style={s} rows={2} value={step} onChange={e => setStep(i, e.target.value)} placeholder={`Paso ${i + 1}...`} />
                <button onClick={() => removeStep(i)} className="px-2 rounded-xl text-sm font-black mt-1" style={{ backgroundColor: 'rgba(239,68,68,.12)', color: '#f87171' }}>×</button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving || !form.name.trim()}
          className="w-full py-3.5 rounded-2xl font-black text-base disabled:opacity-50"
          style={{ backgroundColor: guinda, color: '#fff' }}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

/* ============================================================================
 * Página
 * ========================================================================== */
export default function RecetasPage() {
  const [theme, setTheme] = useState<ThemeName>('light')
  const [view, setView] = useState<'recetas' | 'pedidos'>('recetas')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todas')
  const [selectedId, setSelectedId] = useState<string>('')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [brandColor, setBrandColor] = useState('')
  const [brandLogo, setBrandLogo] = useState('')
  const [brandLoaded, setBrandLoaded] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)

  function handleSaved(updated: Recipe) {
    setRecipes(rs => rs.map(r => r.id === updated.id ? updated : r))
    if (selectedId === updated.id) setSelectedId(updated.id)
  }

  // Cargar recetas reales desde la BD (las que se administran en /admin/recipes)
  useEffect(() => {
    fetch('/api/recipes')
      .then((r) => r.json())
      .then((d: Recipe[]) => { setRecipes(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Color y logo del recetario (configurables desde /admin/recipes vía settings)
  useEffect(() => {
    const get = (k: string) => fetch(`/api/settings?key=${k}`).then((r) => r.json()).catch(() => ({}))
    Promise.all([get('recetario_color'), get('recetario_logo')])
      .then(([c, l]) => { setBrandColor(c?.value || ''); setBrandLogo(l?.value || ''); setBrandLoaded(true) })
  }, [])

  // Preferencia de tema
  useEffect(() => {
    const saved = localStorage.getItem('recetas_theme') as ThemeName | null
    if (saved === 'light' || saved === 'dark') queueMicrotask(() => setTheme(saved))
  }, [])
  useEffect(() => { localStorage.setItem('recetas_theme', theme) }, [theme])

  const guinda = brandColor || GUINDA
  const logo = brandLogo || '/logo.png'
  const t = buildTheme(theme, guinda)

  const categories = useMemo(
    () => ['Todas', ...Array.from(new Set(recipes.map((r) => r.category)))],
    [recipes]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return recipes.filter((r) => {
      const matchCat = category === 'Todas' || r.category === category
      const matchSearch = !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [recipes, search, category])

  const selected = selectedId ? filtered.find((r) => r.id === selectedId) : undefined

  const catIcon = (cat: string) => {
    if (cat === 'Todas') return <IconGrid color="currentColor" />
    return isDrinkCategory(cat) ? <IconCoffee color="currentColor" /> : <IconFood color="currentColor" />
  }

  // Botón de cambio de tema (reutilizado en cuadrícula y detalle).
  const themeBtn = (
    <button
      onClick={() => setTheme((p) => (p === 'light' ? 'dark' : 'light'))}
      className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0"
      style={{ background: t.chip, color: t.ink, border: `1px solid ${t.line}` }}
      aria-label="Cambiar tema"
    >
      {theme === 'light' ? <IconMoon color={t.ink} /> : <IconSun color={t.ink} />}
      <span className="hidden sm:inline">{theme === 'light' ? 'Oscuro' : 'Claro'}</span>
    </button>
  )

  // Fila de categorías + tema (vista de cuadrícula). Al elegir categoría se vuelve a la cuadrícula.
  const categoryRow = (
    <div className="flex flex-wrap items-center gap-3 shrink-0">
      <div className="recipe-scroll flex gap-2 overflow-x-auto pb-1 mr-auto">
        {categories.map((cat) => {
          const active = category === cat
          return (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setSelectedId('') }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors shrink-0"
              style={active
                ? { background: guinda, color: '#fff', border: `1px solid ${guinda}` }
                : { background: t.chip, color: t.chipInk, border: `1px solid ${t.line}` }}
            >
              {catIcon(cat)}
              {cat}
            </button>
          )
        })}
      </div>
    </div>
  )

  // Controles del detalle: volver a la cuadrícula.
  const detailControls = (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => setSelectedId('')}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors shrink-0 mr-auto"
        style={{ background: guinda, color: '#fff', border: `1px solid ${guinda}` }}
      >
        ← Volver a platillos
      </button>
      {selected && (
        <button
          onClick={() => setEditingRecipe(selected)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors shrink-0"
          style={{ background: t.chip, color: t.ink, border: `1px solid ${t.line}` }}
        >
          ✎ Editar receta
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden px-4 py-4 sm:px-8 sm:py-6 transition-colors flex flex-col" style={{ background: t.bg, '--recetas-guinda': guinda } as CSSProperties}>
      <div className="max-w-[1600px] w-full mx-auto flex flex-col md:flex-1 md:min-h-0 gap-4">

        {/* ---------- Buscador (fuera de la tarjeta) ---------- */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 mr-auto">
            {brandLoaded && <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />}
            <span className="text-xl font-black" style={{ color: guinda }}>Recetario</span>
          </div>
          {themeBtn}
          {/* Navegador: Recetas / Pedidos */}
          <div className="flex items-center gap-1 p-1 rounded-xl shrink-0" style={{ background: t.chip, border: `1px solid ${t.line}` }}>
            {(['recetas', 'pedidos'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 sm:px-3.5 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
                style={view === v ? { background: guinda, color: '#fff' } : { background: 'transparent', color: t.chipInk }}
              >
                {v === 'recetas' ? 'Recetas' : 'Pedidos'}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[160px] max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.sub }}>
              <IconSearch color="currentColor" />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar receta..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
              style={{ background: t.card, color: t.ink, border: `1px solid ${t.line}` }}
            />
          </div>
        </div>

        {view === 'pedidos' ? (
          <OrdersBoard t={t} guinda={guinda} />
        ) : (
        /* ---------- Tarjeta (recetas) ---------- */
        <div className="w-full shadow-xl overflow-hidden flex rounded-2xl md:flex-1 md:min-h-0" style={{ background: t.card }}>
          {/* Contenido */}
          <div className="flex-1 min-w-0 p-6 sm:p-9 flex flex-col md:min-h-0">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-sm" style={{ color: t.sub }}>Cargando recetas...</div>
            ) : selected ? (
              <RecipeBody recipe={selected} t={t} controls={detailControls} guinda={guinda} logo={brandLoaded ? logo : ''} />
            ) : (
              <div className="flex flex-col md:h-full md:min-h-0">
                {categoryRow}
                <div className="mt-5 h-[3px] w-full rounded shrink-0" style={{ background: guinda }} />
                {filtered.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center py-16" style={{ color: t.sub }}>
                    {recipes.length === 0
                      ? 'No hay recetas. Crea la primera en /admin/recipes.'
                      : 'No se encontraron recetas con ese filtro.'}
                  </div>
                ) : (
                  <div className="recipe-scroll mt-6 md:flex-1 md:min-h-0 md:overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-1">
                      {filtered.map((r) => {
                        const drink = isDrinkCategory(r.category)
                        return (
                          <div key={r.id} className="relative group">
                            <button
                              onClick={() => setSelectedId(r.id)}
                              className="text-left w-full rounded-2xl overflow-hidden shadow-sm transition-transform hover:-translate-y-1"
                              style={{ background: t.card, border: `1px solid ${t.line}` }}
                            >
                              <div className="aspect-[4/3] w-full overflow-hidden flex items-center justify-center" style={{ background: hexA(guinda, 0.06) }}>
                                {r.imageUrl
                                  ? <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                                  : (drink ? <IconCoffee size={56} color={guinda} /> : <IconFood size={56} color={guinda} />)}
                              </div>
                              <div className="p-3">
                                <p className="font-bold text-sm leading-snug line-clamp-2" style={{ color: t.ink }}>{r.name}</p>
                                <p className="text-xs mt-0.5" style={{ color: t.sub }}>{r.category}</p>
                              </div>
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setEditingRecipe(r) }}
                              className="absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-black"
                              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
                              title="Editar"
                            >✎</button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Banda lateral — solo en el detalle del platillo */}
          {selected && (
            <div className="hidden sm:flex shrink-0 w-[72px] items-start justify-center pt-9" style={{ background: guinda }}>
              <div className="flex gap-7 text-white tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                <span className="text-2xl font-bold">{selected.category}</span>
                <span className="text-lg font-medium opacity-90">Recetario</span>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
      {editingRecipe && (
        <EditRecipeModal
          recipe={editingRecipe}
          guinda={guinda}
          t={t}
          onClose={() => setEditingRecipe(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
