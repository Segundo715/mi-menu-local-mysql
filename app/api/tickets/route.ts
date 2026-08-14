import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { query } from '@/lib/mysql'
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
    await query(
      `INSERT INTO sa_tickets (id, restaurant_id, restaurant_name, from_name, from_role, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), RID, restaurantName || RID, from_name || 'Desconocido', from_role || 'Usuario', message.trim()],
    )
  } catch {
    return Response.json({ error: 'Error al enviar reporte' }, { status: 500 })
  }
  return Response.json({ ok: true })
}
