import { NextRequest } from 'next/server'
import { getAllInventory, createInventoryItem } from '@/lib/inventoryDb'
import { verifySession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  return Response.json(await getAllInventory())
}

export async function POST(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  const data = await req.json()
  if (!data.name?.trim())
    return Response.json({ error: 'name requerido' }, { status: 400 })
  const item = await createInventoryItem({
    name:     data.name.trim(),
    category: data.category ?? 'General',
    stock:    Number(data.stock ?? 0),
    minStock: Number(data.minStock ?? 0),
    unit:     data.unit ?? 'pz',
    cost:     Number(data.cost ?? 0),
  })
  return Response.json(item, { status: 201 })
}
