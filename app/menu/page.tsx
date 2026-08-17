'use client'

// Menú público con carrito y seguimiento de pedidos en tiempo real (polling cada 5 s,
// pausado cuando la pestaña está oculta). Branding, carrusel y colores vienen de /api/settings.
// Los pedidos entregados se eliminan del localStorage automáticamente tras 30 s.
import { useState, useEffect, useRef } from 'react'
import { BrandLogo } from '@/app/components/BrandLogo'
import { useBrand } from '@/app/components/BrandProvider'

const FAVORITES_KEY = 'favorites'

interface MenuItem {
  id: string; name: string; description: string; price: number
  category: string; imageUrl?: string; available: boolean; likes: number
}

interface CartItem { item: MenuItem; qty: number; notes?: string }


type OrderType = 'restaurante' | 'domicilio'
type PayMethod = 'stripe' | 'transferencia' | 'efectivo'

interface Order {
  id: string; customerName: string; status: 'pending' | 'preparing' | 'ready' | 'delivered'
  items: { name: string; quantity: number; price: number }[]; total: number
}

const STATUS_MSG: Record<Order['status'], { text: string; sub: string; emoji: string }> = {
  pending:   { text: 'Pedido recibido',        sub: 'En espera de preparación', emoji: '⏳' },
  preparing: { text: '¡Lo están preparando!',  sub: 'Tu pedido está en cocina', emoji: '🍳' },
  ready:     { text: '¡Tu pedido está listo!', sub: 'Pasa a recogerlo',         emoji: '' },
  delivered: { text: 'Pedido entregado',        sub: '¡Buen provecho!',         emoji: '🎉' },
}

const STATUS_STEPS: { status: Order['status']; label: string }[] = [
  { status: 'pending', label: 'Recibido' },
  { status: 'preparing', label: 'Preparando' },
  { status: 'ready', label: 'Listo' },
  { status: 'delivered', label: 'Entregado' },
]

const MY_ORDERS_KEY = 'my_order_ids'
const ORDER_POLL_MS = 5000
const DELIVERED_VISIBLE_MS = 30000
const INPUT = 'w-full border border-white/20 rounded-2xl px-4 py-3 text-white bg-[#1a1a1a] placeholder-gray-500 focus:outline-none transition-colors'

// Texto negro o blanco según la luminancia del color de fondo, para que el contraste
// nunca se pierda sin importar qué color elijan en "Identidad del restaurante".
function contrastText(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#000' : '#fff'
}
// Versión atenuada del color de contraste, para textos secundarios (ej. "C/U").
// 85% de opacidad (no menos) para que siga siendo legible en texto pequeño.
function contrastTextSoft(hex: string): string {
  return contrastText(hex) === '#000' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)'
}

