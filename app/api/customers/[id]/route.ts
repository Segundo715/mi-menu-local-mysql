import { NextRequest } from 'next/server'
import { getCustomer, confirmCustomer, addStamp, redeemCoffee, requestCheckIn, deleteCustomer } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const c = await getCustomer(id)
  if (!c) return Response.json({ error: 'No encontrado' }, { status: 404 })
  return Response.json(c)
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const { action } = await req.json()

  // confirm: aprueba al cliente para que pueda acumular sellos.
  // stamp: añade un sello (solo si está confirmado y tiene < 5 sellos).
  // redeem: canjea la recompensa y resetea los sellos a 0.
  // checkin: solicita que un empleado confirme la visita manualmente.
  if (action === 'confirm') {
    const c = await confirmCustomer(id)
    if (!c) return Response.json({ error: 'No encontrado' }, { status: 404 })
    return Response.json(c)
  }

  if (action === 'stamp') {
    const c = await addStamp(id)
    if (!c) return Response.json({ error: 'No encontrado o no confirmado' }, { status: 404 })
    return Response.json(c)
  }

  if (action === 'redeem') {
    const c = await redeemCoffee(id)
    if (!c) return Response.json({ error: 'No encontrado' }, { status: 404 })
    return Response.json(c)
  }

  if (action === 'checkin') {
    const c = await requestCheckIn(id)
    if (!c) return Response.json({ error: 'No encontrado' }, { status: 404 })
    return Response.json(c)
  }

  return Response.json({ error: 'Acción inválida' }, { status: 400 })
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const ok = await deleteCustomer(id)
  return ok ? Response.json({ ok: true }) : Response.json({ error: 'No encontrado' }, { status: 404 })
}
