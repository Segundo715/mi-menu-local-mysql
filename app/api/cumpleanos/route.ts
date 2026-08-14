import { NextRequest, NextResponse } from 'next/server'
import { getAllBirthdays, createBirthday } from '@/lib/birthdayDb'
import { verifySession } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  const jar = await cookies()
  const session = jar.get('admin_session')?.value
  if (!verifySession(session)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const registros = await getAllBirthdays()
  return NextResponse.json(registros)
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone, birthdate } = await req.json()
    if (!name?.trim() || !phone?.trim() || !birthdate) {
      return NextResponse.json({ error: 'Campos requeridos' }, { status: 400 })
    }
    const reg = await createBirthday(name.trim(), phone.trim(), birthdate)
    return NextResponse.json(reg, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('cumpleanos POST error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
