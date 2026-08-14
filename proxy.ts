import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/mysql'
import { verifySession } from '@/lib/auth'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'
function scopedKey(key: string) {
  return RID === 'default' ? key : `${RID}:${key}`
}

// Campos mínimos de identidad del restaurante que el onboarding debe llenar.
// El logo y el acento tienen dos posibles claves por la migración a
// "Identidad del restaurante" (menu_logo/menu_hover_color) — restaurantes viejos
// como portales siguen con las claves legacy (profile_logo/sidebar_accent), así
// que se acepta cualquiera de las dos para no forzarlos de vuelta al onboarding.
const ONBOARDING_KEYS = ['restaurant_name', 'menu_btn_color']
const ONBOARDING_KEY_GROUPS = [['profile_logo', 'menu_logo'], ['sidebar_accent', 'menu_hover_color']]

// Next.js 16: Proxy (antes "middleware") corre siempre en runtime Node.js, así
// que consultamos MySQL directo en vez del truco de fetch a una REST API.
// Si la consulta falla, no bloqueamos el acceso (fail-open) — esto es un gate de
// onboarding, no la autenticación real.
async function isOnboardingComplete(): Promise<boolean> {
  try {
    const allKeys = [...ONBOARDING_KEYS, ...ONBOARDING_KEY_GROUPS.flat()]
    const scopedKeys = allKeys.map(scopedKey)
    const placeholders = scopedKeys.map(() => '?').join(',')
    const rows = await query<{ key: string; value: string }>(
      `SELECT \`key\`, value FROM settings WHERE \`key\` IN (${placeholders})`,
      scopedKeys,
    )
    const map = new Map(rows.map(r => [r.key, r.value]))
    const has = (k: string) => (map.get(scopedKey(k)) ?? '').trim() !== ''
    return ONBOARDING_KEYS.every(has) && ONBOARDING_KEY_GROUPS.every(group => group.some(has))
  } catch {
    return true
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protege todas las rutas /admin excepto la página de login.
  // (mi-menu: solo Admin requiere login — Empleado y Resta3 quedan abiertos)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = req.cookies.get('admin_session')?.value
    if (!verifySession(session))
      return NextResponse.redirect(new URL('/admin/login', req.url))

    const complete = await isOnboardingComplete()
    if (!complete && pathname !== '/admin/onboarding')
      return NextResponse.redirect(new URL('/admin/onboarding', req.url))
    if (complete && pathname === '/admin/onboarding')
      return NextResponse.redirect(new URL('/admin/menu', req.url))
  }

  return NextResponse.next()
}

export const config = {
  // Solo ejecutamos el proxy en las rutas que realmente necesitan protección.
  matcher: ['/admin', '/admin/:path*'],
}
