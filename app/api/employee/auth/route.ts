import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { createEmployee, authenticateEmployee, listEmployees } from '@/lib/employeeDb'

// Login y registro del empleado. Mismo patrón que /api/auth pero con employee_session.

// Lista de empleados para el panel de gestión de turnos de RESTA3 (sin datos sensibles).
export async function GET() {
  return NextResponse.json(await listEmployees())
}

export async function POST(req: NextRequest) {
  const { action, name, password } = await req.json()

  if (!name?.trim() || !password)
    return NextResponse.json({ error: 'Nombre y contraseña requeridos' }, { status: 400 })

  if (action === 'register') {
    const employee = await createEmployee(name.trim(), password)
    if (!employee)
      return NextResponse.json({ error: 'Ese nombre ya está en uso' }, { status: 409 })
    const res = NextResponse.json({ ok: true, name: employee.name })
    res.cookies.set('employee_session', createSession(employee.id), { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 86400 })
    res.cookies.set('employee_name', employee.name, { path: '/', sameSite: 'lax', maxAge: 86400 })
    return res
  }

  const employee = await authenticateEmployee(name.trim(), password)
  if (!employee)
    return NextResponse.json({ error: 'Nombre o contraseña incorrectos' }, { status: 401 })

  const res = NextResponse.json({ ok: true, name: employee.name })
  res.cookies.set('employee_session', createSession(employee.id), { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 86400 })
  res.cookies.set('employee_name', employee.name, { path: '/', sameSite: 'lax', maxAge: 86400 })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('employee_session', '', { path: '/', maxAge: 0 })
  res.cookies.set('employee_name', '', { path: '/', maxAge: 0 })
  return res
}
