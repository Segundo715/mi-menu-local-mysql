import { query, toIso } from './mysql'
import { randomUUID } from 'node:crypto'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export type TableStatus = 'libre' | 'ocupada' | 'reservada' | 'limpieza'

export interface RestaurantTable {
  id: string
  label: string
  seats: number
  status: TableStatus
  customer?: string
  since?: string
  zone: string
  updatedAt: string
}

function toTable(row: Record<string, unknown>): RestaurantTable {
  return {
    id: row.id as string,
    label: row.label as string,
    seats: row.seats as number,
    status: row.status as TableStatus,
    customer: (row.customer as string) || undefined,
    since: (row.since as string) || undefined,
    zone: (row.zone as string) ?? 'Salón',
    updatedAt: toIso(row.updated_at)!,
  }
}

export async function getAllTables(): Promise<RestaurantTable[]> {
  const rows = await query('SELECT * FROM tables WHERE restaurant_id = ? ORDER BY label', [RID])
  return rows.map(toTable)
}

export async function updateTable(id: string, patch: Partial<Pick<RestaurantTable, 'status' | 'customer' | 'since' | 'label' | 'seats' | 'zone'>>): Promise<RestaurantTable | null> {
  const sets: string[] = []
  const params: unknown[] = []
  if (patch.status !== undefined)   { sets.push('status = ?'); params.push(patch.status) }
  if (patch.customer !== undefined) { sets.push('customer = ?'); params.push(patch.customer) }
  if (patch.since !== undefined)    { sets.push('since = ?'); params.push(patch.since) }
  if (patch.label !== undefined)    { sets.push('label = ?'); params.push(patch.label) }
  if (patch.seats !== undefined)    { sets.push('seats = ?'); params.push(patch.seats) }
  if (patch.zone !== undefined)     { sets.push('zone = ?'); params.push(patch.zone) }
  sets.push('updated_at = ?')
  params.push(new Date())
  params.push(id)
  await query(`UPDATE tables SET ${sets.join(', ')} WHERE id = ?`, params)
  const rows = await query('SELECT * FROM tables WHERE id = ? LIMIT 1', [id])
  return rows[0] ? toTable(rows[0]) : null
}

export async function createTable(data: Omit<RestaurantTable, 'id' | 'updatedAt'>): Promise<RestaurantTable> {
  const id = randomUUID()
  const updatedAt = new Date()
  await query(
    `INSERT INTO tables (id, label, seats, status, customer, since, zone, updated_at, restaurant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.label, data.seats, data.status, data.customer ?? null, data.since ?? null, data.zone, updatedAt, RID],
  )
  return toTable({
    id, label: data.label, seats: data.seats, status: data.status,
    customer: data.customer ?? null, since: data.since ?? null, zone: data.zone, updated_at: updatedAt,
  })
}

export async function deleteTable(id: string): Promise<boolean> {
  await query('DELETE FROM tables WHERE id = ?', [id])
  return true
}
