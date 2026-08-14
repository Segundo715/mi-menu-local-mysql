import { NextRequest } from 'next/server'
import { getAllMenuItems, createMenuItem } from '@/lib/menuDb'
import { verifySession } from '@/lib/auth'

// GET es público: clientes, empleados y la pantalla TV leen el menú sin sesión.
export async function GET() {
  return Response.json(await getAllMenuItems())
}

export async function POST(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  const data = await req.json()
  return Response.json(
    await createMenuItem({ ...data, available: data.available ?? true }),
    { status: 201 }
  )
}
