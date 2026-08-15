import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getDb } from '@/lib/mongodb'
import { verifySession } from '@/lib/auth'
import { getSetting } from '@/lib/settingsDb'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export async function POST(req: NextRequest) {
  const cookies = req.cookies
  const isAuth =
    verifySession(cookies.get('admin_session')?.value) ||
    verifySession(cookies.get('employee_session')?.value) ||
    verifySession(cookies.get('resta3_session')?.value)

  if (!isAuth) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { from_name, from_role, message } = await req.json()
  if (!message?.trim()) return Response.json({ error: 'Mensaje requerido' }, { status: 400 })

  const restaurantName = await getSetting('restaurant_name')

  try {
    const tickets = (await getDb()).collection<{
      _id: string; restaurantId: string; restaurantName: string; fromName: string; fromRole: string
      message: string; createdAt: Date
    }>('sa_tickets')
    await tickets.insertOne({
      _id: randomUUID(),
      restaurantId: RID,
      restaurantName: restaurantName || RID,
      fromName: from_name || 'Desconocido',
      fromRole: from_role || 'Usuario',
      message: message.trim(),
      createdAt: new Date(),
    })
  } catch {
    return Response.json({ error: 'Error al enviar reporte' }, { status: 500 })
  }
  return Response.json({ ok: true })
}
