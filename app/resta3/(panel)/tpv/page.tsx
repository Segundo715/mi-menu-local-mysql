'use client'

// TPV / Caja: carga platillos de /api/menu, envía órdenes a /api/orders con método de pago y mesa.
// El campo quantity (no qty) es requerido por el schema de ordersDb.
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Resta3Nav from '@/app/components/Resta3Nav'
import { useRightRail } from '@/app/components/RightRail'
import { Icon, type IconName } from '@/app/components/Icon'
import { useBrand } from '@/app/components/BrandProvider'

const S = { bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)', text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)' }

interface MenuItem { id: string; name: string; category: string; price: number; imageUrl?: string; available: boolean }
interface LineItem { item: MenuItem; qty: number; note?: string }
interface Order { id: string; customerName: string; tableNumber?: string; status: string; total: number; notes?: string; createdAt: string; items: { name: string; quantity: number; price: number }[] }

const CATS = ['Todos', 'Platillos', 'Bebidas', 'Postres', 'Ensaladas', 'Entradas', 'Especiales']
const PAYMENT_METHODS: { id: string; label: string; icon: IconName }[] = [
  { id: 'efectivo', label: 'Efectivo', icon: 'cash' },
  { id: 'tarjeta', label: 'Tarjeta', icon: 'card' },
  { id: 'transferencia', label: 'Transferencia', icon: 'phone' },
]
// Plataformas de domicilio. La key es el prefijo [KEY] en notes que cocina detecta.
const DELIVERY_PLATFORMS: { key: string; label: string; icon: IconName; color: string }[] = [
  { key: 'GOGO',     label: 'Gogo',      icon: 'heart', color: '#ff6b35' },
  { key: 'RAPPI',    label: 'Rappi',     icon: 'heart', color: '#ff441b' },
  { key: 'UBEREATS', label: 'Uber Eats', icon: 'heart', color: '#06c167' },
]

