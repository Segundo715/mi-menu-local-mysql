import { NextRequest } from 'next/server'
import { getSetting, setSetting } from '@/lib/settingsDb'
import { verifySession } from '@/lib/auth'

// GET es público: los layouts y componentes del cliente necesitan leer nombre/logo sin sesión.
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') ?? ''
  if (!key) return Response.json({ error: 'key requerido' }, { status: 400 })
  const value = await getSetting(key)
  return Response.json({ key, value })
}

// POST requiere sesión de admin: solo el admin puede cambiar la configuración del restaurante.
export async function POST(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { key, value } = await req.json()
  if (!key) return Response.json({ error: 'key requerido' }, { status: 400 })
  try {
    await setSetting(key, value)
  } catch {
    return Response.json({ error: 'No se pudo guardar' }, { status: 500 })
  }
  return Response.json({ ok: true })
}
