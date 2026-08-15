import { NextRequest } from 'next/server'
import { verifySession } from '@/lib/auth'
import { getAllMenuItems, createMenuItem } from '@/lib/menuDb'
import demoMenu from '@/lib/demo-menu.json'

export async function POST(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })

  let created = 0
  let skipped = 0

  const existingNames = new Set((await getAllMenuItems()).map(i => i.name))

  for (const item of demoMenu) {
    if (existingNames.has(item.name)) { skipped++; continue }
    await createMenuItem({
      name: item.name, description: item.description, price: item.price,
      category: item.category, available: item.available, likes: 0,
    })
    created++
  }

  return Response.json({ ok: true, created, skipped })
}
