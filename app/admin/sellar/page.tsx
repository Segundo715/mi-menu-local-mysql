'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import AdminNav from '@/app/components/AdminNav'
import { QRScanner } from '../../components/QRScanner'
import { Icon } from '@/app/components/Icon'

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false })

const S = {
  bg: 'var(--ad-bg)', card: 'var(--ad-card)', accent: 'var(--ad-accent)',
  text: 'var(--ad-text)', sub: 'var(--ad-sub)', border: 'var(--ad-border)',
}

interface Stamp { timestamp: string; visitsAfter: number }
interface Customer {
  id: string; name: string; phone: string; visits: number
  confirmed: boolean; registeredAt: string; stamps: Stamp[]; requestedAt?: string
}
type ScanMode = 'idle' | 'camera' | 'phone'
type ScanState = 'idle' | 'scanning' | 'found' | 'stamping' | 'done'
type Tab = 'scan' | 'dashboard'

interface LoyaltyCardItem { id: string; name: string; phone: string; visits: number; active: boolean; cardType: string; registeredAt: string }

const CARD_TYPE_LABELS: Record<string, string> = { cafe: 'Café', dosxuno: '2x1', descuento: 'Descuento', premium: 'Premium' }

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Texto negro o blanco según la luminancia del acento configurado, para que los
// botones con fondo S.accent nunca queden con texto invisible (ej. acento negro).
function contrastText(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#000'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#000' : '#fff'
}

