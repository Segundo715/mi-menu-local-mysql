import { query, toIso } from './mysql'
import { randomUUID } from 'node:crypto'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export interface BirthdayRegistration {
  id: string
  name: string
  phone: string
  birthdate: string
  createdAt: string
}

function toReg(row: Record<string, unknown>): BirthdayRegistration {
  return {
    id: row.id as string,
    name: row.name as string,
    phone: row.phone as string,
    birthdate: row.birthdate as string,
    createdAt: toIso(row.created_at)!,
  }
}

export async function getAllBirthdays(): Promise<BirthdayRegistration[]> {
  const rows = await query(
    'SELECT * FROM birthday_registrations WHERE restaurant_id = ? ORDER BY birthdate',
    [RID],
  )
  return rows.map(toReg)
}

export async function createBirthday(
  name: string,
  phone: string,
  birthdate: string,
): Promise<BirthdayRegistration> {
  const id = randomUUID()
  const createdAt = new Date()
  await query(
    `INSERT INTO birthday_registrations (id, name, phone, birthdate, created_at, restaurant_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, phone, birthdate, createdAt, RID],
  )
  return toReg({ id, name, phone, birthdate, created_at: createdAt })
}

export async function deleteBirthday(id: string): Promise<void> {
  await query('DELETE FROM birthday_registrations WHERE id = ?', [id])
}
