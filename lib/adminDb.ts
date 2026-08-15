import { getDb } from './mongodb'
import { randomUUID, createHash } from 'node:crypto'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export interface AdminUser {
  id: string
  name: string
  role: string
  passwordHash: string
  createdAt: string
}

export interface AdminListItem {
  id: string
  name: string
  role: string
  createdAt: string
}

interface AdminDoc {
  _id: string
  name: string
  role: string
  passwordHash: string
  createdAt: Date
  restaurantId: string
}

// Incluye el nombre (en minúsculas) como sal para que dos admins con la misma
// contraseña tengan hashes distintos. El secret agrega una segunda capa de sal global.
function hashPassword(name: string, password: string): string {
  const secret = process.env.ADMIN_SECRET ?? 'dev-secret'
  return createHash('sha256').update(`${secret}:${name.toLowerCase()}:${password}`).digest('hex')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toAdmin(doc: AdminDoc): AdminUser {
  return {
    id: doc._id,
    name: doc.name,
    role: doc.role || 'Administrador',
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt.toISOString(),
  }
}

async function col() {
  return (await getDb()).collection<AdminDoc>('admins')
}

export async function createAdmin(name: string, password: string, role = 'Administrador'): Promise<AdminUser | null> {
  // Búsqueda case-insensitive: "Jesus" y "jesus" son el mismo admin.
  const existing = await (await col()).findOne({ restaurantId: RID, name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } })
  if (existing) return null // nombre duplicado
  const doc: AdminDoc = {
    _id: randomUUID(),
    name: name.trim(),
    passwordHash: hashPassword(name, password),
    role: role.trim(),
    createdAt: new Date(),
    restaurantId: RID,
  }
  await (await col()).insertOne(doc)
  return toAdmin(doc)
}

export async function authenticateAdmin(name: string, password: string): Promise<AdminUser | null> {
  const hash = hashPassword(name, password)
  const doc = await (await col()).findOne({
    restaurantId: RID,
    passwordHash: hash,
    name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
  })
  return doc ? toAdmin(doc) : null
}

export async function getAdminById(id: string): Promise<AdminUser | undefined> {
  const doc = await (await col()).findOne({ _id: id })
  return doc ? toAdmin(doc) : undefined
}

export async function listAdmins(): Promise<AdminListItem[]> {
  const docs = await (await col()).find({ restaurantId: RID }).sort({ createdAt: 1 }).toArray()
  return docs.map(d => ({ id: d._id, name: d.name, role: d.role || 'Administrador', createdAt: d.createdAt.toISOString() }))
}

export async function countAdmins(): Promise<number> {
  return (await col()).countDocuments({ restaurantId: RID })
}

export async function deleteAdmin(id: string): Promise<void> {
  await (await col()).deleteOne({ _id: id })
}
