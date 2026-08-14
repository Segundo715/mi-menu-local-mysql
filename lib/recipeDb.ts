import { query, toIso, parseJsonColumn } from './mysql'
import { randomUUID } from 'node:crypto'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export interface Recipe {
  id: string
  name: string
  description: string
  category: string
  ingredients: string[]
  steps: string[]
  imageUrl?: string
  createdAt: string
}

function toRecipe(row: Record<string, unknown>): Recipe {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    category: (row.category as string) ?? 'General',
    ingredients: parseJsonColumn<string[]>(row.ingredients, []),
    steps: parseJsonColumn<string[]>(row.steps, []),
    imageUrl: (row.image_url as string) ?? undefined,
    createdAt: toIso(row.created_at)!,
  }
}

export async function getAllRecipes(): Promise<Recipe[]> {
  const rows = await query('SELECT * FROM recipes WHERE restaurant_id = ? ORDER BY created_at DESC', [RID])
  return rows.map(toRecipe)
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  const rows = await query('SELECT * FROM recipes WHERE id = ? LIMIT 1', [id])
  return rows[0] ? toRecipe(rows[0]) : undefined
}

export async function createRecipe(data: Omit<Recipe, 'id' | 'createdAt'>): Promise<Recipe> {
  const id = randomUUID()
  const createdAt = new Date()
  await query(
    `INSERT INTO recipes (id, name, description, category, ingredients, steps, image_url, created_at, restaurant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.description, data.category, JSON.stringify(data.ingredients), JSON.stringify(data.steps), data.imageUrl ?? null, createdAt, RID],
  )
  return toRecipe({
    id, name: data.name, description: data.description, category: data.category,
    ingredients: data.ingredients, steps: data.steps, image_url: data.imageUrl ?? null, created_at: createdAt,
  })
}

export async function updateRecipe(id: string, data: Partial<Omit<Recipe, 'id' | 'createdAt'>>): Promise<Recipe | null> {
  const sets: string[] = []
  const params: unknown[] = []
  if (data.name !== undefined)        { sets.push('name = ?'); params.push(data.name) }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description) }
  if (data.category !== undefined)    { sets.push('category = ?'); params.push(data.category) }
  if (data.ingredients !== undefined) { sets.push('ingredients = ?'); params.push(JSON.stringify(data.ingredients)) }
  if (data.steps !== undefined)       { sets.push('steps = ?'); params.push(JSON.stringify(data.steps)) }
  if (data.imageUrl !== undefined)    { sets.push('image_url = ?'); params.push(data.imageUrl) }
  if (sets.length > 0) {
    params.push(id)
    await query(`UPDATE recipes SET ${sets.join(', ')} WHERE id = ?`, params)
  }
  const rows = await query('SELECT * FROM recipes WHERE id = ? LIMIT 1', [id])
  return rows[0] ? toRecipe(rows[0]) : null
}

export async function deleteRecipe(id: string): Promise<boolean> {
  await query('DELETE FROM recipes WHERE id = ?', [id])
  return true
}
