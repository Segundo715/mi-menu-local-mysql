import { getDb } from './mongodb'
import { randomUUID, createHash } from 'node:crypto'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export interface EmployeeUser {
  id: string
  name: string
  role: string
  passwordHash: string
  createdAt: string
}

export interface EmployeeListItem {
  id: string
  name: string
  role: string
  createdAt: string
}

interface EmployeeDoc {
  _id: string
  name: string
  role: string
  passwordHash: string
  createdAt: Date
  restaurantId: string
}

// Prefijo "emp:" separa los hashes de empleados de los de admins.
// Así, aunque tengan el mismo nombre y contraseña, sus hashes son distintos.
function hashPassword(name: string, password: string): string {
  const secret = process.env.ADMIN_SECRET ?? 'dev-secret'
  return createHash('sha256').update(`emp:${secret}:${name.toLowerCase()}:${password}`).digest('hex')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toEmployee(doc: EmployeeDoc): EmployeeUser {
  return {
    id: doc._id,
    name: doc.name,
    role: doc.role || 'Mesero',
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt.toISOString(),
  }
}

async function col() {
  return (await getDb()).collection<EmployeeDoc>('employees')
}

export async function createEmployee(name: string, password: string, role = 'Mesero'): Promise<EmployeeUser | null> {
  const existing = await (await col()).findOne({ restaurantId: RID, name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } })
  if (existing) return null
  const doc: EmployeeDoc = {
    _id: randomUUID(),
    name: name.trim(),
    passwordHash: hashPassword(name, password),
    role: role.trim(),
    createdAt: new Date(),
    restaurantId: RID,
  }
  await (await col()).insertOne(doc)
  return toEmployee(doc)
}

export async function listEmployees(): Promise<EmployeeListItem[]> {
  const docs = await (await col()).find({ restaurantId: RID }).sort({ createdAt: 1 }).toArray()
  return docs.map(d => ({ id: d._id, name: d.name, role: d.role || 'Mesero', createdAt: d.createdAt.toISOString() }))
}

export async function getEmployeeById(id: string): Promise<EmployeeUser | undefined> {
  const doc = await (await col()).findOne({ _id: id })
  return doc ? toEmployee(doc) : undefined
}

export async function countEmployees(): Promise<number> {
  return (await col()).countDocuments({ restaurantId: RID })
}

export async function deleteEmployee(id: string): Promise<void> {
  await (await col()).deleteOne({ _id: id })
}

export async function authenticateEmployee(name: string, password: string): Promise<EmployeeUser | null> {
  const hash = hashPassword(name, password)
  const doc = await (await col()).findOne({
    restaurantId: RID,
    passwordHash: hash,
    name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
  })
  return doc ? toEmployee(doc) : null
}
