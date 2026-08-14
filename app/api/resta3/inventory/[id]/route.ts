import { NextRequest } from 'next/server'
import { updateStock, updateInventoryItem, deleteInventoryItem } from '@/lib/inventoryDb'
import { verifySession } from '@/lib/auth'

function auth(req: NextRequest) {
  return verifySession(req.cookies.get('resta3_session')?.value)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await ctx.params
  const data = await req.json()
  if (data.stockDelta !== undefined) {
    // stockDelta: cambio relativo de stock (e.g., -2 = consumir 2 unidades).
    // Math.max(0, ...) evita stock negativo.
    const { data: current } = await import('@/lib/supabase').then(m =>
      m.supabase.from('inventory').select('stock').eq('id', id).single()
    )
    const newStock = Math.max(0, (current?.stock ?? 0) + data.stockDelta)
    const item = await updateStock(id, newStock)
    return item ? Response.json(item) : Response.json({ error: 'No encontrado' }, { status: 404 })
  }
  const item = await updateInventoryItem(id, {
    name: data.name, category: data.category,
    stock: data.stock !== undefined ? Number(data.stock) : undefined,
    minStock: data.minStock !== undefined ? Number(data.minStock) : undefined,
    unit: data.unit, cost: data.cost !== undefined ? Number(data.cost) : undefined,
  })
  return item ? Response.json(item) : Response.json({ error: 'No encontrado' }, { status: 404 })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await ctx.params
  return await deleteInventoryItem(id)
    ? Response.json({ ok: true })
    : Response.json({ error: 'No encontrado' }, { status: 404 })
}
