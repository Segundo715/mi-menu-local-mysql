import { NextRequest } from 'next/server'
import { createCustomerAccount, authenticateCustomer } from '@/lib/db'

// Autenticación de clientes (vista móvil de la tarjeta de lealtad).
// Stateless: no usa cookies. El cliente guarda su objeto en localStorage.
export async function POST(req: NextRequest) {
  const { action, name, password, phone, age } = await req.json()

  if (!name?.trim() || !password)
    return Response.json({ error: 'Nombre y contraseña requeridos' }, { status: 400 })

  if (action === 'register') {
    const customer = await createCustomerAccount(name.trim(), password, phone ?? '', age ? Number(age) : undefined)
    if (!customer)
      return Response.json({ error: 'Ese nombre ya está registrado' }, { status: 409 })
    return Response.json(customer, { status: 201 })
  }

  const customer = await authenticateCustomer(name.trim(), password)
  if (!customer)
    return Response.json({ error: 'Nombre o contraseña incorrectos' }, { status: 401 })

  return Response.json(customer)
}
