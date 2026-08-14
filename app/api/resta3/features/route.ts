import { query } from '@/lib/mysql'

export const dynamic = 'force-dynamic'

const RESTA3_FEATURES = ['r3_dashboard','r3_tpv','r3_mesas','r3_cocina','r3_inventario','r3_compras','r3_empleados','r3_reportes']

export async function GET() {
  const rows = await query<{ value: string }>(
    "SELECT value FROM settings WHERE `key` = 'feature_flags_resta3' LIMIT 1",
  )

  const overrides: Record<string, boolean> = rows[0]?.value ? JSON.parse(rows[0].value) : {}
  // Si un flag no está en la base de datos, se habilita por defecto.
  const flags = Object.fromEntries(RESTA3_FEATURES.map(k => [k, overrides[k] ?? true]))

  return Response.json(flags, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  })
}
