import { NextRequest } from 'next/server'
import { updateOrderStatus, updateOrderFields } from '@/lib/ordersDb'

// PATCH de pedido. Sin auth: KDS/caja lo usan.
// - { status }  → avanza el estado (pending → preparing → ready → delivered)
// - { notes?, tableNumber?, customerName? } → clasifica/edita (p. ej. marcar a domicilio)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const order = typeof body.status === 'string'
    ? await updateOrderStatus(id, body.status)
    : await updateOrderFields(id, { notes: body.notes, tableNumber: body.tableNumber, customerName: body.customerName })
  if (!order) return Response.json({ error: 'Pedido no encontrado' }, { status: 404 })
  return Response.json(order)
}
