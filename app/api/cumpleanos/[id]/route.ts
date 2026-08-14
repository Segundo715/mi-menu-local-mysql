import { NextRequest, NextResponse } from 'next/server'
import { deleteBirthday } from '@/lib/birthdayDb'
import { verifySession } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const jar = await cookies()
  const session = jar.get('admin_session')?.value
  if (!verifySession(session)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { id } = await params
  await deleteBirthday(id)
  return NextResponse.json({ ok: true })
}
