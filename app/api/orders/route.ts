import { NextRequest } from 'next/server'
import { getAllOrders, createOrder } from '@/lib/ordersDb'

// GET sin auth: empleados y la cocina pueden leer los pedidos sin sesión de admin.
export async function GET() {
  return Response.json(await getAllOrders())
}

export async function POST(req: NextRequest) {
  const { customerName, tableNumber, items, total, notes } = await req.json()
  if (!customerName?.trim() || !Array.isArray(items) || items.length === 0)
    return Response.json({ error: 'Nombre e items requeridos' }, { status: 400 })
  const order = await createOrder({ customerName: customerName.trim(), tableNumber, items, total: total ?? 0, notes })
  return Response.json(order, { status: 201 })
}
