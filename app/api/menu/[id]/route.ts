import { NextRequest } from 'next/server'
import { updateMenuItem, deleteMenuItem } from '@/lib/menuDb'
import { verifySession } from '@/lib/auth'

function auth(req: NextRequest) {
  return verifySession(req.cookies.get('admin_session')?.value)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await ctx.params
  const data = await req.json()
  const item = await updateMenuItem(id, data)
  return item
    ? Response.json(item)
    : Response.json({ error: 'No encontrado' }, { status: 404 })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await ctx.params
  return await deleteMenuItem(id)
    ? Response.json({ ok: true })
    : Response.json({ error: 'No encontrado' }, { status: 404 })
}
