import { getDb } from './mongodb'
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

interface ReviewDoc {
  _id: string
  customerName: string
  rating: number
  comment: string
  published: boolean
  bad: boolean
  createdAt: Date
  restaurantId: string
}

function toReview(doc: ReviewDoc): Review {
  return {
    id: doc._id,
    customerName: doc.customerName,
    rating: doc.rating,
    comment: doc.comment ?? '',
    createdAt: doc.createdAt.toISOString(),
    published: Boolean(doc.published),
    bad: Boolean(doc.bad),
  }
}

async function col() {
  return (await getDb()).collection<ReviewDoc>('reviews')
}

export async function getAllReviews(): Promise<Review[]> {
  const docs = await (await col()).find({ restaurantId: RID }).sort({ createdAt: -1 }).toArray()
  return docs.map(toReview)
}

export async function getPublishedReviews(): Promise<Review[]> {
  const docs = await (await col()).find({ restaurantId: RID, published: true }).sort({ createdAt: -1 }).toArray()
  return docs.map(toReview)
}

export async function createReview(data: Pick<Review, 'customerName' | 'rating' | 'comment'>): Promise<Review> {
  // Rating ≤ 3 → reseña negativa (dispara alerta por email al admin).
  const bad = data.rating <= 3
  // Rating ≥ 4 → se publica automáticamente en el menú público.
  const published = data.rating >= 4
  const doc: ReviewDoc = {
    _id: randomUUID(),
    customerName: data.customerName,
    rating: data.rating,
    comment: data.comment,
    bad,
    published,
    createdAt: new Date(),
    restaurantId: RID,
  }
  await (await col()).insertOne(doc)
  return toReview(doc)
}

export async function updateReview(id: string, patch: Partial<Review>): Promise<Review | null> {
  const set: Partial<ReviewDoc> = {}
  if (patch.published !== undefined) set.published = patch.published
  if (patch.bad !== undefined)       set.bad = patch.bad
  if (patch.comment !== undefined)   set.comment = patch.comment
  if (Object.keys(set).length > 0) {
    await (await col()).updateOne({ _id: id }, { $set: set })
  }
  const doc = await (await col()).findOne({ _id: id })
  return doc ? toReview(doc) : null
}

export async function deleteReview(id: string): Promise<boolean> {
  await (await col()).deleteOne({ _id: id })
  return true
}
