import { getDb } from './mongodb'
import { randomUUID, createHash } from 'node:crypto'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

// Registra cuándo se selló y cuántas visitas tenía el cliente en ese momento.
export interface Stamp {
  timestamp: string
  visitsAfter: number
}

export interface Customer {
  id: string
  name: string
  age?: number
  phone: string
  visits: number
  confirmed: boolean
  registeredAt: string
  stamps: Stamp[]
  requestedAt?: string
  passwordHash?: string
}

interface CustomerDoc {
  _id: string
  name: string
  age: number | null
  phone: string
  visits: number
  confirmed: boolean
  registeredAt: Date
  stamps: Stamp[]
  requestedAt: Date | null
  passwordHash: string | null
  restaurantId: string
}

// Prefijo "customer:" separa el espacio de hashes de clientes del de admins/empleados.
function hashPassword(name: string, password: string): string {
  return createHash('sha256').update(`customer:${name.toLowerCase()}:${password}`).digest('hex')
}

function toCustomer(doc: CustomerDoc): Customer {
  return {
    id: doc._id,
    name: doc.name,
    age: doc.age ?? undefined,
    phone: doc.phone ?? '',
    visits: doc.visits ?? 0,
    confirmed: Boolean(doc.confirmed),
    registeredAt: doc.registeredAt.toISOString(),
    stamps: doc.stamps ?? [],
    requestedAt: doc.requestedAt ? doc.requestedAt.toISOString() : undefined,
    passwordHash: doc.passwordHash ?? undefined,
  }
}

async function col() {
  return (await getDb()).collection<CustomerDoc>('customers')
}

export async function getAllCustomers(): Promise<Customer[]> {
  const docs = await (await col()).find({ restaurantId: RID }).sort({ registeredAt: 1 }).toArray()
  return docs.map(toCustomer)
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const doc = await (await col()).findOne({ _id: id })
  return doc ? toCustomer(doc) : undefined
}

export async function createCustomer(name: string, phone: string, age?: number): Promise<Customer> {
  const doc: CustomerDoc = {
    _id: randomUUID(),
    name: name.trim(),
    age: age ?? null,
    phone: phone.trim(),
    visits: 0,
    confirmed: false,
    stamps: [],
    registeredAt: new Date(),
    requestedAt: null,
    passwordHash: null,
    restaurantId: RID,
  }
  await (await col()).insertOne(doc)
  return toCustomer(doc)
}

export async function confirmCustomer(id: string): Promise<Customer | null> {
  await (await col()).updateOne({ _id: id }, { $set: { confirmed: true } })
  return getCustomer(id) as Promise<Customer | null>
}

export async function addStamp(id: string): Promise<Customer | null> {
  const c = await getCustomer(id)
  if (!c) return null
  // Solo los clientes confirmados pueden acumular sellos. Máximo 5 sellos antes de canjear.
  if (!c.confirmed || c.visits >= 5) return c
  const newStamps = [...c.stamps, { timestamp: new Date().toISOString(), visitsAfter: c.visits + 1 }]
  await (await col()).updateOne({ _id: id }, { $set: { visits: c.visits + 1, stamps: newStamps } })
  return getCustomer(id) as Promise<Customer | null>
}

export async function redeemCoffee(id: string): Promise<Customer | null> {
  await (await col()).updateOne({ _id: id }, { $set: { visits: 0 } })
  return getCustomer(id) as Promise<Customer | null>
}

export async function requestCheckIn(id: string): Promise<Customer | null> {
  await (await col()).updateOne({ _id: id }, { $set: { requestedAt: new Date() } })
  return getCustomer(id) as Promise<Customer | null>
}

export async function deleteCustomer(id: string): Promise<boolean> {
  await (await col()).deleteOne({ _id: id })
  return true
}

export async function createCustomerAccount(name: string, password: string, phone = '', age?: number): Promise<Customer | null> {
  const existing = await (await col()).findOne({
    restaurantId: RID,
    passwordHash: { $ne: null },
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
  })
  if (existing) return null
  const doc: CustomerDoc = {
    _id: randomUUID(),
    name: name.trim(),
    age: age ?? null,
    phone: phone.trim(),
    visits: 0,
    confirmed: true,
    stamps: [],
    registeredAt: new Date(),
    requestedAt: null,
    passwordHash: hashPassword(name, password),
    restaurantId: RID,
  }
  await (await col()).insertOne(doc)
  return toCustomer(doc)
}

export async function authenticateCustomer(name: string, password: string): Promise<Customer | null> {
  const hash = hashPassword(name, password)
  const doc = await (await col()).findOne({
    restaurantId: RID,
    passwordHash: hash,
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
  })
  return doc ? toCustomer(doc) : null
}

export async function findOrCreateSimple(name: string, phone: string): Promise<Customer> {
  // Normaliza teléfono eliminando guiones, espacios y paréntesis antes de comparar.
  const clean = phone.replace(/\D/g, '')
  const all = await (await col()).find({ restaurantId: RID, name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }).toArray()
  const existing = all.find(d => d.phone.replace(/\D/g, '') === clean)
  if (existing) {
    if (!existing.confirmed) {
      await (await col()).updateOne({ _id: existing._id }, { $set: { confirmed: true } })
      existing.confirmed = true
    }
    return toCustomer(existing)
  }
  const doc: CustomerDoc = {
    _id: randomUUID(),
    name: name.trim(),
    age: null,
    phone: phone.trim(),
    visits: 0,
    confirmed: true,
    stamps: [],
    registeredAt: new Date(),
    requestedAt: null,
    passwordHash: null,
    restaurantId: RID,
  }
  await (await col()).insertOne(doc)
  return toCustomer(doc)
}