export default function MenuPage() {
  // Nombre/logo/colores ya disponibles sin fetch (layout → BrandProvider) —
  // se usan como último fallback antes de la marca genérica, para no
  // parpadear con el logo/color anteriores mientras el fetch de abajo
  // (más lento, trae también colores propios de /admin/menu) resuelve.
  const brand = useBrand()
  const [items, setItems] = useState<MenuItem[]>([])
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [menuLogo, setMenuLogo] = useState('')
  const [logoColor, setLogoColor] = useState('')
  const [logoSize, setLogoSize] = useState(120)
  const [menuHover, setMenuHover] = useState('')
  const [profileLogo, setProfileLogo] = useState('')
  const [sidebarAccent, setSidebarAccent] = useState('')
  const [menuBg, setMenuBg] = useState('')
  const [menuBtn, setMenuBtn] = useState('')
  const [menuAction, setMenuAction] = useState('')
  const [brandLoaded, setBrandLoaded] = useState(false)
  const [businessWa, setBusinessWa] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [carousel, setCarousel] = useState<{ imageUrl: string; linkUrl: string }[]>([])
  const [slide, setSlide] = useState(0)
  const [myOrders, setMyOrders] = useState<Order[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deliveredCleanupRef = useRef<Set<string>>(new Set())

  const [favorites, setFavorites] = useState<string[]>([])
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [openItem, setOpenItem] = useState<string | null>(null)

  const [cart, setCart] = useState<CartItem[]>([])
  const [showOrder, setShowOrder] = useState(false)
  const [orderType, setOrderType] = useState<OrderType | null>(null)
  const [orderName, setOrderName] = useState('')
  const [orderPhone, setOrderPhone] = useState('')
  const [orderTable, setOrderTable] = useState('')
  const [orderAddress, setOrderAddress] = useState('')
  const [payMethod, setPayMethod] = useState<PayMethod | null>(null)
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  function getStoredOrderIds(): string[] {
    try {
      return JSON.parse(localStorage.getItem(MY_ORDERS_KEY) ?? '[]')
    } catch {
      return []
    }
  }

  function setStoredOrderIds(ids: string[]) {
    localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(ids))
  }

  function stopOrderPolling() {
    if (!pollRef.current) return
    clearInterval(pollRef.current)
    pollRef.current = null
  }

  function startOrderPolling() {
    if (pollRef.current) return
    pollRef.current = setInterval(() => {
      if (!document.hidden) pollMyOrders()
    }, ORDER_POLL_MS)
  }

  async function pollMyOrders() {
    const ids = getStoredOrderIds()
    if (ids.length === 0) {
      setMyOrders([])
      stopOrderPolling()
      return
    }

    try {
      const res = await fetch('/api/orders')
      if (!res.ok) return

      const all: Order[] = await res.json()
      const mine = all.filter(o => ids.includes(o.id))
      const deliveredIds = mine.filter(o => o.status === 'delivered').map(o => o.id)
      const active = mine.filter(o => o.status !== 'delivered')

      setMyOrders(mine)

      if (deliveredIds.length > 0) {
        const idsToClean = deliveredIds.filter(id => !deliveredCleanupRef.current.has(id))
        idsToClean.forEach(id => deliveredCleanupRef.current.add(id))

        if (idsToClean.length > 0) {
          setTimeout(() => {
            const latestIds = getStoredOrderIds()
            const remaining = latestIds.filter(id => !idsToClean.includes(id))
            setStoredOrderIds(remaining)
            setMyOrders(prev => prev.filter(order => !idsToClean.includes(order.id)))
            idsToClean.forEach(id => deliveredCleanupRef.current.delete(id))
            if (remaining.length === 0) stopOrderPolling()
          }, DELIVERED_VISIBLE_MS)
        }
      }

      if (active.length > 0) {
        startOrderPolling()
      } else {
        stopOrderPolling()
      }
    } catch {}
  }

  useEffect(() => {
    if (true) {
      queueMicrotask(() => setFavorites(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')))
    }
    fetch('/api/menu').then(r => r.ok ? r.json() : []).then((d: MenuItem[]) => {
      setItems(d)
      setLoadingMenu(false)
      // Los desplegables arrancan cerrados (openCategory se queda en null)
    }).catch(() => setLoadingMenu(false))
    pollMyOrders()
    if (getStoredOrderIds().length > 0) startOrderPolling()

    const handleVisibility = () => {
      if (document.hidden) {
        stopOrderPolling()
      } else {
        pollMyOrders()
        if (getStoredOrderIds().length > 0) startOrderPolling()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      stopOrderPolling()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Logo, color de hover, fondo y botones inactivos configurables desde /admin/menu
  useEffect(() => {
    const get = (k: string) => fetch(`/api/settings?key=${k}`).then(r => r.json()).catch(() => ({}))
    Promise.all([get('menu_logo'), get('menu_logo_color'), get('menu_logo_size'), get('menu_hover_color'), get('menu_bg_color'), get('menu_btn_color'), get('menu_action_color'), get('menu_carousel'), get('business_wa'), get('restaurant_name'), get('profile_logo'), get('sidebar_accent')])
      .then(([l, lc, size, h, bg, btn, action, car, wa, name, pLogo, sAccent]) => {
        setMenuLogo(l?.value || ''); setLogoColor(lc?.value || ''); setMenuHover(h?.value || '')
        setMenuBg(bg?.value || ''); setMenuBtn(btn?.value || '')
        setMenuAction(action?.value || '')
        setBusinessWa(wa?.value || ''); setRestaurantName(name?.value || '')
        setProfileLogo(pLogo?.value || ''); setSidebarAccent(sAccent?.value || '')
        if (size?.value) setLogoSize(Number(size.value) || 120)
        if (car?.value) { try { setCarousel(JSON.parse(car.value)) } catch {} }
        setBrandLoaded(true)
      })
  }, [])

  // Auto-rotación del carrusel
  useEffect(() => {
    if (carousel.length <= 1) return
    const id = setInterval(() => setSlide(s => (s + 1) % carousel.length), 4000)
    return () => clearInterval(id)
  }, [carousel.length])

  function likeItem(item: MenuItem) {
    // Un solo voto por platillo: si ya votó, no hace nada
    if (favorites.includes(item.id)) return
    const next = [...favorites, item.id]
    setFavorites(next)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
    // Actualización optimista del contador en pantalla
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, likes: (i.likes ?? 0) + 1 } : i))
    fetch(`/api/menu/${item.id}/like`, { method: 'POST' }).catch(() => {})
  }

  function toggleCategory(cat: string) {
    setOpenCategory(prev => prev === cat ? null : cat)
    setOpenItem(null)
  }

  function toggleItem(id: string) {
    setOpenItem(prev => prev === id ? null : id)
  }

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const i = prev.findIndex(c => c.item.id === item.id)
      if (i >= 0) return prev.map((c, idx) => idx === i ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { item, qty: 1 }]
    })
  }

  function changeQty(itemId: string, delta: number) {
    setCart(prev => prev.map(c => c.item.id === itemId ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0))
  }

  function setItemNotes(itemId: string, notes: string) {
    setCart(prev => prev.map(c => c.item.id === itemId ? { ...c, notes } : c))
  }

  function resetOrderForm() {
    setShowOrder(false)
    setOrderType(null)
    setOrderName('')
    setOrderPhone('')
    setOrderTable('')
    setOrderAddress('')
    setPayMethod(null)
  }

  const cartTotal = cart.reduce((s, c) => s + c.item.price * c.qty, 0)
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)

  // ¿Puede confirmarse el pedido según el tipo y los campos llenados?
  const canSubmit =
    !!orderType && !!orderName.trim() &&
    (orderType === 'restaurante' || (!!orderPhone.trim() && !!orderAddress.trim() && !!payMethod))

  const PAY_LABEL: Record<PayMethod, string> = { stripe: 'Stripe (pendiente de cobro)', transferencia: 'Transferencia', efectivo: 'Efectivo' }

  // Resumen del pedido que se guarda en el campo `notes` (la tabla no tiene
  // columnas para tipo/domicilio/pago/teléfono, así que se codifican aquí).
  function buildOrderNotes(): string {
    const lines: string[] = []
    if (orderPhone.trim()) lines.push(`Tel: ${orderPhone.trim()}`)
    if (orderType === 'restaurante') {
      lines.push('🍽 En restaurante')
    } else if (orderType === 'domicilio') {
      lines.push('🛵 A domicilio')
      if (orderAddress.trim()) lines.push(`Domicilio: ${orderAddress.trim()}`)
      if (payMethod) lines.push(`Pago: ${PAY_LABEL[payMethod]}`)
    }
    return lines.join('\n')
  }

  // Mensaje pre-llenado que el cliente envía por WhatsApp al negocio (business_wa).
  // Es solo una solicitud: el pedido queda "pending" en el sistema hasta que el
  // restaurante confirme disponibilidad/costo por ese mismo chat.
  function buildWhatsappMessage(): string {
    const lines: string[] = []
    lines.push(`🔔 Nuevo pedido — ${restaurantName || 'tu pedido'}`, '')
    lines.push('Cliente:', orderName.trim())
    if (orderPhone.trim()) lines.push(`Teléfono: ${orderPhone.trim()}`)
    lines.push('')
    lines.push('Productos:')
    for (const c of cart) lines.push(`* ${c.qty}x ${c.item.name} — $${(c.item.price * c.qty).toFixed(2)}`)
    lines.push('', `Subtotal: $${cartTotal.toFixed(2)}`, `Total: $${cartTotal.toFixed(2)}`, '')
    lines.push('Entrega:')
    lines.push(orderType === 'domicilio' ? `A domicilio: ${orderAddress.trim()}` : 'Recoger en establecimiento')
    lines.push('', 'Forma de pago:')
    lines.push(orderType === 'domicilio' && payMethod ? PAY_LABEL[payMethod] : 'Efectivo (en establecimiento)')
    lines.push('', 'Nota: Entiendo que este mensaje es únicamente una solicitud de pedido. Esperaré la confirmación de disponibilidad, costo de envío (si aplica) y aceptación por parte del establecimiento antes de considerar mi pedido como confirmado.')
    return lines.join('\n')
  }

  async function submitOrder() {
    if (!canSubmit) return

    setOrderSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: orderName.trim(),
          tableNumber: orderType === 'restaurante' ? (orderTable.trim() || undefined) : undefined,
          items: cart.map(c => ({
            menuItemId: c.item.id,
            name: c.item.name,
            quantity: c.qty,
            price: c.item.price,
            notes: c.notes?.trim() || undefined,
          })),
          total: cartTotal,
          notes: buildOrderNotes() || undefined,
        }),
      })
      if (res.ok) {
        const order: Order = await res.json()

        const ids = getStoredOrderIds()
        setStoredOrderIds([...ids, order.id])
        setMyOrders(prev => [...prev, order])
        startOrderPolling()
        if (businessWa.trim()) {
          const waUrl = `https://wa.me/${businessWa.replace(/\D/g, '')}?text=${encodeURIComponent(buildWhatsappMessage())}`
          window.open(waUrl, '_blank')
        }
        setCart([])
        resetOrderForm()
        setOrderSuccess(true)
        setTimeout(() => setOrderSuccess(false), 5000)
      }
    } finally {
      setOrderSubmitting(false)
    }
  }

  const grouped: Record<string, MenuItem[]> = {}
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  }
  const categories = Object.keys(grouped)

  const logo = menuLogo || profileLogo || brand.logo || '/logo.png'
  const hoverColor = menuHover || sidebarAccent || brand.accent || '#B90F45'
  const bgColor = menuBg || brand.logoBg || '#ffffff'
  const btnColor = menuBtn || '#0d0d0d'
  // Cuarto color, solo para los controles de pedido (carrito flotante,
  // "Agregar al Pedido", botones +/-) — si no está configurado, cae al acento.
  const actionColor = menuAction || hoverColor
  // Texto negro o blanco calculado según cada color de fondo configurable,
  // para que el contraste nunca se pierda sin importar qué color elijan.
  const btnText = contrastText(btnColor)
  const btnTextSoft = contrastTextSoft(btnColor)
  const hoverText = contrastText(hoverColor)
  const actionText = contrastText(actionColor)

  function ItemDetail({ item }: { item: MenuItem }) {
    const inCart = cart.find(c => c.item.id === item.id)
    return (
      <div style={{ backgroundColor: btnColor }}>
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.name}
            className="w-full object-cover block"
            style={{ height: '220px' }} />
        )}
        <div className="flex justify-between items-center px-4 py-3">
          <span className="text-sm" style={{ color: btnTextSoft }}>C/U</span>
          <span className="font-bold text-xl" style={{ color: btnText }}>${item.price.toFixed(2)}</span>
        </div>
        {inCart ? (
          <div className="flex items-center justify-center gap-3 pb-3">
            <button type="button" onClick={() => changeQty(item.id, -1)}
              className="font-black text-lg w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: '#1a1a1a', border: `1px solid ${actionColor}`, color: '#fff' }}>−</button>
            <span className="font-bold w-6 text-center" style={{ color: btnText }}>{inCart.qty}</span>
            <button type="button" onClick={() => changeQty(item.id, 1)}
              className="font-black text-lg w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: actionColor, color: actionText }}>+</button>
          </div>
        ) : (
          <button type="button" onClick={() => addToCart(item)}
            className="w-full font-bold py-3 transition-colors"
            style={{ backgroundColor: actionColor, color: actionText }}>
            Agregar al Pedido
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: bgColor }}>

      {/* Toast pedido enviado */}
      {orderSuccess && (
        <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="font-bold px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-2"
            style={{ backgroundColor: hoverColor, color: hoverText }}>
             ¡Pedido enviado! Lo prepararemos pronto.
          </div>
        </div>
      )}

      {/* Banners de estado de pedidos */}
      {myOrders.length > 0 && (
        <div className="px-4 pt-3 space-y-3" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {myOrders.map(order => {
            const s = STATUS_MSG[order.status]
            const currentStep = STATUS_STEPS.findIndex(step => step.status === order.status)
            return (
              <div key={order.id} className="rounded-xl px-4 py-4">
                <div className="mb-4 flex items-start gap-3">
                  <BrandLogo src={logo} color={logoColor} className="mt-0.5 h-7 w-7 shrink-0 object-contain" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white">{s.text}</p>
                    <p className="text-xs text-white/60">{s.sub} · {order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-start gap-1">
                  {STATUS_STEPS.map((step, index) => {
                    const isDone = index <= currentStep
                    const isCurrent = index === currentStep

                    return (
                      <div key={step.status} className="relative flex flex-col items-center text-center">
                        {index > 0 && (
                          <span
                            className="absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2"
                            style={{ backgroundColor: index <= currentStep ? hoverColor : 'rgba(255,255,255,0.16)' }}
                          />
                        )}
                        <span
                          className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-black"
                          style={{
                            backgroundColor: isDone ? hoverColor : '#171717',
                            borderColor: isDone ? hoverColor : 'rgba(255,255,255,0.24)',
                            color: isDone ? '#fff' : '#9ca3af',
                            boxShadow: isCurrent ? `0 0 0 4px color-mix(in srgb, ${hoverColor} 22%, transparent)` : 'none',
                          }}
                        >
                          {isDone ? '✔' : index + 1}
                        </span>
                        <span
                          className="mt-2 text-[11px] font-bold leading-tight"
                          style={{ color: isDone ? '#fff' : '#6b7280' }}
                        >
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Logo — se oculta hasta que carga la marca real, para no parpadear con el logo/color anteriores */}
      <div className="py-24 flex items-center justify-center relative" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* El span enmascarado no tiene tamaño intrínseco como un <img> — al recolorear
            se le da un cuadro de logoSize×logoSize; "contain" evita que se deforme. */}
        {brandLoaded && (
          <BrandLogo src={logo} color={logoColor} alt="Logo" className="mx-auto block"
            style={logoColor ? { width: `${logoSize}px`, height: `${logoSize}px` } : { maxWidth: `${logoSize}px` }} />
        )}
      </div>

      {/* Carrusel 16:12 */}
      {carousel.length > 0 && (
        <div className="w-full">
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 6', backgroundColor: '#0d0d0d' }}>
            {carousel.map((s, i) => {
              const img = <img src={s.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              return (
                <div key={i} className="absolute inset-0 transition-opacity duration-700"
                  style={{ opacity: i === slide ? 1 : 0, pointerEvents: i === slide ? 'auto' : 'none' }}>
                  {s.linkUrl
                    ? <a href={s.linkUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">{img}</a>
                    : img}
                </div>
              )
            })}
            {carousel.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {carousel.map((_, i) => (
                  <button key={i} type="button" onClick={() => setSlide(i)}
                    className="w-2 h-2 rounded-full transition-colors"
                    style={{ backgroundColor: i === slide ? '#fff' : 'rgba(255,255,255,0.45)' }}
                    aria-label={`Imagen ${i + 1}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Menú acordeón */}
      <div className="mx-auto" style={{ maxWidth: '800px' }}>
        {loadingMenu ? (
          <div className="space-y-px">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-11 animate-pulse" style={{ backgroundColor: '#0d0d0d' }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-5xl mb-3">🍽</p>
            <p className="font-semibold text-lg text-white">El menú aún no está disponible</p>
          </div>
        ) : (
          <>
            {categories.map(category => {
              const catItems = grouped[category]
              const isOpen = openCategory === category
              // Cuando otra categoría está abierta, ocultar esta
              if (openCategory !== null && !isOpen) return null

              const catText = isOpen ? hoverText : btnText
              return (
                <div key={category}>
                  <button type="button" onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-3 py-3 font-bold text-base"
                    style={{ backgroundColor: isOpen ? hoverColor : btnColor, color: catText }}>
                    <span>{category}</span>
                    <svg className="shrink-0 mr-10" width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke={catText} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points={isOpen ? '6 15 12 9 18 15' : '6 9 12 15 18 9'} />
                    </svg>
                  </button>

                  {isOpen && (
                    <div style={{ backgroundColor: '#0d0d0d' }}>
                      {catItems.map(item => {
                        const isItemOpen = openItem === item.id
                        const isFav = favorites.includes(item.id)
                        const itemText = isItemOpen ? hoverText : btnText
                        return (
                          <div key={item.id} style={{ opacity: item.available ? 1 : 0.5 }}>
                            <button type="button"
                              onClick={() => item.available && toggleItem(item.id)}
                              className="w-full flex items-center py-3 px-4"
                              style={{
                                backgroundColor: isItemOpen ? hoverColor : btnColor,
                                color: itemText,
                                cursor: item.available ? 'pointer' : 'not-allowed',
                              }}>
                              {/* Nombre */}
                              <span className="flex-1 text-left">
                                {item.name}
                                {!item.available && <span className="ml-1 text-xs text-red-300">(Agotado)</span>}
                              </span>
                              {/* Me encanta: ícono plano + contador (un voto por platillo) */}
                              {true && (
                                <span
                                  role="button"
                                  aria-label="Me encanta"
                                  onClick={e => { e.stopPropagation(); likeItem(item) }}
                                  className="flex items-center gap-1 mx-3 shrink-0"
                                  style={{ cursor: isFav ? 'default' : 'pointer' }}>
                                  <svg viewBox="0 0 24 24" width="18" height="18"
                                    fill={isFav ? itemText : 'none'}
                                    stroke={itemText} strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round"
                                    style={{ opacity: isFav ? 1 : 0.45 }}>
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                  </svg>
                                  <span className="text-xs font-bold tabular-nums"
                                    style={{ color: itemText, opacity: 0.8, minWidth: '12px' }}>
                                    {item.likes ?? 0}
                                  </span>
                                </span>
                              )}
                              <svg className="shrink-0 mr-14" width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke={itemText} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points={isItemOpen ? '6 15 12 9 18 15' : '6 9 12 15 18 9'} />
                              </svg>
                            </button>
                            {isItemOpen && <ItemDetail item={item} />}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Botón flotante del carrito */}
      <style>{`
        @keyframes cart-expand {
          from { transform: scale(0.88) translateY(6px); opacity: 0; }
          to   { transform: scale(1)    translateY(0);   opacity: 1; }
        }
      `}</style>
      {cartCount > 0 && (
        <div className="fixed z-40 left-4 right-4" style={{ bottom: '20px' }}>
          <button type="button" onClick={() => setShowOrder(true)}
            aria-label={`Ver carrito (${cartCount} artículo${cartCount > 1 ? 's' : ''})`}
            className="w-full flex items-center rounded-2xl shadow-2xl active:scale-[0.97] transition-transform"
            style={{ backgroundColor: actionColor, height: '58px', animation: 'cart-expand 0.22s ease-out', color: actionText }}>
            <span className="flex items-center justify-center rounded-xl font-black text-sm ml-3 shrink-0"
              style={{ width: '36px', height: '36px', backgroundColor: 'rgba(0,0,0,0.22)', fontSize: '15px', color: '#fff' }}>
              {cartCount}
            </span>
            <span className="flex-1 text-center font-black text-base">Realizar pedido</span>
            <span className="font-black text-sm mr-4 shrink-0">
              ${cartTotal.toFixed(2)} <span style={{ opacity: 0.7 }}>MXN</span>
            </span>
          </button>
        </div>
      )}

      {/* Modal del pedido â€” baja desde arriba para no quedar tapado por el nav */}
      {showOrder && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-start justify-center backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-b-3xl p-6 pt-5 pb-8 space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: btnColor }}>
            <div className="flex justify-center">
              <BrandLogo src={logo} color={logoColor} style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
            </div>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black" style={{ color: btnText }}>Tu pedido</h2>
              <button type="button" onClick={resetOrderForm}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: '#1a1a1a' }}>×</button>
            </div>

            {/* Items con notas por platillo */}
            <div className="space-y-3">
              {cart.map(c => (
                <div key={c.item.id} className="py-2 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: btnText }}>{c.item.name}</p>
                      <p className="text-xs" style={{ color: btnTextSoft }}>${c.item.price.toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={() => changeQty(c.item.id, -1)}
                        className="w-8 h-8 rounded-full font-bold text-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: '#1a1a1a', border: `1px solid ${actionColor}` }}>−</button>
                      <span className="font-black w-4 text-center text-sm" style={{ color: btnText }}>{c.qty}</span>
                      <button type="button" onClick={() => changeQty(c.item.id, 1)}
                        className="w-8 h-8 rounded-full font-bold text-lg flex items-center justify-center"
                        style={{ backgroundColor: actionColor, color: actionText }}>+</button>
                    </div>
                    <span className="text-sm font-black w-14 text-right shrink-0" style={{ color: btnText }}>
                      ${(c.item.price * c.qty).toFixed(2)}
                    </span>
                  </div>
                  <input type="text" id={`item-notes-${c.item.id}`} name={`item_notes_${c.item.id}`}
                    value={c.notes ?? ''}
                    onChange={e => setItemNotes(c.item.id, e.target.value)}
                    placeholder="Nota para este platillo (sin cebolla, término...)"
                    className="w-full border border-white/20 rounded-xl px-3 py-2 text-xs text-white bg-[#1a1a1a] placeholder-gray-500 focus:outline-none transition-colors" />
                </div>
              ))}
            </div>

            <div className="rounded-2xl px-4 py-3 flex justify-between font-black text-white text-lg"
              style={{ backgroundColor: '#1a1a1a' }}>
              <span>Total</span><span>${cartTotal.toFixed(2)}</span>
            </div>

            {/* Selector de tipo de pedido */}
            <div className="grid grid-cols-2 gap-3">
              {([
                {
                  type: 'restaurante' as OrderType, label: 'En restaurante',
                  // Cubiertos (tenedor + cuchillo)
                  icon: <path d="M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2M5 2v9M5 11v11M16 2v20M16 13h3a1 1 0 0 0 1-1c0-5-2-10-4-10" />,
                },
                {
                  type: 'domicilio' as OrderType, label: 'A domicilio',
                  // Motoneta / scooter
                  icon: (
                    <>
                      <circle cx="6" cy="18" r="2.5" />
                      <circle cx="18" cy="18" r="2.5" />
                      <path d="M8.5 18h6.5l2-9h-2.5" />
                      <path d="M13 9h3" />
                      <path d="M17 9l1 6.5" />
                      <path d="M4 12h2.5a3.5 3.5 0 0 1 3.5 3.5v.5" />
                    </>
                  ),
                },
              ]).map(opt => {
                const active = orderType === opt.type
                const optText = active ? hoverText : btnText
                return (
                  <button key={opt.type} type="button" onClick={() => setOrderType(opt.type)}
                    className="rounded-2xl py-4 px-3 font-black text-sm transition-all flex flex-col items-center gap-1.5"
                    style={{
                      backgroundColor: active ? hoverColor : btnColor,
                      color: optText,
                      border: `1.5px solid ${active ? hoverColor : '#333'}`,
                    }}>
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none"
                      stroke={optText} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      {opt.icon}
                    </svg>
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {/* Campos según el tipo elegido */}
            {orderType === 'restaurante' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="order-name" className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: btnTextSoft }}>Tu nombre *</label>
                  <input id="order-name" name="order_name" type="text" value={orderName} onChange={e => setOrderName(e.target.value)}
                    placeholder="Ej. María" autoComplete="name" className={INPUT} />
                </div>
                <div>
                  <label htmlFor="order-table" className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: btnTextSoft }}>Mesa (opcional)</label>
                  <input id="order-table" name="order_table" type="text" value={orderTable} onChange={e => setOrderTable(e.target.value)}
                    placeholder="Ej. 3" className={INPUT} />
                </div>
              </div>
            )}

            {orderType === 'domicilio' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="order-name-dom" className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: btnTextSoft }}>Tu nombre *</label>
                  <input id="order-name-dom" name="order_name" type="text" value={orderName} onChange={e => setOrderName(e.target.value)}
                    placeholder="Ej. María" autoComplete="name" className={INPUT} />
                </div>
                <div>
                  <label htmlFor="order-phone-dom" className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: btnTextSoft }}>Teléfono *</label>
                  <input id="order-phone-dom" name="order_phone" type="tel" value={orderPhone} onChange={e => setOrderPhone(e.target.value)}
                    placeholder="Ej. 6641234567" autoComplete="tel" className={INPUT} />
                </div>
                <div>
                  <label htmlFor="order-address" className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: btnTextSoft }}>Domicilio *</label>
                  <input id="order-address" name="order_address" type="text" value={orderAddress} onChange={e => setOrderAddress(e.target.value)}
                    placeholder="Calle, número, colonia, referencias" autoComplete="street-address" className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: btnTextSoft }}>Forma de pago *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      {
                        method: 'stripe' as PayMethod, label: 'Stripe',
                        // Logo oficial de Stripe (no se duplica el texto)
                        icon: <img src="/stripe.svg" alt="Stripe" className="h-5 w-auto" style={{ filter: 'brightness(1.4)' }} />,
                        showLabel: false,
                      },
                      {
                        method: 'transferencia' as PayMethod, label: 'Transferencia',
                        icon: (active: boolean) => (
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                            stroke={active ? hoverText : btnText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 7h11M18 7l-3-3M18 7l-3 3" />
                            <path d="M17 17H6M6 17l3-3M6 17l3 3" />
                          </svg>
                        ),
                        showLabel: true,
                      },
                      {
                        method: 'efectivo' as PayMethod, label: 'Efectivo',
                        icon: (active: boolean) => (
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                            stroke={active ? hoverText : btnText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="6" width="20" height="12" rx="2.5" />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                        ),
                        showLabel: true,
                      },
                    ]).map(opt => {
                      const active = payMethod === opt.method
                      const optText = active ? hoverText : btnText
                      return (
                        <button key={opt.method} type="button" onClick={() => setPayMethod(opt.method)}
                          className="rounded-2xl py-3 px-2 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1"
                          style={{
                            backgroundColor: active ? hoverColor : btnColor,
                            color: optText,
                            border: `1.5px solid ${active ? hoverColor : '#333'}`,
                          }}>
                          {typeof opt.icon === 'function' ? opt.icon(active) : opt.icon}{opt.showLabel && opt.label}
                        </button>
                      )
                    })}
                  </div>
                  {payMethod === 'stripe' && (
                    <p className="text-xs mt-1.5" style={{ color: '#777' }}>
                      💡 El cobro con Stripe se habilitará próximamente; por ahora se registra como pendiente.
                    </p>
                  )}
                </div>
              </div>
            )}

            {orderType && (
              <button type="button" onClick={submitOrder} disabled={orderSubmitting || !canSubmit}
                className="w-full font-black py-4 rounded-2xl text-base disabled:opacity-60 transition-colors"
                style={{ backgroundColor: actionColor, color: actionText }}>
                {orderSubmitting ? 'Enviando...' : 'Confirmar pedido'}
              </button>
            )}

            {!orderType && (
              <p className="text-center text-xs" style={{ color: '#777' }}>
                Elige cómo quieres tu pedido para continuar.
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
