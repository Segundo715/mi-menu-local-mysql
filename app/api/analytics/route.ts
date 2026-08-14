import { NextRequest } from 'next/server'
import { getAllCustomers } from '@/lib/db'
import { getAllCards } from '@/lib/loyaltyDb'
import { getAllOrders } from '@/lib/ordersDb'
import { getAllReviews } from '@/lib/reviewDb'
import { verifySession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [customers, cards, orders, reviews] = await Promise.all([
    getAllCustomers(),
    getAllCards(),
    getAllOrders(),
    getAllReviews(),
  ])

  const confirmedCustomers = customers.filter(c => c.confirmed)

  const totalStamps = cards.reduce((s, c) => s + c.visits, 0)
  // Considera "canjeada" a toda tarjeta que fue reseteada a 0 después de acumular ≥ 5 sellos.
  const totalRedeemed = cards.filter(c => c.visits === 0 && c.stamps.length >= 5).length

  const deliveredOrders = orders.filter(o => o.status === 'delivered')
  const totalRevenue = deliveredOrders.reduce((s, o) => s + o.total, 0)

  const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {}
  for (const order of orders) {
    for (const item of order.items) {
      if (!itemCounts[item.name]) itemCounts[item.name] = { name: item.name, count: 0, revenue: 0 }
      itemCounts[item.name].count += item.quantity
      itemCounts[item.name].revenue += item.price * item.quantity
    }
  }
  const topItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5)

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  // Construimos el histograma de los últimos 7 días con la clave formateada en español.
  const now = Date.now()
  const ordersPerDay: Record<string, { orders: number; revenue: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000)
    const key = d.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })
    ordersPerDay[key] = { orders: 0, revenue: 0 }
  }
  for (const order of orders) {
    const d = new Date(order.createdAt)
    if (now - d.getTime() > 7 * 86400000) continue
    const key = d.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })
    if (ordersPerDay[key]) {
      ordersPerDay[key].orders += 1
      if (order.status === 'delivered') ordersPerDay[key].revenue += order.total
    }
  }

  return Response.json({
    loyaltyCards: {
      active: cards.length,
      totalStamps,
      totalRedeemed,
    },
    customers: {
      total: confirmedCustomers.length,   // solo los del login con contraseña
    },
    orders: {
      total: orders.length,
      delivered: deliveredOrders.length,
      pending: orders.filter(o => o.status === 'pending').length,
    },
    revenue: {
      total: totalRevenue,
      avgOrderValue: deliveredOrders.length ? totalRevenue / deliveredOrders.length : 0,
    },
    reviews: {
      total: reviews.length,
      avgRating,
      published: reviews.filter(r => r.published).length,
      bad: reviews.filter(r => r.bad).length,
    },
    topItems,
    ordersPerDay: Object.entries(ordersPerDay).map(([label, data]) => ({ label, ...data })),
  })
}
