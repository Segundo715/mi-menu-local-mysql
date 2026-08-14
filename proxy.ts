import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protege todas las rutas /admin excepto la página de login.
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = req.cookies.get('admin_session')?.value
    if (!verifySession(session))
      return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  // Solo ejecutamos el proxy en las rutas que realmente necesitan protección.
  matcher: ['/admin', '/admin/:path*'],
}
