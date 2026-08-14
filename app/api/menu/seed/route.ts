import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { verifySession } from '@/lib/auth'
import { query } from '@/lib/mysql'
import demoMenu from '@/lib/demo-menu.json'

export async function POST(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })

  let created = 0
  let skipped = 0

  for (const item of demoMenu) {
    const existing = await query('SELECT id FROM menu_items WHERE name = ? LIMIT 1', [item.name])

    if (existing[0]) { skipped++; continue }

    await query(
      `INSERT INTO menu_items (id, name, description, price, category, available, likes)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [randomUUID(), item.name, item.description, item.price, item.category, item.available],
    )
    created++
  }

  return Response.json({ ok: true, created, skipped })
}
