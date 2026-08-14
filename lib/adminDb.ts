import { query, toIso } from './mysql'
import { randomUUID, createHash } from 'node:crypto'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export interface AdminUser {
  id: string
  name: string
  role: string
  passwordHash: string
  createdAt: string
}

// Incluye el nombre (en minúsculas) como sal para que dos admins con la misma
// contraseña tengan hashes distintos. El secret agrega una segunda capa de sal global.
function hashPassword(name: string, password: string): string {
  const secret = process.env.ADMIN_SECRET ?? 'dev-secret'
  return createHash('sha256').update(`${secret}:${name.toLowerCase()}:${password}`).digest('hex')
}

// Mapea la fila snake_case de MySQL al tipo camelCase de TypeScript.
function toAdmin(row: Record<string, unknown>): AdminUser {
  return {
    id: row.id as string,
    name: row.name as string,
    role: (row.role as string) || 'Administrador',
    passwordHash: row.password_hash as string,
    createdAt: toIso(row.created_at)!,
  }
}

export async function createAdmin(name: string, password: string, role = 'Administrador'): Promise<AdminUser | null> {
  // LOWER(name) = LOWER(?) → búsqueda case-insensitive: "Jesus" y "jesus" son el mismo admin.
  const existing = await query('SELECT id FROM admins WHERE LOWER(name) = LOWER(?) AND restaurant_id = ? LIMIT 1', [name, RID])
  if (existing[0]) return null // nombre duplicado
  const id = randomUUID()
  const createdAt = new Date()
  await query(
    `INSERT INTO admins (id, name, password_hash, role, created_at, restaurant_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name.trim(), hashPassword(name, password), role.trim(), createdAt, RID],
  )
  return toAdmin({ id, name: name.trim(), password_hash: hashPassword(name, password), role: role.trim(), created_at: createdAt })
}

export async function authenticateAdmin(name: string, password: string): Promise<AdminUser | null> {
  const hash = hashPassword(name, password)
  const rows = await query(
    'SELECT * FROM admins WHERE LOWER(name) = LOWER(?) AND password_hash = ? AND restaurant_id = ? LIMIT 1',
    [name, hash, RID],
  )
  return rows[0] ? toAdmin(rows[0]) : null
}

export async function getAdminById(id: string): Promise<AdminUser | undefined> {
  const rows = await query('SELECT * FROM admins WHERE id = ? LIMIT 1', [id])
  return rows[0] ? toAdmin(rows[0]) : undefined
}

export interface AdminListItem {
  id: string
  name: string
  role: string
  createdAt: string
}

export async function listAdmins(): Promise<AdminListItem[]> {
  const rows = await query(
    'SELECT id, name, role, created_at FROM admins WHERE restaurant_id = ? ORDER BY created_at ASC',
    [RID],
  )
  return rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    role: (r.role as string) || 'Administrador',
    createdAt: toIso(r.created_at)!,
  }))
}

export async function countAdmins(): Promise<number> {
  const [{ count }] = await query<{ count: number }>('SELECT COUNT(*) AS count FROM admins WHERE restaurant_id = ?', [RID])
  return count ?? 0
}

export async function deleteAdmin(id: string): Promise<void> {
  await query('DELETE FROM admins WHERE id = ?', [id])
}
