import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { createAdmin, authenticateAdmin, countAdmins } from '@/lib/adminDb'

async function pingSuperAdmin() {
  const url = process.env.SUPERADMIN_URL
  const key = process.env.NICHO_REGISTER_KEY
  const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'chubis'
  if (!url || !key) return
  const users = await countAdmins().catch(() => 1)
  fetch(`${url}/api/public/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, restaurantId: rid, name: 'Chubis', users }),
  }).catch(() => {})
}

// Login y registro del admin en un solo endpoint; se distinguen por el campo "action".
export async function POST(req: NextRequest) {
  const { action, name, password } = await req.json()

  if (!name?.trim() || !password)
    return NextResponse.json({ error: 'Nombre y contraseña requeridos' }, { status: 400 })

  if (action === 'register') {
    const admin = await createAdmin(name.trim(), password)
    if (!admin)
      return NextResponse.json({ error: 'Ese nombre ya está en uso' }, { status: 409 })
    const res = NextResponse.json({ ok: true, name: admin.name })
    // admin_session es HttpOnly (no accesible por JS), admin_name no lo es para mostrarlo en el UI.
    res.cookies.set('admin_session', createSession(admin.id), { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 86400 })
    res.cookies.set('admin_name', admin.name, { path: '/', sameSite: 'lax', maxAge: 86400 })
    return res
  }

  const admin = await authenticateAdmin(name.trim(), password)
  if (!admin || admin.role === 'Resta3')
    return NextResponse.json({ error: 'Nombre o contraseña incorrectos' }, { status: 401 })

  pingSuperAdmin()
  const res = NextResponse.json({ ok: true, name: admin.name })
  res.cookies.set('admin_session', createSession(admin.id), { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 86400 })
  res.cookies.set('admin_name', admin.name, { path: '/', sameSite: 'lax', maxAge: 86400 })
  return res
}

// Cierra sesión eliminando ambas cookies.
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_session', '', { path: '/', maxAge: 0 })
  res.cookies.set('admin_name', '', { path: '/', maxAge: 0 })
  return res
}
