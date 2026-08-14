import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession } from '@/lib/auth'
import { getSetting, setSetting } from '@/lib/settingsDb'
import { getAllOrders } from '@/lib/ordersDb'

export const dynamic = 'force-dynamic'

const DELIVERY_KEYS = ['GOGO', 'RAPPI', 'UBEREATS']

function calcTotals(orders: Awaited<ReturnType<typeof getAllOrders>>) {
  let efectivo = 0, tarjeta = 0, transferencia = 0, domicilio = 0
  for (const o of orders) {
    const note = (o.notes ?? '').toUpperCase()
    const amt  = o.total ?? 0
    if (DELIVERY_KEYS.some(k => note.includes(`[${k}]`))) domicilio     += amt
    else if (note.includes('[TARJETA]'))                   tarjeta       += amt
    else if (note.includes('[TRANSFERENCIA]'))             transferencia += amt
    else                                                   efectivo      += amt
  }
  return { efectivo, tarjeta, transferencia, domicilio, total: efectivo + tarjeta + transferencia + domicilio }
}

export async function GET() {
  const jar = await cookies()
  if (!verifySession(jar.get('resta3_session')?.value))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [turnoRaw, historialRaw] = await Promise.all([
    getSetting('corte_turno_inicio'),
    getSetting('cortes_historial'),
  ])

  const turno    = turnoRaw    ? JSON.parse(turnoRaw)    : null
  const historial = historialRaw ? JSON.parse(historialRaw) : []

  const allOrders  = await getAllOrders()
  const shiftStart = turno?.at ? new Date(turno.at) : new Date(0)
  const shiftOrders = allOrders.filter(o => new Date(o.createdAt) >= shiftStart)

  return NextResponse.json({
    turno,
    orders: shiftOrders.length,
    totals: calcTotals(shiftOrders),
    historial: (historial as unknown[]).slice(-30).reverse(),
  })
}

export async function POST(req: NextRequest) {
  const jar = await cookies()
  if (!verifySession(jar.get('resta3_session')?.value))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { by, receives } = await req.json() as { by?: string; receives?: string }
  if (!by?.trim()) return NextResponse.json({ error: 'Ingresa el nombre de quien entrega' }, { status: 400 })

  const [turnoRaw, historialRaw] = await Promise.all([
    getSetting('corte_turno_inicio'),
    getSetting('cortes_historial'),
  ])

  const turno     = turnoRaw     ? JSON.parse(turnoRaw)     : { at: new Date(0).toISOString() }
  const historial = historialRaw ? JSON.parse(historialRaw) : []

  const allOrders   = await getAllOrders()
  const shiftStart  = new Date(turno.at)
  const shiftOrders = allOrders.filter(o => new Date(o.createdAt) >= shiftStart)
  const totals      = calcTotals(shiftOrders)

  const now   = new Date().toISOString()
  const corte = {
    id:       crypto.randomUUID(),
    inicio:   turno.at,
    fin:      now,
    by:       by.trim(),
    receives: receives?.trim() || null,
    orders:   shiftOrders.length,
    ...totals,
  }

  const arr = historial as unknown[]
  arr.push(corte)
  if (arr.length > 100) arr.splice(0, arr.length - 100)

  await Promise.all([
    setSetting('cortes_historial', JSON.stringify(arr)),
    setSetting('corte_turno_inicio', JSON.stringify({ at: now, by: receives?.trim() || by.trim() })),
  ])

  return NextResponse.json(corte)
}
