import { query, toIso, parseJsonColumn } from './mysql'
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

// Prefijo "customer:" separa el espacio de hashes de clientes del de admins/empleados.
function hashPassword(name: string, password: string): string {
  return createHash('sha256').update(`customer:${name.toLowerCase()}:${password}`).digest('hex')
}

function toCustomer(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    name: row.name as string,
    age: row.age as number | undefined,
    phone: (row.phone as string) ?? '',
    visits: (row.visits as number) ?? 0,
    confirmed: Boolean(row.confirmed),
    registeredAt: toIso(row.registered_at)!,
    stamps: parseJsonColumn<Stamp[]>(row.stamps, []),
    requestedAt: toIso(row.requested_at),
    passwordHash: row.password_hash as string | undefined,
  }
}

export async function getAllCustomers(): Promise<Customer[]> {
  const rows = await query('SELECT * FROM customers WHERE restaurant_id = ? ORDER BY registered_at', [RID])
  return rows.map(toCustomer)
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const rows = await query('SELECT * FROM customers WHERE id = ? LIMIT 1', [id])
  return rows[0] ? toCustomer(rows[0]) : undefined
}

export async function createCustomer(name: string, phone: string, age?: number): Promise<Customer> {
  const id = randomUUID()
  const registeredAt = new Date()
  await query(
    `INSERT INTO customers (id, name, age, phone, visits, confirmed, stamps, registered_at, restaurant_id)
     VALUES (?, ?, ?, ?, 0, false, ?, ?, ?)`,
    [id, name.trim(), age ?? null, phone.trim(), JSON.stringify([]), registeredAt, RID],
  )
  return toCustomer({
    id, name: name.trim(), age, phone: phone.trim(), visits: 0, confirmed: false,
    stamps: [], registered_at: registeredAt,
  })
}

export async function confirmCustomer(id: string): Promise<Customer | null> {
  await query('UPDATE customers SET confirmed = true WHERE id = ?', [id])
  return getCustomer(id) as Promise<Customer | null>
}

export async function addStamp(id: string): Promise<Customer | null> {
  const c = await getCustomer(id)
  if (!c) return null
  // Solo los clientes confirmados pueden acumular sellos. Máximo 5 sellos antes de canjear.
  if (!c.confirmed || c.visits >= 5) return c
  const newStamps = [...c.stamps, { timestamp: new Date().toISOString(), visitsAfter: c.visits + 1 }]
  await query('UPDATE customers SET visits = ?, stamps = ? WHERE id = ?', [c.visits + 1, JSON.stringify(newStamps), id])
  return getCustomer(id) as Promise<Customer | null>
}

export async function redeemCoffee(id: string): Promise<Customer | null> {
  await query('UPDATE customers SET visits = 0 WHERE id = ?', [id])
  return getCustomer(id) as Promise<Customer | null>
}

export async function requestCheckIn(id: string): Promise<Customer | null> {
  await query('UPDATE customers SET requested_at = ? WHERE id = ?', [new Date(), id])
  return getCustomer(id) as Promise<Customer | null>
}

export async function deleteCustomer(id: string): Promise<boolean> {
  await query('DELETE FROM customers WHERE id = ?', [id])
  return true
}

export async function createCustomerAccount(name: string, password: string, phone = '', age?: number): Promise<Customer | null> {
  const existing = await query(
    'SELECT id FROM customers WHERE LOWER(name) = LOWER(?) AND restaurant_id = ? AND password_hash IS NOT NULL LIMIT 1',
    [name, RID],
  )
  if (existing[0]) return null
  const id = randomUUID()
  const registeredAt = new Date()
  await query(
    `INSERT INTO customers (id, name, age, phone, visits, confirmed, stamps, password_hash, registered_at, restaurant_id)
     VALUES (?, ?, ?, ?, 0, true, ?, ?, ?, ?)`,
    [id, name.trim(), age ?? null, phone.trim(), JSON.stringify([]), hashPassword(name, password), registeredAt, RID],
  )
  return toCustomer({
    id, name: name.trim(), age, phone: phone.trim(), visits: 0, confirmed: true,
    stamps: [], registered_at: registeredAt,
  })
}

export async function authenticateCustomer(name: string, password: string): Promise<Customer | null> {
  const hash = hashPassword(name, password)
  const rows = await query(
    'SELECT * FROM customers WHERE LOWER(name) = LOWER(?) AND password_hash = ? AND restaurant_id = ? LIMIT 1',
    [name, hash, RID],
  )
  return rows[0] ? toCustomer(rows[0]) : null
}

export async function findOrCreateSimple(name: string, phone: string): Promise<Customer> {
  // Normaliza teléfono eliminando guiones, espacios y paréntesis antes de comparar.
  const clean = phone.replace(/\D/g, '')
  const all = await query('SELECT * FROM customers WHERE LOWER(name) = LOWER(?) AND restaurant_id = ?', [name, RID])
  const existing = all.find((r: Record<string, unknown>) => (r.phone as string).replace(/\D/g, '') === clean)
  if (existing) {
    if (!existing.confirmed) {
      await query('UPDATE customers SET confirmed = true WHERE id = ?', [existing.id])
      existing.confirmed = true
    }
    return toCustomer(existing)
  }
  const id = randomUUID()
  const registeredAt = new Date()
  await query(
    `INSERT INTO customers (id, name, phone, visits, confirmed, stamps, registered_at, restaurant_id)
     VALUES (?, ?, ?, 0, true, ?, ?, ?)`,
    [id, name.trim(), phone.trim(), JSON.stringify([]), registeredAt, RID],
  )
  return toCustomer({
    id, name: name.trim(), phone: phone.trim(), visits: 0, confirmed: true,
    stamps: [], registered_at: registeredAt,
  })
}
