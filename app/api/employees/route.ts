import { NextRequest } from 'next/server'
import { verifySession } from '@/lib/auth'
import { listEmployees, createEmployee, deleteEmployee, countEmployees, getEmployeeById } from '@/lib/employeeDb'

export async function GET(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  return Response.json(await listEmployees())
}

export async function POST(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { name, password, role } = await req.json()
  if (!name?.trim() || !password)
    return Response.json({ error: 'Nombre y contraseña requeridos' }, { status: 400 })

  const emp = await createEmployee(name.trim(), password, role ?? 'Mesero')
  if (!emp)
    return Response.json({ error: 'Ese nombre ya está en uso' }, { status: 409 })

  return Response.json({ id: emp.id, name: emp.name, role: emp.role, createdAt: emp.createdAt })
}

export async function DELETE(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id requerido' }, { status: 400 })

  if (!(await getEmployeeById(id)))
    return Response.json({ error: 'Empleado no encontrado' }, { status: 404 })

  await deleteEmployee(id)
  return Response.json({ ok: true })
}
