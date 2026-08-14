'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { FeatureKey } from '@/lib/features'

// Feature flags (admin + global)
const ROUTE_FEATURE: Record<string, string> = {
  '/admin/analytics':        'analytics',
  '/admin/estadisticas':     'analytics',
  '/admin/marketing':        'marketing',
  '/admin/crm':              'crm',
  '/admin/reservaciones':    'reservaciones',
  '/admin/ventas':           'ventas',
  '/admin/menu':             'menu',
  '/admin/operaciones':      'operaciones',
  '/admin/tv':               'tv',
  '/admin/automatizaciones': 'automatizaciones',
  '/admin/contenido':        'contenido',
  '/admin/produccion':       'produccion',
  '/admin/reportes':         'reportes',
  '/admin/configuracion':    'configuracion',
  '/admin/reviews':          'reviews',
  '/admin/sellar':           'loyaltyCard',
  '/admin/tarjetas':         'loyaltyCard',
  '/admin/cumpleanos':       'cumpleanos',
}

const ADMIN_FALLBACKS = [
  { href: '/admin',               feature: 'loyaltyCard'     },
  { href: '/admin/orders',        feature: 'orders'          },
  { href: '/admin/menu',          feature: 'menu'            },
  { href: '/admin/tv',            feature: 'tv'              },
  { href: '/admin/produccion',    feature: 'produccion'      },
  { href: '/admin/ventas',        feature: 'ventas'          },
  { href: '/admin/marketing',     feature: 'marketing'       },
  { href: '/admin/analytics',     feature: 'analytics'       },
  { href: '/admin/crm',           feature: 'crm'             },
  { href: '/admin/reservaciones', feature: 'reservaciones'   },
  { href: '/admin/operaciones',   feature: 'operaciones'     },
  { href: '/admin/automatizaciones', feature: 'automatizaciones' },
  { href: '/admin/contenido',     feature: 'contenido'       },
  { href: '/admin/reportes',      feature: 'reportes'        },
  { href: '/admin/reviews',       feature: 'reviews'         },
  { href: '/admin/configuracion', feature: 'configuracion'   },
  { href: '/admin/cumpleanos',    feature: 'cumpleanos'      },
]

// Employee module permissions
const EMPLOYEE_ROUTE_MODULE: Record<string, string> = {
  '/employee/orders':    'emp_pedidos',
  '/employee/menu':      'emp_menu_ver',
  '/employee/recipes':   'emp_recetario',
  '/employee/customers': 'emp_clientes_ver',
  '/employee/tv':        'emp_pantalla_tv',
}

const EMPLOYEE_FALLBACKS = [
  { href: '/employee/orders',    feature: 'orders',     empModule: 'emp_pedidos'      },
  { href: '/employee/menu',      feature: 'menu',       empModule: 'emp_menu_ver'     },
  { href: '/employee/recipes',   feature: 'produccion', empModule: 'emp_recetario'    },
  { href: '/employee/customers', feature: 'customers',  empModule: 'emp_clientes_ver' },
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

    // /employee (Fidelización): si está deshabilitada redirige al primer módulo disponible
    if (pathname === '/employee') {
      Promise.all([
        fetch('/api/permissions').then(r => r.json()),
        fetch('/api/features').then(r => r.json()),
      ]).then(([perms, flags]) => {
        const emp = perms.employee ?? {}
        if (emp['emp_fidelizacion'] === false) {
          const next = EMPLOYEE_FALLBACKS.find(f =>
            flags[f.feature] !== false && emp[f.empModule] !== false
          )
          if (next) router.replace(next.href)
        }
      }).catch(() => {})
      return
    }

    // Verificar permisos del empleado
    const empModule = EMPLOYEE_ROUTE_MODULE[pathname]
    if (empModule) {
      fetch('/api/permissions')
        .then(r => r.json())
        .then((perms: { employee: Record<string, boolean>; user: Record<string, boolean> }) => {
          if (perms.employee[empModule] === false) router.replace('/employee')
        })
        .catch(() => {})
      return
    }

    // Verificar features de Resta3 (el segment de la URL coincide con el sufijo del flag)
    if (pathname.startsWith('/resta3/')) {
      const segment = pathname.split('/')[2] // tpv, mesas, cocina, etc.
      if (segment) {
        const fid = `r3_${segment}`
        fetch('/api/resta3/features')
          .then(r => r.json())
          .then((f: Record<string, boolean>) => {
            if (f[fid] === false) router.replace('/resta3')
          })
          .catch(() => {})
      }
      return
    }

    // Rutas de usuario/cliente: la visibilidad se maneja en CustomerNav, no con redirecciones.
  }, [pathname, router])

  return null
}
