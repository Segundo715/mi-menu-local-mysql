import { query } from '@/lib/mysql'
import { getFeatureFlags } from '@/lib/features'

// Sin caché: el SuperAdmin necesita ver y cambiar el estado en tiempo real.
const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

// CORS restringido al dominio del SuperAdmin para que ningún otro origen pueda
// leer ni modificar los feature flags de producción.
const CORS = {
  'Access-Control-Allow-Origin': 'https://mi-superadmindrestaurante.vercel.app',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  ...NO_CACHE,
}

// Preflight para las peticiones cross-origin del SuperAdmin.
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

// Devuelve los flags actuales (usados por el SuperAdmin al cargar la vista).
export async function GET() {
  const flags = await getFeatureFlags()
  return Response.json(flags, { headers: CORS })
}

export async function POST(req: Request) {
  const body = await req.json()
  // settingsKey permite guardar flags de diferentes módulos (feature_flags, feature_flags_resta3…)
  const settingsKey: string = body.settingsKey ?? 'feature_flags'
  const flags = body.flags ?? body

  // upsert: crea la fila si no existe, la actualiza si ya existe.
  try {
    await query(
      'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
      [settingsKey, JSON.stringify(flags)],
    )
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500, headers: CORS })
  }
  return Response.json({ ok: true }, { headers: CORS })
}
