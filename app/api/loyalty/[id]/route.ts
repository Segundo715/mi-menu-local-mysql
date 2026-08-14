// Todas las acciones (stamp/redeem/activate/deactivate) requieren admin_session.
import { NextRequest } from 'next/server'
import { getCard, addStamp, redeemCoffee, deleteCard, deactivateCard, activateCard } from '@/lib/loyaltyDb'
import { verifySession } from '@/lib/auth'

function auth(req: NextRequest) {
  return verifySession(req.cookies.get('admin_session')?.value)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const card = await getCard(id)
  return card ? Response.json(card) : Response.json({ error: 'No encontrado' }, { status: 404 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { action } = await req.json()
  if (action === 'stamp') return Response.json(await addStamp(id) ?? Response.json({ error: 'Error' }, { status: 400 }))
  if (action === 'redeem') return Response.json(await redeemCoffee(id))
  if (action === 'deactivate') return Response.json(await deactivateCard(id))
  if (action === 'activate') return Response.json(await activateCard(id))
  return Response.json({ error: 'Acción inválida' }, { status: 400 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  return await deleteCard(id)
    ? Response.json({ ok: true })
    : Response.json({ error: 'No encontrado' }, { status: 404 })
}
