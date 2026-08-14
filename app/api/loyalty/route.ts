import { NextRequest } from 'next/server'
import { findOrCreate, getAllCards } from '@/lib/loyaltyDb'
import { verifySession } from '@/lib/auth'
import { getSetting } from '@/lib/settingsDb'

// GET requiere sesión de admin (vista de tarjetas en el panel).
// POST es público: el empleado puede crear/encontrar la tarjeta de un cliente al sellar.
export async function GET(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json(await getAllCards())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name = (body.name ?? '').trim()
  const phone = (body.phone ?? '').trim()
  const cardType = (body.cardType ?? 'cafe').trim()
  if (!name || !phone)
    return Response.json({ error: 'Nombre y teléfono requeridos' }, { status: 400 })
  // Busca la vigencia configurada para este tipo de tarjeta
  let validityMonths = 3
  try {
    const raw = await getSetting('reward_categories')
    if (raw) {
      const cats: { id: string; validityMonths?: number }[] = JSON.parse(raw)
      const cat = cats.find(c => c.id === cardType)
      if (cat?.validityMonths) validityMonths = cat.validityMonths
    }
  } catch {}

  const { card, isNew } = await findOrCreate(name, phone, cardType, validityMonths)
  return Response.json(card, { status: isNew ? 201 : 200 })
}
