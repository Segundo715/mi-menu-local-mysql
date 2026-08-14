import { query, toIso, parseJsonColumn } from './mysql'
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

function toCard(row: Record<string, unknown>): LoyaltyCard {
  return {
    id: row.id as string,
    name: row.name as string,
    phone: (row.phone as string) ?? '',
    visits: (row.visits as number) ?? 0,
    active: Boolean(row.active),
    cardType: (row.card_type as string) ?? 'cafe',
    expiresAt: toIso(row.expires_at),
    registeredAt: toIso(row.registered_at)!,
    stamps: parseJsonColumn<LoyaltyCard['stamps']>(row.stamps, []),
  }
}

// Las tarjetas expiran según los meses configurados por categoría (default 3 meses).
function expiryDate(months = 3): Date {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d
}

export async function getAllCards(): Promise<LoyaltyCard[]> {
  const rows = await query('SELECT * FROM loyalty_cards WHERE restaurant_id = ? ORDER BY registered_at DESC', [RID])
  return rows.map(toCard)
}

export async function getCard(id: string): Promise<LoyaltyCard | undefined> {
  const rows = await query('SELECT * FROM loyalty_cards WHERE id = ? LIMIT 1', [id])
  return rows[0] ? toCard(rows[0]) : undefined
}

export async function findByPhone(phone: string): Promise<LoyaltyCard | null> {
  const clean = phone.replace(/\D/g, '')
  const all = await query('SELECT * FROM loyalty_cards WHERE restaurant_id = ?', [RID])
  const found = all.find((r: Record<string, unknown>) => (r.phone as string).replace(/\D/g, '') === clean)
  return found ? toCard(found) : null
}

export async function findOrCreate(name: string, phone: string, cardType = 'cafe', validityMonths = 3): Promise<{ card: LoyaltyCard; isNew: boolean }> {
  const clean = phone.replace(/\D/g, '')
  const all = await query('SELECT * FROM loyalty_cards WHERE restaurant_id = ?', [RID])
  const found = all.find((r: Record<string, unknown>) =>
    (r.phone as string).replace(/\D/g, '') === clean &&
    ((r.card_type as string) ?? 'cafe') === cardType
  )
  if (found) return { card: toCard(found), isNew: false }

  const id = randomUUID()
  const registeredAt = new Date()
  const expiresAt = expiryDate(validityMonths)
  await query(
    `INSERT INTO loyalty_cards (id, name, phone, visits, active, card_type, expires_at, stamps, registered_at, restaurant_id)
     VALUES (?, ?, ?, 0, true, ?, ?, ?, ?, ?)`,
    [id, name.trim(), phone.trim(), cardType, expiresAt, JSON.stringify([]), registeredAt, RID],
  )
  return {
    card: toCard({
      id, name: name.trim(), phone: phone.trim(), visits: 0, active: true, card_type: cardType,
      expires_at: expiresAt, stamps: [], registered_at: registeredAt,
    }),
    isNew: true,
  }
}

export async function addStamp(id: string): Promise<LoyaltyCard | null> {
  const c = await getCard(id)
  if (!c) return null
  // Tarjetas inactivas o con 5 sellos no acumulan más hasta que se canjeen.
  if (!c.active || c.visits >= 5) return c
  const newStamps = [...c.stamps, { timestamp: new Date().toISOString(), visitsAfter: c.visits + 1 }]
  await query(
    'UPDATE loyalty_cards SET visits = ?, stamps = ?, expires_at = ? WHERE id = ?',
    [c.visits + 1, JSON.stringify(newStamps), expiryDate(), id],
  )
  return getCard(id) as Promise<LoyaltyCard | null>
}

export async function redeemCoffee(id: string): Promise<LoyaltyCard | null> {
  await query('UPDATE loyalty_cards SET visits = 0, expires_at = ? WHERE id = ?', [expiryDate(), id])
  return getCard(id) as Promise<LoyaltyCard | null>
}

export async function deleteCard(id: string): Promise<boolean> {
  await query('DELETE FROM loyalty_cards WHERE id = ?', [id])
  return true
}

export async function deactivateCard(id: string): Promise<LoyaltyCard | null> {
  await query('UPDATE loyalty_cards SET active = false WHERE id = ?', [id])
  return getCard(id) as Promise<LoyaltyCard | null>
}

export async function activateCard(id: string): Promise<LoyaltyCard | null> {
  await query('UPDATE loyalty_cards SET active = true, expires_at = ? WHERE id = ?', [expiryDate(), id])
  return getCard(id) as Promise<LoyaltyCard | null>
}
