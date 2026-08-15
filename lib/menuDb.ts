import { getDb } from './mongodb'
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

interface MenuItemDoc {
  _id: string
  name: string
  description: string
  price: number
  category: string
  imageUrl: string | null
  available: boolean
  likes: number
  createdAt: Date
  restaurantId: string
}

function toItem(doc: MenuItemDoc): MenuItem {
  return {
    id: doc._id,
    name: doc.name,
    description: doc.description ?? '',
    price: doc.price,
    category: doc.category,
    imageUrl: doc.imageUrl ?? undefined,
    available: Boolean(doc.available),
    likes: doc.likes ?? 0,
    createdAt: doc.createdAt.toISOString(),
  }
}

async function col() {
  return (await getDb()).collection<MenuItemDoc>('menu_items')
}

export async function getAllMenuItems(): Promise<MenuItem[]> {
  const docs = await (await col()).find({ restaurantId: RID }).sort({ createdAt: 1 }).toArray()
  return docs.map(toItem)
}

export async function createMenuItem(data: Omit<MenuItem, 'id' | 'createdAt'>): Promise<MenuItem> {
  const doc: MenuItemDoc = {
    _id: randomUUID(),
    name: data.name,
    description: data.description,
    price: data.price,
    category: data.category,
    imageUrl: data.imageUrl ?? null,
    available: data.available,
    likes: data.likes ?? 0,
    createdAt: new Date(),
    restaurantId: RID,
  }
  await (await col()).insertOne(doc)
  return toItem(doc)
}

export async function updateMenuItem(id: string, data: Partial<Omit<MenuItem, 'id' | 'createdAt'>>): Promise<MenuItem | null> {
  const set: Partial<MenuItemDoc> = {}
  if (data.name !== undefined)        set.name = data.name
  if (data.description !== undefined) set.description = data.description
  if (data.price !== undefined)       set.price = data.price
  if (data.category !== undefined)    set.category = data.category
  if (data.imageUrl !== undefined)    set.imageUrl = data.imageUrl
  if (data.available !== undefined)   set.available = data.available
  if (data.likes !== undefined)       set.likes = data.likes
  if (Object.keys(set).length > 0) {
    await (await col()).updateOne({ _id: id }, { $set: set })
  }
  const doc = await (await col()).findOne({ _id: id })
  return doc ? toItem(doc) : null
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  await (await col()).deleteOne({ _id: id })
  return true
}
