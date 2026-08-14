import { query, toIso } from './mysql'
import { randomUUID } from 'node:crypto'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  imageUrl?: string
  available: boolean
  likes: number
  createdAt: string
}

function toItem(row: Record<string, unknown>): MenuItem {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    price: row.price as number,
    category: row.category as string,
    imageUrl: (row.image_url as string) ?? undefined,
    available: Boolean(row.available),
    likes: (row.likes as number) ?? 0,
    createdAt: toIso(row.created_at)!,
  }
}

export async function getAllMenuItems(): Promise<MenuItem[]> {
  const rows = await query('SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY created_at', [RID])
  return rows.map(toItem)
}

export async function createMenuItem(data: Omit<MenuItem, 'id' | 'createdAt'>): Promise<MenuItem> {
  const id = randomUUID()
  const createdAt = new Date()
  await query(
    `INSERT INTO menu_items (id, name, description, price, category, image_url, available, likes, created_at, restaurant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.description, data.price, data.category, data.imageUrl ?? null, data.available, data.likes ?? 0, createdAt, RID],
  )
  return toItem({
    id, name: data.name, description: data.description, price: data.price, category: data.category,
    image_url: data.imageUrl ?? null, available: data.available, likes: data.likes ?? 0, created_at: createdAt,
  })
}

export async function updateMenuItem(id: string, data: Partial<Omit<MenuItem, 'id' | 'createdAt'>>): Promise<MenuItem | null> {
  // Construimos el patch solo con los campos definidos para no sobreescribir con undefined.
  const sets: string[] = []
  const params: unknown[] = []
  if (data.name !== undefined)        { sets.push('name = ?'); params.push(data.name) }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description) }
  if (data.price !== undefined)       { sets.push('price = ?'); params.push(data.price) }
  if (data.category !== undefined)    { sets.push('category = ?'); params.push(data.category) }
  if (data.imageUrl !== undefined)    { sets.push('image_url = ?'); params.push(data.imageUrl) }
  if (data.available !== undefined)   { sets.push('available = ?'); params.push(data.available) }
  if (data.likes !== undefined)       { sets.push('likes = ?'); params.push(data.likes) }
  if (sets.length > 0) {
    params.push(id)
    await query(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = ?`, params)
  }
  const rows = await query('SELECT * FROM menu_items WHERE id = ? LIMIT 1', [id])
  return rows[0] ? toItem(rows[0]) : null
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  await query('DELETE FROM menu_items WHERE id = ?', [id])
  return true
}