export default function AdminSellarPage() {
  const [tab, setTab] = useState<Tab>('scan')
  const [origin, setOrigin] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [scanMode, setScanMode] = useState<ScanMode>('idle')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanned, setScanned] = useState<Customer | null>(null)
  const [scanError, setScanError] = useState('')
  const [phoneSearch, setPhoneSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [accentHex, setAccentHex] = useState('#B90F45')
  const scanKey = useRef(0)

  useEffect(() => {
    queueMicrotask(() => setOrigin(window.location.origin))
    queueMicrotask(loadCustomers)
    queueMicrotask(loadLoyaltyPending)
    fetch('/api/settings?key=menu_hover_color').then(r => r.json()).then(d => {
      if (d?.value) { setAccentHex(d.value); return }
      fetch('/api/settings?key=sidebar_accent').then(r => r.json()).then(d2 => { if (d2?.value) setAccentHex(d2.value) }).catch(() => {})
    }).catch(() => {})
    const poll = setInterval(() => { loadCustomers(); loadLoyaltyPending() }, 8000)
    return () => clearInterval(poll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const accentText = contrastText(accentHex)

  async function loadCustomers() {
    setLoadingList(true)
    try {
      const res = await fetch('/api/customers')
      if (res.ok) setCustomers(await res.json())
    } finally { setLoadingList(false) }
  }

  async function loadCustomer(id: string) {
    setScanState('found'); setScanError('')
    const res = await fetch(`/api/customers/${id}`)
    if (res.ok) { setScanned(await res.json()); return }
    // El QR de una tarjeta de fidelización codifica un id de /api/loyalty, no de /api/customers.
    if (await loadLoyaltyCard(id)) return
    setScanError('Cliente no encontrado.'); setScanState('idle')
  }

  async function searchByPhone() {
    const q = phoneSearch.replace(/\D/g, '')
    if (q.length < 6) { setScanError('Ingresa al menos 6 dígitos del teléfono.'); return }
    setSearching(true); setScanError('')
    const res = await fetch('/api/customers')
    if (res.ok) {
      const all: Customer[] = await res.json()
      const match = all.find(c => c.phone.replace(/\D/g, '').includes(q) && c.confirmed)
      if (match) { setScanned(match); setScanState('found'); setSearching(false); return }
    }
    if (await searchLoyaltyByPhone(q)) { setSearching(false); return }
    setScanError('No se encontró ningún cliente confirmado con ese número.')
    setSearching(false)
  }

  function handleCameraError() {
    setScanError('La cámara no pudo abrirse. Usa la búsqueda por teléfono.')
    setScanMode('idle')
  }

  async function deleteCustomerFn(id: string) {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    loadCustomers()
    if (scanned?.id === id) resetScan()
  }

  async function activateCustomer(id: string) {
    await fetch(`/api/customers/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm' }),
    })
    loadCustomers()
  }

  async function redeemCoffee() {
    if (!scanned) return
    setScanState('stamping')
    const res = await fetch(`/api/customers/${scanned.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'redeem' }),
    })
    if (res.ok) { setScanned(await res.json()); setScanState('done'); loadCustomers() }
    else { setScanState('found') }
  }

  async function stampVisit() {
    if (!scanned) return
    setScanState('stamping')
    const res = await fetch(`/api/customers/${scanned.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stamp' }),
    })
    if (res.ok) { setScanned(await res.json()); setScanState('done'); loadCustomers() }
    else { setScanState('found'); setScanError('Error al registrar la visita.') }
  }

  function resetScan() {
    scanKey.current += 1
    setScanMode('idle'); setScanState('idle'); setScanned(null); setScannedLoyalty([]); setScanError(''); setPhoneSearch('')
  }

  function activationWALink(c: Customer) {
    const link = `${origin}/activate?id=${c.id}`
    const msg = encodeURIComponent(`¡Hola ${c.name}! 🎉 Tu tarjeta de fidelización ☕ está lista.\n\nToca este link para activarla:\n${link}\n\nCon cada 5 visitas ganas un café gratis. ¡Gracias!`)
    return `https://wa.me/${c.phone.replace(/\D/g, '')}?text=${msg}`
  }

  function activationSMSLink(c: Customer) {
    const link = `${origin}/activate?id=${c.id}`
    const msg = encodeURIComponent(`Hola ${c.name}, activa tu tarjeta: ${link}`)
    return `sms:${c.phone.replace(/\D/g, '')}?body=${msg}`
  }

  const [loyaltyPending, setLoyaltyPending] = useState<LoyaltyCardItem[]>([])
  const [loyaltyActive, setLoyaltyActive] = useState<LoyaltyCardItem[]>([])
  const [activatingCard, setActivatingCard] = useState<string | null>(null)
  const [scannedLoyalty, setScannedLoyalty] = useState<LoyaltyCardItem[]>([])
  const [stampingId, setStampingId] = useState<string | null>(null)

  async function loadLoyaltyPending() {
    try {
      const res = await fetch('/api/loyalty')
      if (res.ok) {
        const all: LoyaltyCardItem[] = await res.json()
        setLoyaltyPending(all.filter(c => !c.active))
        setLoyaltyActive(all.filter(c => c.active))
      }
    } catch {}
  }

  async function activateLoyaltyCard(id: string) {
    setActivatingCard(id)
    await fetch(`/api/loyalty/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'activate' }),
    })
    setActivatingCard(null)
    loadLoyaltyPending()
  }

  // Busca por teléfono en las tarjetas de fidelización (café/2x1/descuento/premium).
  // Un mismo teléfono puede tener varias tarjetas activas (una por categoría).
  async function searchLoyaltyByPhone(q: string): Promise<boolean> {
    const res = await fetch('/api/loyalty')
    if (!res.ok) return false
    const all: LoyaltyCardItem[] = await res.json()
    const matches = all.filter(c => c.active && c.phone.replace(/\D/g, '').includes(q))
    if (!matches.length) return false
    setScannedLoyalty(matches)
    setScanState('found')
    return true
  }

  async function loadLoyaltyCard(id: string): Promise<boolean> {
    const res = await fetch(`/api/loyalty/${id}`)
    if (!res.ok) return false
    const card: LoyaltyCardItem = await res.json()
    if (!card.active) return false
    setScannedLoyalty([card])
    setScanState('found')
    return true
  }

  async function stampLoyaltyCard(id: string) {
    setScanState('stamping'); setStampingId(id)
    const res = await fetch(`/api/loyalty/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stamp' }),
    })
    if (res.ok) {
      const updated: LoyaltyCardItem = await res.json()
      setScannedLoyalty(list => list.map(c => c.id === id ? updated : c))
      setScanState('found')
      loadLoyaltyPending()
    } else {
      setScanState('found'); setScanError('Error al registrar la visita.')
    }
    setStampingId(null)
  }

  async function redeemLoyaltyCard(id: string) {
    setScanState('stamping'); setStampingId(id)
    const res = await fetch(`/api/loyalty/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'redeem' }),
    })
    if (res.ok) {
      const updated: LoyaltyCardItem = await res.json()
      setScannedLoyalty(list => list.map(c => c.id === id ? updated : c))
      setScanState('found')
      loadLoyaltyPending()
    } else {
      setScanState('found')
    }
    setStampingId(null)
  }

  async function deleteLoyaltyCard(id: string) {
    if (!confirm('¿Eliminar esta tarjeta? El cliente perderá sus sellos.')) return
    await fetch(`/api/loyalty/${id}`, { method: 'DELETE' })
    loadLoyaltyPending()
  }

  const pending = customers.filter(c => !c.confirmed)
  const confirmed = customers.filter(c => c.confirmed)
  const checkIns = customers.filter(c => c.requestedAt && Date.now() - new Date(c.requestedAt).getTime() < 3 * 60 * 1000)
  const sortedConfirmed = [...confirmed].sort((a, b) => {
    const aT = a.stamps.at(-1)?.timestamp ?? a.registeredAt
    const bT = b.stamps.at(-1)?.timestamp ?? b.registeredAt
    return bT.localeCompare(aT)
  })

  const inp = 'w-full px-4 py-3 rounded-xl text-sm outline-none'
  const inpStyle = { backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }

  const ScannedCard = scanned ? (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="font-bold text-lg" style={{ color: S.text }}>{scanned.name}</p>
            <p className="text-sm" style={{ color: S.sub }}>{scanned.phone}</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold" style={{ color: scanned.visits >= 5 ? '#4ade80' : S.accent }}>
              {scanned.visits}/5
            </span>
            <p className="text-xs" style={{ color: S.sub }}>visitas</p>
          </div>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: i < scanned.visits ? S.accent : S.border, color: i < scanned.visits ? accentText : S.sub }}>
              <Icon name="coffee" size={15} />
            </div>
          ))}
        </div>
      </div>

      {!scanned.confirmed ? (
        <div className="rounded-xl p-4 text-center text-sm" style={{ backgroundColor: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#f87171' }}>
          Este cliente aún no activó su tarjeta. Actívala desde la pestaña Clientes.
        </div>
      ) : scanState === 'done' ? (
        <div className="rounded-xl p-4 text-center font-bold flex items-center justify-center gap-2"
          style={{ backgroundColor: 'rgba(74,222,128,.12)', color: '#4ade80' }}>
          <Icon name="checkCircle" size={16} /> Visita registrada — {scanned.visits}/5 sellos
        </div>
      ) : scanned.visits >= 5 ? (
        <button onClick={redeemCoffee} disabled={scanState === 'stamping'}
          className="w-full font-bold py-4 rounded-xl text-base disabled:opacity-60"
          style={{ backgroundColor: '#f59e0b', color: '#000' }}>
          {scanState === 'stamping' ? 'Canjeando...' : <span className="inline-flex items-center justify-center gap-2"><Icon name="gift" size={16} /> Canjear café gratis y reiniciar</span>}
        </button>
      ) : (
        <button onClick={stampVisit} disabled={scanState === 'stamping'}
          className="w-full font-bold py-4 rounded-xl text-base disabled:opacity-60"
          style={{ backgroundColor: S.accent, color: accentText }}>
          {scanState === 'stamping' ? 'Sellando...' : <span className="inline-flex items-center justify-center gap-2"><Icon name="coffee" size={16} /> Sellar visita</span>}
        </button>
      )}
      <button onClick={resetScan} className="w-full text-sm underline py-1" style={{ color: S.sub }}>
        Buscar otro cliente
      </button>
    </div>
  ) : null

  // Una tarjeta de fidelización por categoría (café, 2x1, descuento, premium) —
  // un mismo teléfono puede tener varias, cada una con su propio botón de sellar/canjear.
  const ScannedLoyaltyCards = scannedLoyalty.length > 0 ? (
    <div className="space-y-3">
      {scannedLoyalty.map(card => (
        <div key={card.id} className="space-y-2">
          <div className="rounded-2xl p-4" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="font-bold text-lg" style={{ color: S.text }}>{card.name}</p>
                <p className="text-sm" style={{ color: S.sub }}>{card.phone}</p>
                <p className="text-xs mt-0.5 font-semibold" style={{ color: S.accent }}>
                  {CARD_TYPE_LABELS[card.cardType] ?? card.cardType}
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold" style={{ color: card.visits >= 5 ? '#4ade80' : S.accent }}>
                  {card.visits}/5
                </span>
                <p className="text-xs" style={{ color: S.sub }}>visitas</p>
              </div>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-1 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: i < card.visits ? S.accent : S.border, color: i < card.visits ? accentText : S.sub }}>
                  <Icon name="coffee" size={15} />
                </div>
              ))}
            </div>
          </div>

          {card.visits >= 5 ? (
            <button onClick={() => redeemLoyaltyCard(card.id)} disabled={scanState === 'stamping'}
              className="w-full font-bold py-4 rounded-xl text-base disabled:opacity-60"
              style={{ backgroundColor: '#f59e0b', color: '#000' }}>
              {scanState === 'stamping' ? 'Canjeando...' : <span className="inline-flex items-center justify-center gap-2"><Icon name="gift" size={16} /> Canjear premio y reiniciar</span>}
            </button>
          ) : (
            <button onClick={() => stampLoyaltyCard(card.id)} disabled={scanState === 'stamping'}
              className="w-full font-bold py-4 rounded-xl text-base disabled:opacity-60"
              style={{ backgroundColor: S.accent, color: accentText }}>
              {scanState === 'stamping' ? 'Sellando...' : <span className="inline-flex items-center justify-center gap-2"><Icon name="coffee" size={16} /> Sellar visita</span>}
            </button>
          )}
        </div>
      ))}
      <button onClick={resetScan} className="w-full text-sm underline py-1" style={{ color: S.sub }}>
        Buscar otro cliente
      </button>
    </div>
  ) : null

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />
      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* Header + tabs */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-black" style={{ color: S.text }}>Sellar visitas</h1>
            <p className="text-xs mt-0.5" style={{ color: S.sub }}>Fidelización de clientes</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTab('scan')}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-colors"
              style={tab === 'scan'
                ? { backgroundColor: S.accent, color: accentText }
                : { backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }}>
              Sellar
            </button>
            <button onClick={() => { setTab('dashboard'); resetScan() }}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-colors relative"
              style={tab === 'dashboard'
                ? { backgroundColor: S.accent, color: accentText }
                : { backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }}>
              Clientes
              {(pending.length + loyaltyPending.length) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {pending.length + loyaltyPending.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── TAB: SELLAR ── */}
        {tab === 'scan' && (<>

          {/* Alerta de nuevos registros pendientes */}
          {(pending.length > 0 || loyaltyPending.length > 0) && (
            <div className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer"
              style={{ backgroundColor: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.4)' }}
              onClick={() => { setTab('dashboard'); resetScan() }}>
              <span className="text-red-400 shrink-0"><Icon name="bell" size={20} /></span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: '#f87171' }}>
                  {loyaltyPending.length + pending.length} tarjeta{(loyaltyPending.length + pending.length) !== 1 ? 's' : ''} esperando activación
                </p>
                <p className="text-xs" style={{ color: '#f87171', opacity: 0.7 }}>Toca para ver y activar</p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,.2)', color: '#f87171' }}>Ver →</span>
            </div>
          )}

          {/* Check-ins en mostrador */}
          {checkIns.map(c => (
            <div key={c.id} className="rounded-2xl p-4 flex items-center gap-3 animate-pulse"
              style={{ backgroundColor: 'rgba(74,222,128,.12)', border: '1px solid rgba(74,222,128,.4)' }}>
              <span style={{ color: '#4ade80' }}><Icon name="bell" size={22} /></span>
              <div>
                <p className="font-bold" style={{ color: '#4ade80' }}>{c.name} está en el mostrador</p>
                <p className="text-xs" style={{ color: '#4ade80', opacity: 0.7 }}>{c.phone} · {c.visits}/5 sellos</p>
              </div>
            </div>
          ))}

          {/* QR del negocio */}
          <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <h2 className="font-bold text-base mb-1" style={{ color: S.accent }}>QR del negocio</h2>
            <p className="text-xs mb-4" style={{ color: S.sub }}>Muéstralo para que los clientes se registren</p>
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-xl bg-white inline-block min-h-[172px] min-w-[172px] flex items-center justify-center">
                {origin ? <QRCode value={origin} size={160} /> : <span className="text-gray-300 text-sm">Cargando…</span>}
              </div>
            </div>
            {origin && <p className="text-xs break-all" style={{ color: S.sub }}>{origin}</p>}
          </div>

          {/* Sellar visita */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <h2 className="font-bold text-base mb-3" style={{ color: S.accent }}>Sellar visita del cliente</h2>

            {scanError && (
              <div className="rounded-xl px-4 py-3 text-sm mb-3"
                style={{ backgroundColor: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#f87171' }}>
                {scanError}
              </div>
            )}

            {scanMode === 'idle' && scanState === 'idle' && (
              <div className="space-y-3">
                <button onClick={() => { setScanError(''); setScanMode('camera'); setScanState('scanning') }}
                  className="w-full font-bold py-4 rounded-xl text-base"
                  style={{ backgroundColor: S.accent, color: accentText }}>
                  <span className="inline-flex items-center justify-center gap-2"><Icon name="camera" size={16} /> Escanear QR del cliente</span>
                </button>
                <button onClick={() => { setScanError(''); setScanMode('phone') }}
                  className="w-full font-bold py-4 rounded-xl text-base"
                  style={{ backgroundColor: S.bg, color: S.text, border: `1px solid ${S.border}` }}>
                  <span className="inline-flex items-center justify-center gap-2"><Icon name="search" size={16} /> Buscar por teléfono</span>
                </button>
                <p className="text-xs text-center" style={{ color: S.sub }}>Si la cámara no abre, usa la búsqueda por teléfono</p>
              </div>
            )}

            {scanMode === 'camera' && scanState === 'scanning' && (
              <div>
                <QRScanner key={scanKey.current} onScan={id => loadCustomer(id)} onCameraError={handleCameraError} />
                <button onClick={resetScan} className="w-full mt-3 text-sm underline py-1" style={{ color: S.sub }}>Cancelar</button>
              </div>
            )}

            {scanMode === 'phone' && scanState === 'idle' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: S.accent }}>Número de teléfono del cliente</label>
                  <input type="tel" value={phoneSearch}
                    onChange={e => setPhoneSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchByPhone()}
                    placeholder="Ej. 55 1234 5678"
                    className={`${inp} text-lg`} style={inpStyle} autoFocus />
                </div>
                <button onClick={searchByPhone} disabled={searching}
                  className="w-full font-bold py-4 rounded-xl text-base disabled:opacity-60"
                  style={{ backgroundColor: S.accent, color: accentText }}>
                  {searching ? 'Buscando...' : <span className="inline-flex items-center justify-center gap-2"><Icon name="search" size={16} /> Buscar cliente</span>}
                </button>
                <button onClick={resetScan} className="w-full text-sm underline py-1" style={{ color: S.sub }}>Cancelar</button>
              </div>
            )}

            {scanState !== 'idle' && scanState !== 'scanning' && (ScannedCard ?? ScannedLoyaltyCards)}
          </div>
        </>)}

        {/* ── TAB: CLIENTES ── */}
        {tab === 'dashboard' && (<>

          {/* Tarjetas de fidelización por activar */}
          {loyaltyPending.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-red-500">{loyaltyPending.length}</span>
                <h2 className="font-bold" style={{ color: '#f87171' }}>Tarjetas por activar</h2>
              </div>
              {loyaltyPending.map(c => (
                <div key={c.id} className="rounded-2xl p-4"
                  style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderLeft: '4px solid #ef4444' }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold" style={{ color: S.text }}>{c.name}</p>
                      <p className="text-sm" style={{ color: S.sub }}>{c.phone}</p>
                      <p className="text-xs mt-0.5" style={{ color: S.sub }}>Registrado: {fmt(c.registeredAt)}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,.15)', color: '#f87171' }}>Pendiente</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => activateLoyaltyCard(c.id)} disabled={activatingCard === c.id}
                      className="flex-1 font-bold py-2.5 rounded-xl text-sm disabled:opacity-60"
                      style={{ backgroundColor: S.accent, color: accentText }}>
                      <span className="inline-flex items-center justify-center gap-2">
                        <Icon name="check" size={15} /> {activatingCard === c.id ? 'Activando...' : 'Activar'}
                      </span>
                    </button>
                    <button onClick={() => deleteLoyaltyCard(c.id)}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold"
                      style={{ backgroundColor: 'rgba(239,68,68,.15)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)' }}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="h-px" style={{ backgroundColor: S.border }} />
            </div>
          )}

          {/* Tarjetas de fidelización activas */}
          {loyaltyActive.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: S.accent }}>{loyaltyActive.length}</span>
                <h2 className="font-bold" style={{ color: S.text }}>Tarjetas activas</h2>
              </div>

              {loyaltyActive.map(c => (
                <div key={c.id} className="rounded-2xl p-4"
                  style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold" style={{ color: S.text }}>{c.name}</p>
                      <p className="text-sm" style={{ color: S.sub }}>{c.phone}</p>
                      <p className="text-xs mt-0.5" style={{ color: S.sub }}>Registrado: {fmt(c.registeredAt)}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{ backgroundColor: `${S.accent}20`, color: S.accent }}>
                      {c.visits}/5 sellos
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {c.visits >= 5 ? (
                      <button onClick={() => redeemLoyaltyCard(c.id)} disabled={stampingId === c.id}
                        className="w-full font-bold py-2.5 rounded-xl text-sm disabled:opacity-60"
                        style={{ backgroundColor: '#f59e0b', color: '#000' }}>
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <Icon name="gift" size={14} /> {stampingId === c.id ? 'Canjeando...' : 'Canjear premio'}
                        </span>
                      </button>
                    ) : (
                      <button onClick={() => stampLoyaltyCard(c.id)} disabled={stampingId === c.id}
                        className="w-full font-bold py-2.5 rounded-xl text-sm disabled:opacity-60"
                        style={{ backgroundColor: S.accent, color: accentText }}>
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <Icon name="coffee" size={14} /> {stampingId === c.id ? 'Sellando...' : 'Sellar visita'}
                        </span>
                      </button>
                    )}
                    <button onClick={() => deleteLoyaltyCard(c.id)}
                      className="w-full rounded-xl py-1.5 text-sm font-medium inline-flex items-center justify-center gap-1.5"
                      style={{ color: '#f87171', border: '1px solid rgba(239,68,68,.3)' }}>
                      <Icon name="trash" size={14} /> Eliminar tarjeta
                    </button>
                  </div>
                </div>
              ))}
              <div className="h-px" style={{ backgroundColor: S.border }} />
            </div>
          )}

          {/* Pendientes de activación (sistema antiguo de customers) */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-red-500">{pending.length}</span>
                <h2 className="font-bold" style={{ color: '#f87171' }}>Pendientes de activación</h2>
              </div>
              {pending.map(c => (
                <div key={c.id} className="rounded-2xl p-4"
                  style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderLeft: '4px solid #ef4444' }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold" style={{ color: S.text }}>{c.name}</p>
                      <p className="text-sm" style={{ color: S.sub }}>{c.phone}</p>
                      <p className="text-xs mt-0.5" style={{ color: S.sub }}>Registrado: {fmt(c.registeredAt)}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,.15)', color: '#f87171' }}>Pendiente</span>
                  </div>
                  <div className="space-y-2">
                    <button onClick={() => activateCustomer(c.id)}
                      className="w-full font-bold py-2.5 rounded-xl text-sm"
                      style={{ backgroundColor: S.accent, color: accentText }}>
                      <span className="inline-flex items-center justify-center gap-2"><Icon name="check" size={15} /> Activar tarjeta ahora</span>
                    </button>
                    <div className="flex gap-2">
                      <a href={activationWALink(c)} target="_blank" rel="noopener noreferrer"
                        className="flex-1 font-bold py-2 rounded-xl text-sm text-center text-white"
                        style={{ backgroundColor: '#16a34a' }}>
                        <span className="inline-flex items-center justify-center gap-1.5"><Icon name="message" size={14} /> WhatsApp</span>
                      </a>
                      <a href={activationSMSLink(c)}
                        className="flex-1 font-bold py-2 rounded-xl text-sm text-center text-white"
                        style={{ backgroundColor: '#2563eb' }}>
                        <span className="inline-flex items-center justify-center gap-1.5"><Icon name="mail" size={14} /> SMS</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              <div className="h-px" style={{ backgroundColor: S.border }} />
            </div>
          )}

          {/* Clientes activos */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg" style={{ color: S.text }}>Activos ({confirmed.length})</h2>
            <button onClick={loadCustomers} className="text-sm underline" style={{ color: S.accent }}>Actualizar</button>
          </div>

          {loadingList && <div className="text-center py-10" style={{ color: S.accent }}>Cargando...</div>}

          {!loadingList && confirmed.length === 0 && (
            <div className="flex flex-col items-center py-10" style={{ color: S.sub }}>
              <span className="mb-2"><Icon name="coffee" size={34} /></span>
              <p>Aún no hay clientes activos</p>
            </div>
          )}

          {sortedConfirmed.map(c => {
            const lastStamp = c.stamps.at(-1)
            return (
              <div key={c.id} className="rounded-2xl p-4" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold" style={{ color: S.text }}>{c.name}</p>
                    <p className="text-sm" style={{ color: S.sub }}>{c.phone}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-bold"
                    style={c.visits >= 5
                      ? { backgroundColor: 'rgba(74,222,128,.12)', color: '#4ade80' }
                      : { backgroundColor: `${S.accent}20`, color: S.accent }}>
                    {c.visits >= 5
                      ? <span className="inline-flex items-center gap-1"><Icon name="gift" size={11} /> Premio</span>
                      : <span className="inline-flex items-center gap-1">{c.visits}/5 <Icon name="coffee" size={11} /></span>}
                  </span>
                </div>
                <div className="flex gap-1.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex-1 h-2 rounded-full"
                      style={{ backgroundColor: i < c.visits ? S.accent : S.border }} />
                  ))}
                </div>
                <div className="text-xs space-y-0.5" style={{ color: S.sub }}>
                  <p>Registrado: {fmt(c.registeredAt)}</p>
                  {lastStamp && <p>Último sello: {fmt(lastStamp.timestamp)}</p>}
                  {c.stamps.length > 0 && <p>{c.stamps.length} sello{c.stamps.length !== 1 ? 's' : ''} en total</p>}
                </div>
                <button onClick={() => deleteCustomerFn(c.id)}
                  className="mt-3 w-full rounded-xl py-1.5 text-sm font-medium inline-flex items-center justify-center gap-1.5"
                  style={{ color: '#f87171', border: '1px solid rgba(239,68,68,.3)' }}>
                  <Icon name="trash" size={14} /> Eliminar cliente
                </button>
              </div>
            )
          })}
        </>)}
      </div>
    </div>
  )
}
