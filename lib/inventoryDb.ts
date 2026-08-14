import { query, toIso } from './mysql'
import { randomUUID } from 'node:crypto'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export interface InventoryItem {
  id: string
  name: string
  category: string
  stock: number
  minStock: number // umbral mínimo: cuando stock < minStock, se muestra alerta en el panel
  unit: string
  cost: number
  updatedAt: string
}

function toItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    name: row.name as string,
    category: (row.category as string) ?? 'General',
    stock: row.stock as number,
    minStock: row.min_stock as number,
    unit: (row.unit as string) ?? 'pz',
    cost: row.cost as number,
    updatedAt: toIso(row.updated_at)!,
  }
}

export async function getAllInventory(): Promise<InventoryItem[]> {
  const rows = await query('SELECT * FROM inventory WHERE restaurant_id = ? ORDER BY category, name', [RID])
  return rows.map(toItem)
}

export async function updateStock(id: string, stock: number): Promise<InventoryItem | null> {
  await query('UPDATE inventory SET stock = ?, updated_at = ? WHERE id = ?', [stock, new Date(), id])
  const rows = await query('SELECT * FROM inventory WHERE id = ? LIMIT 1', [id])
  return rows[0] ? toItem(rows[0]) : null
}

export async function createInventoryItem(data: Omit<InventoryItem, 'id' | 'updatedAt'>): Promise<InventoryItem> {
  const id = randomUUID()
  const updatedAt = new Date()
  await query(
    `INSERT INTO inventory (id, name, category, stock, min_stock, unit, cost, updated_at, restaurant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.category, data.stock, data.minStock, data.unit, data.cost, updatedAt, RID],
  )
  return toItem({
    id, name: data.name, category: data.category, stock: data.stock,
    min_stock: data.minStock, unit: data.unit, cost: data.cost, updated_at: updatedAt,
  })
}

export async function updateInventoryItem(id: string, data: Partial<Omit<InventoryItem, 'id' | 'updatedAt'>>): Promise<InventoryItem | null> {
  const sets: string[] = ['updated_at = ?']
  const params: unknown[] = [new Date()]
  if (data.name !== undefined)     { sets.push('name = ?'); params.push(data.name) }
  if (data.category !== undefined) { sets.push('category = ?'); params.push(data.category) }
  if (data.stock !== undefined)    { sets.push('stock = ?'); params.push(data.stock) }
  if (data.minStock !== undefined) { sets.push('min_stock = ?'); params.push(data.minStock) }
  if (data.unit !== undefined)     { sets.push('unit = ?'); params.push(data.unit) }
  if (data.cost !== undefined)     { sets.push('cost = ?'); params.push(data.cost) }
  params.push(id)
  await query(`UPDATE inventory SET ${sets.join(', ')} WHERE id = ?`, params)
  const rows = await query('SELECT * FROM inventory WHERE id = ? LIMIT 1', [id])
  return rows[0] ? toItem(rows[0]) : null
}

export async function deleteInventoryItem(id: string): Promise<boolean> {
  await query('DELETE FROM inventory WHERE id = ?', [id])
  return true
}
