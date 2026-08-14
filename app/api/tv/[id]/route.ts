import { NextRequest } from 'next/server'
import { updateSlide, deleteSlide } from '@/lib/tvDb'
import { verifySession } from '@/lib/auth'

function auth(req: NextRequest) {
  return verifySession(req.cookies.get('admin_session')?.value)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await ctx.params
  const data = await req.json()
  const s = await updateSlide(id, data)
  return s
    ? Response.json(s)
    : Response.json({ error: 'No encontrado' }, { status: 404 })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await ctx.params
  return await deleteSlide(id)
    ? Response.json({ ok: true })
    : Response.json({ error: 'No encontrado' }, { status: 404 })
}
