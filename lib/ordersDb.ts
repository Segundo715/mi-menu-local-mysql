import { getDb } from './mongodb'
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

interface OrderDoc {
  _id: string
  customerName: string
  tableNumber: string | null
  items: OrderItem[]
  total: number
  status: Order['status']
  notes: string | null
  createdAt: Date
  restaurantId: string
}

function toOrder(doc: OrderDoc): Order {
  return {
    id: doc._id,
    customerName: doc.customerName,
    tableNumber: doc.tableNumber ?? undefined,
    items: doc.items ?? [],
    total: doc.total,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    notes: doc.notes ?? undefined,
  }
}

async function col() {
  return (await getDb()).collection<OrderDoc>('orders')
}

export async function getAllOrders(): Promise<Order[]> {
  const docs = await (await col()).find({ restaurantId: RID }).sort({ createdAt: -1 }).toArray()
  return docs.map(toOrder)
}

export async function createOrder(data: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<Order> {
  const doc: OrderDoc = {
    _id: randomUUID(),
    customerName: data.customerName,
    tableNumber: data.tableNumber ?? null,
    items: data.items,
    total: data.total,
    status: 'pending',
    notes: data.notes ?? null,
    createdAt: new Date(),
    restaurantId: RID,
  }
  await (await col()).insertOne(doc)
  return toOrder(doc)
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<Order | null> {
  await (await col()).updateOne({ _id: id }, { $set: { status } })
  const doc = await (await col()).findOne({ _id: id })
  return doc ? toOrder(doc) : null
}

// Actualiza campos editables de un pedido ya creado (p. ej. clasificarlo como
// domicilio tras enviarlo: notes con prefijo [DOMICILIO] + dirección, y limpiar mesa).
export async function updateOrderFields(
  id: string,
  fields: { notes?: string; tableNumber?: string; customerName?: string },
): Promise<Order | null> {
  const set: Partial<OrderDoc> = {}
  if (fields.notes !== undefined)        set.notes = fields.notes
  if (fields.tableNumber !== undefined)  set.tableNumber = fields.tableNumber || null
  if (fields.customerName !== undefined) set.customerName = fields.customerName
  if (Object.keys(set).length > 0) {
    await (await col()).updateOne({ _id: id }, { $set: set })
  }
  const doc = await (await col()).findOne({ _id: id })
  return doc ? toOrder(doc) : null
}
