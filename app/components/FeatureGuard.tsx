'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { FeatureKey } from '@/lib/features'

// Feature flags (admin + global)
const ROUTE_FEATURE: Record<string, string> = {
  '/admin/menu':           'menu',
  '/admin/reviews':        'reviews',
  '/admin/configuracion':  'configuracion',
  '/admin/sellar':         'loyaltyCard',
  '/admin/tarjetas':       'loyaltyCard',
}

const ADMIN_FALLBACKS = [
  { href: '/admin',               feature: 'loyaltyCard'     },
  { href: '/admin/orders',        feature: 'orders'          },
  { href: '/admin/menu',          feature: 'menu'            },
  { href: '/admin/reviews',       feature: 'reviews'         },
  { href: '/admin/configuracion', feature: 'configuracion'   },
]

// Componente invisible que corre en el cliente después de cada navegación.
// Si el SuperAdmin desactivó el módulo al que se intenta acceder, redirige al inicio.
export default function FeatureGuard() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Verificar feature flags del admin (incluyendo /admin = Fidelización)
    const feature = pathname === '/admin' ? 'loyaltyCard' : ROUTE_FEATURE[pathname]
    if (feature) {
      fetch('/api/features')
        .then(r => r.json())
        .then((flags: Record<FeatureKey, boolean>) => {
          if (flags[feature as FeatureKey] === false) {
            const next = ADMIN_FALLBACKS.find(f => f.href !== pathname && flags[f.feature as FeatureKey] !== false)
            router.replace(next?.href ?? '/admin/menu')
          }
        })
        .catch(() => {})
      return
    }

  }, [pathname, router])

  return null
}
