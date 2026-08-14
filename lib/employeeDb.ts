import { query, toIso } from './mysql'
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

// Prefijo "emp:" separa los hashes de empleados de los de admins.
// Así, aunque tengan el mismo nombre y contraseña, sus hashes son distintos.
function hashPassword(name: string, password: string): string {
  const secret = process.env.ADMIN_SECRET ?? 'dev-secret'
  return createHash('sha256').update(`emp:${secret}:${name.toLowerCase()}:${password}`).digest('hex')
}

function toEmployee(row: Record<string, unknown>): EmployeeUser {
  return {
    id: row.id as string,
    name: row.name as string,
    role: (row.role as string) || 'Mesero',
    passwordHash: row.password_hash as string,
    createdAt: toIso(row.created_at)!,
  }
}

export async function createEmployee(name: string, password: string, role = 'Mesero'): Promise<EmployeeUser | null> {
  const existing = await query('SELECT id FROM employees WHERE LOWER(name) = LOWER(?) AND restaurant_id = ? LIMIT 1', [name, RID])
  if (existing[0]) return null
  const id = randomUUID()
  const createdAt = new Date()
  await query(
    `INSERT INTO employees (id, name, password_hash, role, created_at, restaurant_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name.trim(), hashPassword(name, password), role.trim(), createdAt, RID],
  )
  return toEmployee({ id, name: name.trim(), password_hash: hashPassword(name, password), role: role.trim(), created_at: createdAt })
}

export async function listEmployees(): Promise<EmployeeListItem[]> {
  const rows = await query(
    'SELECT id, name, role, created_at FROM employees WHERE restaurant_id = ? ORDER BY created_at ASC',
    [RID],
  )
  return rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    role: (r.role as string) || 'Mesero',
    createdAt: toIso(r.created_at)!,
  }))
}

export async function getEmployeeById(id: string): Promise<EmployeeUser | undefined> {
  const rows = await query('SELECT * FROM employees WHERE id = ? LIMIT 1', [id])
  return rows[0] ? toEmployee(rows[0]) : undefined
}

export async function countEmployees(): Promise<number> {
  const [{ count }] = await query<{ count: number }>('SELECT COUNT(*) AS count FROM employees WHERE restaurant_id = ?', [RID])
  return count ?? 0
}

export async function deleteEmployee(id: string): Promise<void> {
  await query('DELETE FROM employees WHERE id = ?', [id])
}

export async function authenticateEmployee(name: string, password: string): Promise<EmployeeUser | null> {
  const hash = hashPassword(name, password)
  const rows = await query(
    'SELECT * FROM employees WHERE LOWER(name) = LOWER(?) AND password_hash = ? AND restaurant_id = ? LIMIT 1',
    [name, hash, RID],
  )
  return rows[0] ? toEmployee(rows[0]) : null
}
