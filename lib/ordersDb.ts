import { query, toIso, parseJsonColumn } from './mysql'
import { randomUUID } from 'node:crypto'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export interface OrderItem {
  menuItemId: string
  name: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  customerName: string
  tableNumber?: string
  items: OrderItem[]
  total: number
  // Flujo de estado: pending → preparing → ready → delivered
  status: 'pending' | 'preparing' | 'ready' | 'delivered'
  createdAt: string
  notes?: string
}

function toOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    customerName: row.customer_name as string,
    tableNumber: (row.table_number as string) ?? undefined,
    items: parseJsonColumn<OrderItem[]>(row.items, []),
    total: row.total as number,
    status: row.status as Order['status'],
    createdAt: toIso(row.created_at)!,
    notes: (row.notes as string) ?? undefined,
  }
}

export async function getAllOrders(): Promise<Order[]> {
  const rows = await query('SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC', [RID])
  return rows.map(toOrder)
}

export async function createOrder(data: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<Order> {
  const id = randomUUID()
  const createdAt = new Date()
  await query(
    `INSERT INTO orders (id, customer_name, table_number, items, total, status, notes, created_at, restaurant_id)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [id, data.customerName, data.tableNumber ?? null, JSON.stringify(data.items), data.total, data.notes ?? null, createdAt, RID],
  )
  return toOrder({
    id, customer_name: data.customerName, table_number: data.tableNumber ?? null,
    items: data.items, total: data.total, status: 'pending', notes: data.notes ?? null, created_at: createdAt,
  })
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<Order | null> {
  await query('UPDATE orders SET status = ? WHERE id = ?', [status, id])
  const rows = await query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id])
  return rows[0] ? toOrder(rows[0]) : null
}

// Actualiza campos editables de un pedido ya creado (p. ej. clasificarlo como
// domicilio tras enviarlo: notes con prefijo [DOMICILIO] + dirección, y limpiar mesa).
export async function updateOrderFields(
  id: string,
  fields: { notes?: string; tableNumber?: string; customerName?: string },
): Promise<Order | null> {
  const sets: string[] = []
  const params: unknown[] = []
  if (fields.notes !== undefined)        { sets.push('notes = ?'); params.push(fields.notes) }
  if (fields.tableNumber !== undefined)  { sets.push('table_number = ?'); params.push(fields.tableNumber || null) }
  if (fields.customerName !== undefined) { sets.push('customer_name = ?'); params.push(fields.customerName) }
  if (sets.length === 0) {
    const rows = await query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id])
    return rows[0] ? toOrder(rows[0]) : null
  }
  params.push(id)
  await query(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, params)
  const rows = await query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id])
  return rows[0] ? toOrder(rows[0]) : null
}
