import { NextRequest } from 'next/server'
import { getActiveSlides, getAllSlides, createSlide } from '@/lib/tvDb'
import { verifySession } from '@/lib/auth'

// El admin ve todas las slides (incluyendo inactivas). La pantalla TV solo recibe las activas.
export async function GET(req: NextRequest) {
  const isAdmin = verifySession(req.cookies.get('admin_session')?.value)
  return Response.json(isAdmin ? await getAllSlides() : await getActiveSlides())
}

export async function POST(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  const data = await req.json()
  return Response.json(
    await createSlide({ ...data, active: data.active ?? true }),
    { status: 201 }
  )
}
