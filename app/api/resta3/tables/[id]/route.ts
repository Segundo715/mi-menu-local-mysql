// PATCH y DELETE requieren resta3_session. PATCH acepta status, customer y since.
import { NextRequest } from 'next/server'
import { updateTable, deleteTable } from '@/lib/tablesDb'
import { verifySession } from '@/lib/auth'

function auth(req: NextRequest) {
  return (
    verifySession(req.cookies.get('resta3_session')?.value) ||
    verifySession(req.cookies.get('admin_session')?.value)
  )
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await ctx.params
  const data = await req.json()
  const patch: Parameters<typeof updateTable>[1] = {}
  if (data.status   !== undefined) patch.status   = data.status
  if (data.customer !== undefined) patch.customer  = data.customer
  if (data.since    !== undefined) patch.since     = data.since
  if (data.label    !== undefined) patch.label     = data.label
  if (data.seats    !== undefined) patch.seats     = data.seats
  if (data.zone     !== undefined) patch.zone      = data.zone
  const table = await updateTable(id, patch)
  return table ? Response.json(table) : Response.json({ error: 'No encontrado' }, { status: 404 })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await ctx.params
  return await deleteTable(id)
    ? Response.json({ ok: true })
    : Response.json({ error: 'No encontrado' }, { status: 404 })
}
