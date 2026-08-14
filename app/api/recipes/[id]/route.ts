import { NextRequest } from 'next/server'
import { updateRecipe, deleteRecipe } from '@/lib/recipeDb'
import { verifySession } from '@/lib/auth'

function auth(req: NextRequest) {
  return (
    verifySession(req.cookies.get('admin_session')?.value) ||
    verifySession(req.cookies.get('employee_session')?.value) ||
    verifySession(req.cookies.get('resta3_session')?.value)
  )
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await ctx.params
  const data = await req.json()
  const r = await updateRecipe(id, data)
  return r ? Response.json(r) : Response.json({ error: 'No encontrado' }, { status: 404 })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await ctx.params
  return await deleteRecipe(id)
    ? Response.json({ ok: true })
    : Response.json({ error: 'No encontrado' }, { status: 404 })
}
