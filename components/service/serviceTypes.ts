// =============================================================================
// Modelo de datos del panel operativo (Servicio / Host)
// Cada "Party" es una reserva o grupo de clientes (fila del panel izquierdo).
// =============================================================================

export type PartyKind = "waitlist" | "reservation"

export type PartyStatus =
  | "waiting"   // en lista de espera, sin mesa
  | "reserved"  // reserva futura confirmada
  | "arrived"   // llegó, esperando que se libere/asigne mesa
  | "seated"    // sentados, ocupando una mesa
  | "no_show"   // no se presentó
  | "finished"  // terminó el servicio

export type Party = {
  id: string
  name: string
  kind: PartyKind
  size: number            // comensales
  phone?: string
  tableId?: string | null // mesa asignada (id de RestaurantTable)
  tableName?: string      // nombre legible de la mesa asignada
  arrival: string         // HH:MM — hora de llegada (waitlist) u hora de reserva
  seatedSince?: string    // HH:MM — cuándo se sentaron (para calcular permanencia)
  quotedWait?: number     // min estimados de espera (waitlist)
  notes?: string
  status: PartyStatus
}

export const PARTY_STATUS_META: Record<
  PartyStatus,
  { label: string; color: string }
> = {
  waiting:  { label: "En espera", color: "#f59e0b" },
  reserved: { label: "Reservada", color: "#3b82f6" },
  arrived:  { label: "Llegó",     color: "#06b6d4" },
  seated:   { label: "Sentados",  color: "#22c55e" },
  no_show:  { label: "No llegó",  color: "#ef4444" },
  finished: { label: "Finalizó",  color: "#6b7280" },
}

export const newPartyId = () =>
  "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

/** Minutos transcurridos desde una hora "HH:MM" hasta `now` (mismo día). */
export function minutesSince(hhmm: string | undefined, now: Date): number {
  if (!hhmm) return 0
  const [h, m] = hhmm.split(":").map(Number)
  const then = new Date(now)
  then.setHours(h || 0, m || 0, 0, 0)
  const diff = Math.round((now.getTime() - then.getTime()) / 60000)
  return diff
}

/** Formatea minutos a "1h 05m" / "45m". Negativo = faltan X (reserva futura). */
export function formatDuration(min: number): string {
  const sign = min < 0 ? "-" : ""
  const a = Math.abs(min)
  const h = Math.floor(a / 60)
  const m = a % 60
  return h > 0 ? `${sign}${h}h ${String(m).padStart(2, "0")}m` : `${sign}${m}m`
}

/** Datos de ejemplo para arrancar el panel. */
export function seedParties(): Party[] {
  return [
    { id: newPartyId(), name: "Familia Ortega",  kind: "waitlist",    size: 4, phone: "555-1010", arrival: "13:05", quotedWait: 20, status: "waiting",  notes: "Cerca de ventana" },
    { id: newPartyId(), name: "Grupo Diego",     kind: "waitlist",    size: 2, phone: "555-2020", arrival: "13:12", quotedWait: 10, status: "waiting" },
    { id: newPartyId(), name: "Mesa caminando",  kind: "waitlist",    size: 6, phone: "555-3030", arrival: "13:18", quotedWait: 35, status: "arrived" },
    { id: newPartyId(), name: "Carlos Mendoza",  kind: "reservation", size: 4, phone: "555-1234", arrival: "13:00", status: "seated", seatedSince: "13:02", notes: "Aniversario" },
    { id: newPartyId(), name: "Ana García",      kind: "reservation", size: 2, phone: "555-5678", arrival: "13:30", status: "reserved" },
    { id: newPartyId(), name: "Roberto Silva",   kind: "reservation", size: 6, phone: "555-9012", arrival: "14:00", status: "reserved", notes: "Cumpleaños" },
    { id: newPartyId(), name: "Patricia Torres", kind: "reservation", size: 8, phone: "555-2345", arrival: "16:00", status: "reserved", notes: "Evento corp." },
  ]
}
