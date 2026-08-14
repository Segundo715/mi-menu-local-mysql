import { NextRequest } from 'next/server'
import { verifySession } from '@/lib/auth'
import { listAdmins, createAdmin, deleteAdmin, getAdminById } from '@/lib/adminDb'

// Gestión de cuentas Resta3 (almacenadas en la tabla admins con role='Resta3').
// Solo accesible por admins autenticados.

function guard(req: NextRequest) {
  return verifySession(req.cookies.get('admin_session')?.value)
}

export async function GET(req: NextRequest) {
  if (!guard(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const all = await listAdmins()
  return Response.json(all.filter(a => a.role === 'Resta3'))
}

export async function POST(req: NextRequest) {
  if (!guard(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { name, password } = await req.json()
  if (!name?.trim() || !password)
    return Response.json({ error: 'Nombre y contraseña requeridos' }, { status: 400 })
  const user = await createAdmin(name.trim(), password, 'Resta3')
  if (!user)
    return Response.json({ error: 'Ese nombre ya está en uso' }, { status: 409 })
  return Response.json({ id: user.id, name: user.name, role: user.role, createdAt: user.createdAt })
}

export async function DELETE(req: NextRequest) {
  if (!guard(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id requerido' }, { status: 400 })
  const user = await getAdminById(id)
  if (!user || user.role !== 'Resta3')
    return Response.json({ error: 'Usuario Resta3 no encontrado' }, { status: 404 })
  await deleteAdmin(id)
  return Response.json({ ok: true })
}
