// =============================================================================
// Modelo de datos del Editor Visual de Plano de Mesas
// =============================================================================

export type TableType = "round" | "square" | "rectangle" | "bar"

export type TableStatus =
  | "free"
  | "occupied"
  | "reserved"
  | "cleaning"
  | "bill"
  | "blocked"

export type RestaurantTable = {
  id: string
  dbId?: string   // UUID de la tabla en Supabase; cuando existe, el estado se sincroniza con la DB
  name: string
  type: TableType
  capacity: number
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zone: string
  status: TableStatus
}

export type FloorPlan = {
  id: string
  restaurantId: string
  name: string
  width: number
  height: number
  tables: RestaurantTable[]
}

// -----------------------------------------------------------------------------
// Metadatos de presentación (colores, etiquetas, defaults). No son tipos: se
// usan tanto en el canvas (Konva) como en los paneles de UI.
// -----------------------------------------------------------------------------

export const STATUS_META: Record<
  TableStatus,
  { label: string; color: string; ring: string }
> = {
  free:     { label: "Libre",            color: "#22c55e", ring: "rgba(34,197,94,0.45)" },
  occupied: { label: "Ocupada",          color: "#ef4444", ring: "rgba(239,68,68,0.45)" },
  reserved: { label: "Reservada",        color: "#f59e0b", ring: "rgba(245,158,11,0.45)" },
  cleaning: { label: "Limpieza",         color: "#3b82f6", ring: "rgba(59,130,246,0.45)" },
  bill:     { label: "Cuenta solicitada",color: "#a855f7", ring: "rgba(168,85,247,0.45)" },
  blocked:  { label: "Bloqueada",        color: "#6b7280", ring: "rgba(107,114,128,0.45)" },
}

export const TYPE_META: Record<
  TableType,
  { label: string; emoji: string; defaultWidth: number; defaultHeight: number; defaultCapacity: number }
> = {
  round:     { label: "Redonda",     emoji: "⭕", defaultWidth: 80,  defaultHeight: 80, defaultCapacity: 4 },
  square:    { label: "Cuadrada",    emoji: "⬜", defaultWidth: 70,  defaultHeight: 70, defaultCapacity: 2 },
  rectangle: { label: "Rectangular", emoji: "▭",  defaultWidth: 130, defaultHeight: 70, defaultCapacity: 6 },
  bar:       { label: "Barra",       emoji: "🍸", defaultWidth: 180, defaultHeight: 42, defaultCapacity: 8 },
}

export const STATUS_ORDER: TableStatus[] = [
  "free", "occupied", "reserved", "cleaning", "bill", "blocked",
]

export const TYPE_ORDER: TableType[] = ["round", "square", "rectangle", "bar"]

// Clave de localStorage donde se persiste el plano completo.
export const FLOOR_PLAN_STORAGE_KEY = "floor_plan_v1"

// Genera un id corto y único para una mesa.
export const newTableId = () =>
  "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
