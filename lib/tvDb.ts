import { query, toIso } from './mysql'
import { randomUUID } from 'node:crypto'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export interface TVSlide {
  id: string
  title: string
  subtitle?: string
  price?: string
  imageUrl?: string
  isOffer: boolean
  order: number
  active: boolean
  createdAt: string
}

function toSlide(row: Record<string, unknown>): TVSlide {
  return {
    id: row.id as string,
    title: row.title as string,
    subtitle: (row.subtitle as string) ?? undefined,
    price: (row.price as string) ?? undefined,
    imageUrl: (row.image_url as string) ?? undefined,
    isOffer: Boolean(row.is_offer),
    order: row.slide_order as number,
    active: Boolean(row.active),
    createdAt: toIso(row.created_at)!,
  }
}

export async function getAllSlides(): Promise<TVSlide[]> {
  const rows = await query('SELECT * FROM tv_slides WHERE restaurant_id = ? ORDER BY slide_order', [RID])
  return rows.map(toSlide)
}

// Solo las slides activas se muestran en la pantalla TV del restaurante.
export async function getActiveSlides(): Promise<TVSlide[]> {
  const rows = await query(
    'SELECT * FROM tv_slides WHERE restaurant_id = ? AND active = true ORDER BY slide_order',
    [RID],
  )
  return rows.map(toSlide)
}

export async function createSlide(data: Omit<TVSlide, 'id' | 'createdAt' | 'order'>): Promise<TVSlide> {
  // El orden se asigna al final de la lista actual (0-based), filtrado por restaurante.
  const [{ count }] = await query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM tv_slides WHERE restaurant_id = ?',
    [RID],
  )
  const id = randomUUID()
  const createdAt = new Date()
  await query(
    `INSERT INTO tv_slides (id, title, subtitle, price, image_url, is_offer, slide_order, active, created_at, restaurant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.title, data.subtitle ?? null, data.price ?? null, data.imageUrl ?? null, data.isOffer, count ?? 0, data.active, createdAt, RID],
  )
  return toSlide({
    id, title: data.title, subtitle: data.subtitle ?? null, price: data.price ?? null,
    image_url: data.imageUrl ?? null, is_offer: data.isOffer, slide_order: count ?? 0,
    active: data.active, created_at: createdAt,
  })
}

export async function updateSlide(id: string, data: Partial<TVSlide>): Promise<TVSlide | null> {
  const sets: string[] = []
  const params: unknown[] = []
  if (data.title !== undefined)    { sets.push('title = ?'); params.push(data.title) }
  if (data.subtitle !== undefined) { sets.push('subtitle = ?'); params.push(data.subtitle) }
  if (data.price !== undefined)    { sets.push('price = ?'); params.push(data.price) }
  if (data.imageUrl !== undefined) { sets.push('image_url = ?'); params.push(data.imageUrl) }
  if (data.isOffer !== undefined)  { sets.push('is_offer = ?'); params.push(data.isOffer) }
  if (data.order !== undefined)    { sets.push('slide_order = ?'); params.push(data.order) }
  if (data.active !== undefined)   { sets.push('active = ?'); params.push(data.active) }
  if (sets.length > 0) {
    params.push(id)
    await query(`UPDATE tv_slides SET ${sets.join(', ')} WHERE id = ?`, params)
  }
  const rows = await query('SELECT * FROM tv_slides WHERE id = ? LIMIT 1', [id])
  return rows[0] ? toSlide(rows[0]) : null
}

export async function deleteSlide(id: string): Promise<boolean> {
  await query('DELETE FROM tv_slides WHERE id = ?', [id])
  return true
}
