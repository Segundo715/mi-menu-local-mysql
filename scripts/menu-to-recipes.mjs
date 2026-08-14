// Copia los platillos del menú al recetario (sin ingredientes ni pasos)
// Ejecutar: node scripts/menu-to-recipes.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zxynrlqubdlrwcfoewdv.supabase.co'
const SUPABASE_KEY = 'sb_publishable_u9rPrDPuBeLDinNMzcloBw_Tu1ydr7m'

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

const { data: menuItems, error: menuErr } = await sb.from('menu_items').select('*')
if (menuErr) { console.error('Error leyendo menú:', menuErr.message); process.exit(1) }

const { data: existing } = await sb.from('recipes').select('name')
const existingNames = new Set((existing ?? []).map(r => r.name.toLowerCase()))

const toInsert = menuItems.filter(m => !existingNames.has(m.name.toLowerCase())).map(m => ({
  name: m.name,
  description: m.description ?? '',
  category: m.category ?? 'General',
  image_url: m.image_url ?? null,
  ingredients: [],
  steps: [],
}))

if (toInsert.length === 0) {
  console.log('✅ Todos los platillos ya están en el recetario, nada que agregar.')
  process.exit(0)
}

const { error } = await sb.from('recipes').insert(toInsert)
if (error) { console.error('Error insertando recetas:', error.message); process.exit(1) }

console.log(`✅ ${toInsert.length} platillo(s) agregados al recetario:`)
toInsert.forEach(r => console.log(`   · ${r.name} (${r.category})`))