export default function TPVPage() {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<LineItem[]>([])
  const [cat, setCat] = useState('Todos')
  const [search, setSearch] = useState('')
  const [customer, setCustomer] = useState('')
  const [tableNum, setTableNum] = useState('')
  const [payment, setPayment] = useState('efectivo')
  const [saving, setSaving] = useState(false)
  const [lastOrder, setLastOrder] = useState<Order | null>(null)
  const [tab, setTab] = useState<'nueva' | 'historial'>('nueva')
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const { mount, setFilled, setTitle, setOpen } = useRightRail()
  const brand = useBrand()

  // Paso posterior al envío: clasificar el pedido como dentro del restaurante o a domicilio.
  const [postSend, setPostSend] = useState<'none' | 'choose' | 'domicilio'>('none')
  const [dName, setDName] = useState('')
  const [dAddress, setDAddress] = useState('')
  const [dReference, setDReference] = useState('')
  const [savingDelivery, setSavingDelivery] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [taxRate, setTaxRate] = useState(0)

  useEffect(() => {
    fetch('/api/menu').then(r => r.json()).then(d => setMenu(Array.isArray(d) ? d.filter((m: MenuItem) => m.available) : []))
  }, [])

  // La comanda llena el rail derecho solo en la pestaña "nueva".
  useEffect(() => {
    const fill = tab === 'nueva'
    setFilled(fill)
    if (fill) setTitle('Comanda')
    return () => setFilled(false)
  }, [tab, setFilled, setTitle])

  async function loadOrders() {
    setLoadingOrders(true)
    const r = await fetch('/api/orders')
    if (r.ok) setOrders(await r.json())
    setLoadingOrders(false)
  }

  useEffect(() => {
    if (tab === 'historial') queueMicrotask(loadOrders)
  }, [tab])

  const filtered = menu.filter(m => {
    const matchCat = cat === 'Todos' || m.category === cat
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  function addToCart(item: MenuItem) {
    setOpen(true) // en móvil abre el rail para ver la comanda
    setCart(c => {
      const ex = c.find(l => l.item.id === item.id)
      if (ex) return c.map(l => l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l)
      return [...c, { item, qty: 1 }]
    })
  }

  function changeQty(id: string, delta: number) {
    setCart(c => c.map(l => l.item.id === id ? { ...l, qty: l.qty + delta } : l).filter(l => l.qty > 0))
  }

  function changeNote(id: string, note: string) {
    setCart(c => c.map(l => l.item.id === id ? { ...l, note } : l))
  }

  function printTicket(source: 'cart' | Order = 'cart') {
    const restaurantName = brand.name || 'Restaurante'
    const isOrder = typeof source === 'object'
    const custName  = isOrder ? source.customerName : customer.trim() || '—'
    const tableLabel = isOrder ? (source.tableNumber || '') : tableNum.trim()
    const ticketTotal = isOrder ? source.total : finalTotal
    const chk = (m: string) => payment === m ? '☑' : '☐'
    const now = new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })

    const rows = isOrder
      ? source.items.map(i => `<div class="row"><span class="name">${i.quantity}x ${i.name}</span><span class="price">$${(i.price * i.quantity).toFixed(2)}</span></div>`)
      : cart.map(l => [
          `<div class="row"><span class="name">${l.qty}x ${l.item.name}</span><span class="price">$${(l.item.price * l.qty).toFixed(2)}</span></div>`,
          l.note?.trim() ? `<div class="note">↳ ${l.note.trim()}</div>` : '',
        ].join(''))

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:12px;width:76mm;margin:0 auto;padding:6px}
  .center{text-align:center}
  .bold{font-weight:700}
  .sep{border-top:1px dashed #000;margin:5px 0}
  .row{display:flex;justify-content:space-between;margin:2px 0}
  .name{flex:1;padding-right:6px}
  .price{white-space:nowrap}
  .note{font-size:10px;padding-left:10px;font-style:italic;margin-bottom:2px}
  .total{font-size:14px;font-weight:700}
</style></head><body>
  <div class="center bold" style="font-size:15px">${restaurantName}</div>
  <div class="center">Ticket de venta</div>
  <div class="center">${now}</div>
  <div class="sep"></div>
  <div>Cliente: <b>${custName}</b></div>
  ${tableLabel ? `<div>Mesa: ${tableLabel}</div>` : ''}
  <div class="sep"></div>
  ${rows.join('')}
  <div class="sep"></div>
  <div class="row total"><span>TOTAL</span><span>$${ticketTotal.toFixed(2)}</span></div>
  <div class="sep"></div>
  <div style="margin:3px 0"><b>Método de pago:</b></div>
  <div>${chk('efectivo')} Efectivo &nbsp;&nbsp; ${chk('tarjeta')} Tarjeta &nbsp;&nbsp; ${chk('transferencia')} Transferencia</div>
  <div class="sep"></div>
  <div class="center">¡Gracias por su preferencia!</div>
</body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const win  = window.open(url, '_blank', 'width=420,height=600')
    if (!win) return
    win.focus()
    setTimeout(() => { win.print(); URL.revokeObjectURL(url) }, 300)
  }

  const cartSubtotal = cart.reduce((s, l) => s + l.item.price * l.qty, 0)
  const discountAmt = Math.min(discount, cartSubtotal)
  const taxAmt = (cartSubtotal - discountAmt) * taxRate / 100
  const finalTotal = cartSubtotal - discountAmt + taxAmt
  const canOrder = cart.length > 0

  async function placeOrder() {
    if (!canOrder) return
    setSaving(true)
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: customer.trim() || 'Cliente',
        tableNumber: tableNum.trim() || undefined,
        items: cart.map(l => ({ menuItemId: l.item.id, name: l.item.name, price: l.item.price, quantity: l.qty, note: l.note?.trim() || undefined })),
        total: finalTotal,
        notes: `[${payment.toUpperCase()}]`,
      }),
    })
    if (res.ok) {
      const order = await res.json()
      setLastOrder(order)
      setPostSend('choose')
      setCart([]); setCustomer(''); setTableNum(''); setDiscount(0); setTaxRate(0)
    }
    setSaving(false)
  }

  // Clasifica el pedido recién enviado como a domicilio por una plataforma: marca notes
  // con [GOGO]/[RAPPI]/[UBEREATS] (lo que cocina detecta) + domicilio/referencias, y limpia la mesa.
  async function saveDelivery(platform: string) {
    if (!lastOrder) return
    setSavingDelivery(true)
    const parts = [`Pago: ${payment.toUpperCase()}`]
    if (dAddress.trim())   parts.push(`Dom: ${dAddress.trim()}`)
    if (dReference.trim()) parts.push(`Ref: ${dReference.trim()}`)
    const res = await fetch(`/api/orders/${lastOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: `[${platform}] ${parts.join(' · ')}`,
        tableNumber: '',
        customerName: dName.trim() || lastOrder.customerName,
      }),
    })
    setSavingDelivery(false)
    if (res.ok) {
      setPostSend('none')
      setLastOrder(null)
      setDName(''); setDAddress(''); setDReference('')
    }
  }

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }

  const statusColor: Record<string, string> = { pending: '#f59e0b', preparing: '#3b82f6', ready: '#22c55e', enviado: '#0ea5e9', delivered: '#64748b' }
  const statusLabel: Record<string, string> = { pending: 'Pendiente', preparing: 'En cocina', ready: 'Listo', enviado: 'Enviado', delivered: 'Entregado' }

  return (
    <div className="h-screen overflow-hidden md:ml-[240px] flex flex-col" style={{ backgroundColor: S.bg }}>
      <Resta3Nav />
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-[1300px] mx-auto p-4">

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['nueva', 'historial'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all"
              style={tab === t ? { backgroundColor: S.accent, color: '#fff' } : { backgroundColor: S.card, color: S.sub, border: `1px solid ${S.border}` }}>
              <span className="inline-flex items-center gap-1.5">{t === 'nueva' ? <><Icon name="receipt" size={15} /> Nueva orden</> : <><Icon name="clipboard" size={15} /> Historial</>}</span>
            </button>
          ))}
        </div>

        {tab === 'historial' ? (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            {loadingOrders ? (
              <div className="p-8 text-center text-sm" style={{ color: S.sub }}>Cargando...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: S.sub }}>Sin órdenes</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                    {['Cliente', 'Mesa', 'Total', 'Pago', 'Estado', 'Hora'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: S.sub }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    // Domicilios llevan [DOMICILIO] como prefijo y el pago real en "Pago: X".
                    const payNote = o.notes?.match(/Pago:\s*(\w+)/i)?.[1] ?? o.notes?.match(/\[(\w+)\]/)?.[1] ?? '—'
                    return (
                      <tr key={o.id} style={{ borderBottom: `1px solid ${S.border}` }} className="hover:bg-white/[.02]">
                        <td className="px-4 py-3 font-bold" style={{ color: S.text }}>{o.customerName}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: S.sub }}>{o.tableNumber ?? '—'}</td>
                        <td className="px-4 py-3 font-black" style={{ color: S.accent }}>${o.total.toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: S.sub }}>{payNote}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${statusColor[o.status] ?? '#64748b'}18`, color: statusColor[o.status] ?? '#64748b' }}>
                            {statusLabel[o.status] ?? o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: S.sub }}>{fmtTime(o.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <>
            {/* Catálogo (ancho completo — la comanda vive en el rail derecho) */}
            <div className="space-y-3">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar platillo..."
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }} />
              <div className="flex gap-2 flex-wrap">
                {CATS.map(c => (
                  <button key={c} onClick={() => setCat(c)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={cat === c ? { backgroundColor: S.accent, color: '#fff' } : { backgroundColor: S.card, color: S.sub, border: `1px solid ${S.border}` }}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map(item => (
                  <button key={item.id} onClick={() => addToCart(item)}
                    className="text-left rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-95 relative"
                    style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} className="w-full object-cover" style={{ height: '140px' }} />
                      : <div className="w-full flex items-center justify-center" style={{ height: '140px', backgroundColor: 'var(--ad-elevated)', color: S.sub }}><Icon name="utensils" size={40} /></div>
                    }
                    <div className="p-3">
                      <p className="text-sm font-bold leading-tight line-clamp-2" style={{ color: S.text }}>{item.name}</p>
                      <p className="text-lg font-black mt-1" style={{ color: S.accent }}>${item.price.toFixed(2)}</p>
                    </div>
                    <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-lg font-black shadow-lg"
                      style={{ backgroundColor: S.accent, color: '#000' }}>+</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Comanda — portada al rail derecho fijo del layout */}
            {mount && createPortal(
              <div className="flex flex-col h-full">
                {/* FIJO TOP: inputs + limpiar + cabeceras */}
                <div className="px-4 pt-4 pb-2 space-y-2 shrink-0" style={{ borderBottom: `1px solid ${S.border}` }}>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Cliente</label>
                      <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Nombre"
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ backgroundColor: 'var(--ad-elevated)', color: S.text, border: `1px solid ${S.border}` }} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}>Mesa</label>
                      <input value={tableNum} onChange={e => setTableNum(e.target.value)} placeholder="Ej: Mesa 3"
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ backgroundColor: 'var(--ad-elevated)', color: S.text, border: `1px solid ${S.border}` }} />
                    </div>
                  </div>
                  {cart.length > 0 && (
                    <div className="flex justify-end">
                      <button onClick={() => { setCart([]); setDiscount(0); setTaxRate(0) }} className="text-xs font-bold px-2 py-1 rounded-lg"
                        style={{ color: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)' }}>Limpiar comanda</button>
                    </div>
                  )}
                  {cart.length > 0 && (
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1 pt-1 pb-0 text-[10px] font-bold uppercase tracking-wide"
                      style={{ color: S.sub }}>
                      <span>Producto</span><span className="text-right">Cant.</span>
                      <span className="text-right">P/U</span><span className="text-right">Total</span>
                    </div>
                  )}
                </div>

                {/* SCROLLABLE: solo la lista de ítems */}
                <div className="flex-1 min-h-0 overflow-y-auto px-4">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center py-6 gap-2">
                      <span style={{ color: S.sub }}><Icon name="cart" size={32} /></span>
                      <p className="text-sm" style={{ color: S.sub }}>Toca un platillo</p>
                    </div>
                  ) : (
                    <div className="space-y-0 divide-y" style={{ borderColor: S.border }}>
                      {cart.map(line => (
                        <div key={line.item.id} className="py-3 space-y-2">
                          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1 items-center">
                            <p className="text-sm font-bold truncate" style={{ color: S.text }}>{line.item.name}</p>
                            <span className="text-sm font-black text-right" style={{ color: S.text }}>{line.qty}</span>
                            <span className="text-xs text-right" style={{ color: S.sub }}>${line.item.price.toFixed(2)}</span>
                            <span className="text-sm font-black text-right" style={{ color: S.accent }}>${(line.item.price * line.qty).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => changeQty(line.item.id, -1)}
                              className="w-9 h-9 rounded-full text-base font-black flex items-center justify-center"
                              style={{ backgroundColor: 'var(--ad-elevated)', color: S.sub, border: `1px solid ${S.border}` }}>−</button>
                            <span className="text-base font-black w-6 text-center" style={{ color: S.text }}>{line.qty}</span>
                            <button onClick={() => changeQty(line.item.id, 1)}
                              className="w-9 h-9 rounded-full text-base font-black flex items-center justify-center"
                              style={{ backgroundColor: 'var(--ad-elevated)', color: S.accent, border: `1px solid ${S.border}` }}>+</button>
                            <input
                              type="text"
                              value={line.note ?? ''}
                              onChange={e => changeNote(line.item.id, e.target.value)}
                              placeholder="Nota..."
                              className="flex-1 rounded-lg px-2 py-1.5 text-xs outline-none"
                              style={{ backgroundColor: 'var(--ad-elevated)', color: S.text, border: `1px solid ${S.border}` }}
                            />
                            <button onClick={() => setCart(c => c.filter(l => l.item.id !== line.item.id))}
                              className="w-9 h-9 rounded-full text-sm font-black flex items-center justify-center shrink-0"
                              style={{ backgroundColor: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* FIJO BOTTOM: método de pago + resumen + botones */}
                <div className="shrink-0">
                  <div className="px-4 py-2" style={{ borderTop: `1px solid ${S.border}` }}>
                    <label className="block text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: S.sub }}>Método de pago</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {PAYMENT_METHODS.map(p => (
                        <button key={p.id} onClick={() => setPayment(p.id)}
                          className="py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs"
                          style={payment === p.id
                            ? { background: `linear-gradient(135deg,${S.accent}33,${S.accent}11)`, color: S.accent, border: `2px solid ${S.accent}`, boxShadow: `0 0 8px ${S.accent}33` }
                            : { backgroundColor: 'var(--ad-elevated)', color: S.sub, border: `1px solid ${S.border}` }}>
                          <Icon name={p.icon} size={16} />
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                <div style={{ borderTop: `1px solid ${S.border}` }}>
                  {lastOrder && postSend !== 'none' ? (
                    <div className="p-4 space-y-3">
                      <div className="rounded-xl px-3 py-3 space-y-2.5" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
                        <p className="font-black text-sm flex items-center gap-1.5" style={{ color: '#22c55e' }}><Icon name="checkCircle" size={15} /> Orden enviada a cocina</p>
                        <p className="text-xs" style={{ color: S.sub }}>#{lastOrder.id.slice(0, 8)} · ${lastOrder.total.toFixed(2)}</p>
                      </div>

                      {postSend === 'choose' && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold" style={{ color: S.text }}>¿Dónde se entrega?</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => { setPostSend('none'); setLastOrder(null) }}
                              className="py-4 rounded-2xl text-sm font-bold flex flex-col items-center gap-1.5 transition-all"
                              style={{ backgroundColor: 'var(--ad-elevated)', color: S.text, border: `1px solid ${S.border}` }}>
                              <Icon name="utensils" size={20} /> En el local
                            </button>
                            <button onClick={() => { setDName(lastOrder.customerName); setPostSend('domicilio') }}
                              className="py-4 rounded-2xl text-sm font-bold flex flex-col items-center gap-1.5 transition-all"
                              style={{ backgroundColor: 'rgba(14,165,233,0.12)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.4)' }}>
                              <Icon name="truck" size={20} /> A domicilio
                            </button>
                          </div>
                        </div>
                      )}

                      {postSend === 'domicilio' && (
                        <div className="space-y-2">
                          <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}><Icon name="user" size={13} /> Quien recibe</label>
                            <input value={dName} onChange={e => setDName(e.target.value)} placeholder="Nombre de quien recibe"
                              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                              style={{ backgroundColor: 'var(--ad-elevated)', color: S.text, border: `1px solid ${S.border}` }} />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}><Icon name="pin" size={13} /> Domicilio</label>
                            <input value={dAddress} onChange={e => setDAddress(e.target.value)} placeholder="Calle, número, colonia"
                              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                              style={{ backgroundColor: 'var(--ad-elevated)', color: S.text, border: `1px solid ${S.border}` }} />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: S.sub }}><Icon name="bookmark" size={13} /> Referencias</label>
                            <input value={dReference} onChange={e => setDReference(e.target.value)} placeholder="Entre calles, color de fachada..."
                              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                              style={{ backgroundColor: 'var(--ad-elevated)', color: S.text, border: `1px solid ${S.border}` }} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: S.sub }}>Plataforma</p>
                            <div className="grid grid-cols-3 gap-2">
                              {DELIVERY_PLATFORMS.map(p => (
                                <button key={p.key} onClick={() => saveDelivery(p.key)} disabled={savingDelivery}
                                  className="py-3 rounded-2xl text-xs font-black flex flex-col items-center gap-1 transition-all disabled:opacity-60"
                                  style={{ background: `linear-gradient(135deg,${p.color},${p.color}bb)`, color: '#fff' }}>
                                  <Icon name={p.icon} size={18} />{p.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Resumen de totales con descuento e impuesto editables */}
                      <div className="px-4 py-2 space-y-1" style={{ borderBottom: `1px solid ${S.border}` }}>
                        <div className="flex justify-between text-xs" style={{ color: S.sub }}>
                          <span>Artículos</span>
                          <span className="font-bold">{cart.reduce((s, l) => s + l.qty, 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs" style={{ color: S.sub }}>
                          <span>Descuento</span>
                          <div className="flex items-center gap-1">
                            <span>$</span>
                            <input
                              type="number" min="0" step="0.01"
                              value={discount === 0 ? '' : discount}
                              onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                              placeholder="0.00"
                              className="w-20 text-right px-1.5 py-0.5 rounded-lg text-xs outline-none"
                              style={{ backgroundColor: 'var(--ad-elevated)', color: S.text, border: `1px solid ${S.border}` }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-0.5">
                          <span className="text-sm font-black" style={{ color: S.text }}>Total</span>
                          <span className="text-xl font-black" style={{ color: S.accent }}>${finalTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs" style={{ color: S.sub }}>
                          <span>Por pagar</span>
                          <span className="font-bold" style={{ color: '#ef4444' }}>${finalTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs" style={{ color: S.sub }}>
                          <span>Impuesto %</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number" min="0" max="100" step="0.5"
                              value={taxRate === 0 ? '' : taxRate}
                              onChange={e => setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                              placeholder="0"
                              className="w-14 text-right px-1.5 py-0.5 rounded-lg text-xs outline-none"
                              style={{ backgroundColor: 'var(--ad-elevated)', color: S.text, border: `1px solid ${S.border}` }}
                            />
                            <span>%  ${taxAmt.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Acciones secundarias compactas */}
                      <div className="grid grid-cols-3 gap-0" style={{ borderBottom: `1px solid ${S.border}` }}>
                        {[
                          { icon: 'utensils' as const, label: 'En el local', action: () => {} },
                          { icon: 'printer' as const,  label: 'Imprimir',    action: () => printTicket('cart') },
                          { icon: 'clock' as const,    label: 'En espera',   action: () => {} },
                        ].map((btn, i) => (
                          <button key={i} onClick={btn.action}
                            disabled={btn.label !== 'En el local' && cart.length === 0}
                            className="py-2 flex flex-col items-center gap-1 text-[10px] font-bold disabled:opacity-30 transition-all hover:bg-white/5"
                            style={{ color: S.sub, borderRight: i < 2 ? `1px solid ${S.border}` : 'none' }}>
                            <Icon name={btn.icon} size={16} />
                            <span className="text-center leading-tight">{btn.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Botones POS */}
                      <div className="grid grid-cols-3 gap-0">
                        <button onClick={() => { setCart([]); setDiscount(0); setTaxRate(0) }} disabled={cart.length === 0}
                          className="py-3 flex flex-col items-center gap-1 text-sm font-black disabled:opacity-30 transition-all hover:bg-red-500/10 active:scale-95"
                          style={{ color: '#ef4444', borderRight: `1px solid ${S.border}` }}>
                          <Icon name="trash" size={20} />
                          <span>Limpiar</span>
                        </button>
                        <button onClick={placeOrder} disabled={saving || !canOrder}
                          className="py-3 flex flex-col items-center gap-1 text-sm font-black disabled:opacity-30 transition-all active:scale-95"
                          style={{ background: canOrder ? `linear-gradient(135deg,${S.accent}22,${S.accent}11)` : 'transparent', color: canOrder ? S.accent : S.sub, borderRight: `1px solid ${S.border}` }}>
                          {saving ? (
                            <span className="text-xs">Enviando...</span>
                          ) : (
                            <>
                              <Icon name="receipt" size={20} />
                              <span className="text-center leading-tight text-xs">Enviar a<br/>cocina</span>
                            </>
                          )}
                        </button>
                        <button onClick={() => cart.length > 0 && printTicket('cart')} disabled={cart.length === 0}
                          className="py-3 flex flex-col items-center gap-1 text-sm font-black disabled:opacity-30 transition-all active:scale-95"
                          style={{ background: canOrder ? 'linear-gradient(135deg,rgba(14,165,233,0.15),rgba(14,165,233,0.05))' : 'transparent', color: canOrder ? '#0ea5e9' : S.sub }}>
                          <Icon name="cash" size={20} />
                          <span>Cobrar</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
                </div>
              </div>,
              mount
            )}
          </>
        )}
      </div>
      </div>
    </div>
  )
}
