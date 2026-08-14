import { query, toIso } from './mysql'
import { randomUUID } from 'node:crypto'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export interface Review {
  id: string
  customerName: string
  rating: number
  comment: string
  createdAt: string
  published: boolean
  bad: boolean
}

function toReview(row: Record<string, unknown>): Review {
  return {
    id: row.id as string,
    customerName: row.customer_name as string,
    rating: row.rating as number,
    comment: (row.comment as string) ?? '',
    createdAt: toIso(row.created_at)!,
    published: Boolean(row.published),
    bad: Boolean(row.bad),
  }
}

export async function getAllReviews(): Promise<Review[]> {
  const rows = await query('SELECT * FROM reviews WHERE restaurant_id = ? ORDER BY created_at DESC', [RID])
  return rows.map(toReview)
}

export async function getPublishedReviews(): Promise<Review[]> {
  const rows = await query(
    'SELECT * FROM reviews WHERE restaurant_id = ? AND published = true ORDER BY created_at DESC',
    [RID],
  )
  return rows.map(toReview)
}

export async function createReview(data: Pick<Review, 'customerName' | 'rating' | 'comment'>): Promise<Review> {
  const id = randomUUID()
  const createdAt = new Date()
  // Rating ≤ 3 → reseña negativa (dispara alerta por email al admin).
  const bad = data.rating <= 3
  // Rating ≥ 4 → se publica automáticamente en el menú público.
  const published = data.rating >= 4
  await query(
    `INSERT INTO reviews (id, customer_name, rating, comment, bad, published, created_at, restaurant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.customerName, data.rating, data.comment, bad, published, createdAt, RID],
  )
  return toReview({
    id, customer_name: data.customerName, rating: data.rating, comment: data.comment,
    bad, published, created_at: createdAt,
  })
}

export async function updateReview(id: string, patch: Partial<Review>): Promise<Review | null> {
  const sets: string[] = []
  const params: unknown[] = []
  if (patch.published !== undefined) { sets.push('published = ?'); params.push(patch.published) }
  if (patch.bad !== undefined)       { sets.push('bad = ?'); params.push(patch.bad) }
  if (patch.comment !== undefined)   { sets.push('comment = ?'); params.push(patch.comment) }
  if (sets.length > 0) {
    params.push(id)
    await query(`UPDATE reviews SET ${sets.join(', ')} WHERE id = ?`, params)
  }
  const rows = await query('SELECT * FROM reviews WHERE id = ? LIMIT 1', [id])
  return rows[0] ? toReview(rows[0]) : null
}

export async function deleteReview(id: string): Promise<boolean> {
  await query('DELETE FROM reviews WHERE id = ?', [id])
  return true
}
