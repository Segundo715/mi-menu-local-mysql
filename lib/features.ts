import { getDb } from './mongodb'

// Catálogo de todas las features del sistema.
// El SuperAdmin activa/desactiva estos módulos por restaurante desde mi-superadmindrestaurante.
export const FEATURES = {
  dashboard:       { label: 'Dashboard',         emoji: '🏠' },
  orders:          { label: 'Pedidos',           emoji: '📋' },
  menu:            { label: 'Menú',              emoji: '🍽' },
  reviews:         { label: 'Reseñas',           emoji: '⭐' },
  tv:              { label: 'Pantalla TV',       emoji: '📺' },
  customers:       { label: 'Clientes',          emoji: '👥' },
  analytics:       { label: 'Analytics',         emoji: '📊' },
  loyaltyCard:     { label: 'Tarjeta Lealtad',   emoji: '☕' },
  favorites:       { label: 'Favoritos',         emoji: '❤️'  },
  ventas:          { label: 'Ventas',            emoji: '💰' },
  marketing:       { label: 'Marketing',         emoji: '📣' },
  crm:             { label: 'CRM',               emoji: '🤝' },
  reservaciones:   { label: 'Reservaciones',     emoji: '📅' },
  operaciones:     { label: 'Operaciones',       emoji: '🏭' },
  automatizaciones:{ label: 'Automatizaciones',  emoji: '🤖' },
  contenido:       { label: 'Contenido',         emoji: '🖼'  },
  produccion:      { label: 'Producción',        emoji: '📦' },
  reportes:        { label: 'Reportes',          emoji: '📑' },
  configuracion:   { label: 'Configuración',     emoji: '⚙️'  },
  cumpleanos:      { label: 'Cumpleaños',        emoji: '🎂' },
} as const

export type FeatureKey = keyof typeof FEATURES

export type FeatureFlags = Record<FeatureKey, boolean>

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID
  // Primero buscamos flags específicos del restaurante; si no existen, usamos los globales.
  // Esto permite configuraciones por restaurante sin afectar a los demás.
  const keys = rid ? [`feature_flags_${rid}`, 'feature_flags'] : ['feature_flags']

  let overrides: Partial<FeatureFlags> = {}
  const settings = (await getDb()).collection<{ _id: string; value: string }>('settings')
  for (const key of keys) {
    const doc = await settings.findOne({ _id: key })
    if (doc?.value) { overrides = JSON.parse(doc.value); break }
  }

  // Si una feature no está en la base de datos, se asume habilitada por defecto.
  return Object.fromEntries(
    Object.keys(FEATURES).map(k => [k, overrides[k as FeatureKey] ?? true])
  ) as FeatureFlags
}
