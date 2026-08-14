// GET es admin-only (lista todos los clientes). POST es público: crea cliente con confirmed:false.
import { NextRequest } from 'next/server'
import { getAllCustomers, createCustomer } from '@/lib/db'

export async function GET() {
  return Response.json(await getAllCustomers())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name = (body.name ?? '').trim()
  const phone = (body.phone ?? '').trim()
  const age = body.age ? Number(body.age) : undefined
  if (!name || !phone) {
    return Response.json({ error: 'Nombre y teléfono requeridos' }, { status: 400 })
  }
  return Response.json(await createCustomer(name, phone, age), { status: 201 })
}
