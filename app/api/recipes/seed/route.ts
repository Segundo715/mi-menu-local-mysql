import { NextRequest } from 'next/server'
import { verifySession } from '@/lib/auth'

// El catálogo de recetas ya fue migrado a Supabase.
// Este endpoint se mantiene por compatibilidad con el botón en /admin/recipes.
export async function POST(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })

  return Response.json({ ok: true, created: 0, updated: 0 })
}
