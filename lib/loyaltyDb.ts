import { getDb } from './mongodb'
import { randomUUID } from 'node:crypto'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export interface LoyaltyCard {
  id: string
  name: string
  phone: string
  visits: number
  active: boolean
  cardType: string
  expiresAt?: string
  registeredAt: string
  stamps: { timestamp: string; visitsAfter: number }[]
}

interface LoyaltyCardDoc {
  _id: string
  name: string
  phone: string
  visits: number
  active: boolean
  cardType: string
  expiresAt: Date | null
  registeredAt: Date
  stamps: LoyaltyCard['stamps']
  restaurantId: string
}

function toCard(doc: LoyaltyCardDoc): LoyaltyCard {
  return {
    id: doc._id,
    name: doc.name,
    phone: doc.phone ?? '',
    visits: doc.visits ?? 0,
    active: Boolean(doc.active),
    cardType: doc.cardType ?? 'cafe',
    expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : undefined,
    registeredAt: doc.registeredAt.toISOString(),
    stamps: doc.stamps ?? [],
  }
}

// Las tarjetas expiran según los meses configurados por categoría (default 3 meses).
function expiryDate(months = 3): Date {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d
}

async function col() {
  return (await getDb()).collection<LoyaltyCardDoc>('loyalty_cards')
}

export async function getAllCards(): Promise<LoyaltyCard[]> {
  const docs = await (await col()).find({ restaurantId: RID }).sort({ registeredAt: -1 }).toArray()
  return docs.map(toCard)
}

export async function getCard(id: string): Promise<LoyaltyCard | undefined> {
  const doc = await (await col()).findOne({ _id: id })
  return doc ? toCard(doc) : undefined
}

export async function findOrCreate(name: string, phone: string, cardType = 'cafe', validityMonths = 3): Promise<{ card: LoyaltyCard; isNew: boolean }> {
  const clean = phone.replace(/\D/g, '')
  const all = await (await col()).find({ restaurantId: RID }).toArray()
  const found = all.find(d => d.phone.replace(/\D/g, '') === clean && (d.cardType ?? 'cafe') === cardType)
  if (found) return { card: toCard(found), isNew: false }

  const doc: LoyaltyCardDoc = {
    _id: randomUUID(),
    name: name.trim(),
    phone: phone.trim(),
    visits: 0,
    active: true,
    cardType,
    expiresAt: expiryDate(validityMonths),
    stamps: [],
    registeredAt: new Date(),
    restaurantId: RID,
  }
  await (await col()).insertOne(doc)
  return { card: toCard(doc), isNew: true }
}

export async function addStamp(id: string): Promise<LoyaltyCard | null> {
  const c = await getCard(id)
  if (!c) return null
  // Tarjetas inactivas o con 5 sellos no acumulan más hasta que se canjeen.
  if (!c.active || c.visits >= 5) return c
  const newStamps = [...c.stamps, { timestamp: new Date().toISOString(), visitsAfter: c.visits + 1 }]
  await (await col()).updateOne(
    { _id: id },
    { $set: { visits: c.visits + 1, stamps: newStamps, expiresAt: expiryDate() } },
  )
  return getCard(id) as Promise<LoyaltyCard | null>
}

export async function redeemCoffee(id: string): Promise<LoyaltyCard | null> {
  await (await col()).updateOne({ _id: id }, { $set: { visits: 0, expiresAt: expiryDate() } })
  return getCard(id) as Promise<LoyaltyCard | null>
}

export async function deleteCard(id: string): Promise<boolean> {
  await (await col()).deleteOne({ _id: id })
  return true
}

export async function deactivateCard(id: string): Promise<LoyaltyCard | null> {
  await (await col()).updateOne({ _id: id }, { $set: { active: false } })
  return getCard(id) as Promise<LoyaltyCard | null>
}

export async function activateCard(id: string): Promise<LoyaltyCard | null> {
  await (await col()).updateOne({ _id: id }, { $set: { active: true, expiresAt: expiryDate() } })
  return getCard(id) as Promise<LoyaltyCard | null>
}
