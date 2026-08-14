'use client'

import { createContext, useContext } from 'react'
import type { FeatureFlags } from '@/lib/features'

// Datos del restaurante leídos en el servidor (layout) y propagados a todos los componentes cliente.
// Incluye nombre, logo, color del sidebar y qué features están activas.
export interface Brand {
  name: string
  logo: string
  logoColor: string
  logoBg: string
  accent: string
  features: FeatureFlags
}

const BrandContext = createContext<Brand>({ name: '', logo: '', logoColor: '', logoBg: '', accent: '', features: {} as FeatureFlags })

// Hook que usan los componentes para leer nombre, logo, accent y feature flags sin prop-drilling.
export function useBrand(): Brand {
  return useContext(BrandContext)
}

export default function BrandProvider({ value, children }: { value: Brand; children: React.ReactNode }) {
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
}
