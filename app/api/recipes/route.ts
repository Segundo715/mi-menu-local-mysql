// GET es público (recetario del cliente). POST requiere admin_session.
import { NextRequest } from 'next/server'
import { getAllRecipes, createRecipe } from '@/lib/recipeDb'
import { verifySession } from '@/lib/auth'

export async function GET() {
  return Response.json(await getAllRecipes())
}

export async function POST(req: NextRequest) {
  if (!verifySession(req.cookies.get('admin_session')?.value))
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  const data = await req.json()
  if (!data.name?.trim())
    return Response.json({ error: 'Nombre requerido' }, { status: 400 })
  const recipe = await createRecipe({
    name: data.name.trim(),
    description: data.description ?? '',
    category: data.category ?? 'General',
    ingredients: data.ingredients ?? [],
    steps: data.steps ?? [],
    imageUrl: data.imageUrl,
  })
  return Response.json(recipe, { status: 201 })
}
