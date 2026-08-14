import { NextRequest } from 'next/server'
import { getAllTables, createTable } from '@/lib/tablesDb'
import { verifySession } from '@/lib/auth'

// GET sin auth: el salón necesita ver las mesas en tiempo real sin sesión.
// POST requiere resta3_session (solo el admin de Resta3 crea mesas).
export async function GET() {
  return Response.json(await getAllTables())
}

export async function POST(req: NextRequest) {
  if (!verifySession(req.cookies.get('resta3_session')?.value) &&
      !verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  const data = await req.json()
  if (!data.label?.trim()) return Response.json({ error: 'Nombre requerido' }, { status: 400 })
  const table = await createTable({
    label: data.label.trim(), seats: data.seats ?? 4,
    status: data.status ?? 'libre', zone: data.zone ?? 'Salón',
  })
  return Response.json(table, { status: 201 })
}
