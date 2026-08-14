// Crea tablas 'tables' e 'inventory' en Supabase y las puebla con datos iniciales
// Ejecutar: node scripts/setup-resta3.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zxynrlqubdlrwcfoewdv.supabase.co'
const SUPABASE_KEY = 'sb_publishable_u9rPrDPuBeLDinNMzcloBw_Tu1ydr7m'
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Mesas iniciales ──────────────────────────────────────────────────────────
const TABLES = [
  { label: 'Mesa 1',    seats: 2, status: 'libre',    zone: 'Salón' },
  { label: 'Mesa 2',    seats: 4, status: 'libre',    zone: 'Salón' },
  { label: 'Mesa 3',    seats: 4, status: 'libre',    zone: 'Salón' },
  { label: 'Mesa 4',    seats: 6, status: 'libre',    zone: 'Salón' },
  { label: 'Mesa 5',    seats: 2, status: 'libre',    zone: 'Salón' },
  { label: 'Mesa 6',    seats: 4, status: 'libre',    zone: 'Salón' },
  { label: 'Mesa 7',    seats: 8, status: 'libre',    zone: 'Salón' },
  { label: 'Mesa 8',    seats: 4, status: 'libre',    zone: 'Salón' },
  { label: 'Barra 1',   seats: 1, status: 'libre',    zone: 'Barra' },
  { label: 'Barra 2',   seats: 1, status: 'libre',    zone: 'Barra' },
  { label: 'Barra 3',   seats: 1, status: 'libre',    zone: 'Barra' },
  { label: 'Terraza 1', seats: 4, status: 'libre',    zone: 'Terraza' },
  { label: 'Terraza 2', seats: 4, status: 'libre',    zone: 'Terraza' },
]

// ── Inventario inicial ───────────────────────────────────────────────────────
const INVENTORY = [
  { name: 'Pollo (kg)',            category: 'Carnes',    stock: 12, min_stock: 5,  unit: 'kg',  cost: 85 },
  { name: 'Salmón (kg)',           category: 'Mariscos',  stock: 3,  min_stock: 4,  unit: 'kg',  cost: 220 },
  { name: 'Lechuga',               category: 'Verduras',  stock: 8,  min_stock: 5,  unit: 'pz',  cost: 12 },
  { name: 'Tomate (kg)',           category: 'Verduras',  stock: 2,  min_stock: 3,  unit: 'kg',  cost: 25 },
  { name: 'Arroz (kg)',            category: 'Abarrotes', stock: 20, min_stock: 10, unit: 'kg',  cost: 18 },
  { name: 'Pasta (kg)',            category: 'Abarrotes', stock: 15, min_stock: 8,  unit: 'kg',  cost: 22 },
  { name: 'Coca-Cola 600ml',       category: 'Bebidas',   stock: 24, min_stock: 12, unit: 'pz',  cost: 14 },
  { name: 'Agua mineral',          category: 'Bebidas',   stock: 30, min_stock: 15, unit: 'pz',  cost: 8 },
  { name: 'Aceite (lt)',           category: 'Abarrotes', stock: 4,  min_stock: 5,  unit: 'lt',  cost: 65 },
  { name: 'Harina (kg)',           category: 'Abarrotes', stock: 18, min_stock: 10, unit: 'kg',  cost: 15 },
  { name: 'Queso Oaxaca (kg)',     category: 'Lácteos',   stock: 2,  min_stock: 3,  unit: 'kg',  cost: 120 },
  { name: 'Crema (lt)',            category: 'Lácteos',   stock: 5,  min_stock: 4,  unit: 'lt',  cost: 45 },
  { name: 'Zanahoria (kg)',        category: 'Verduras',  stock: 6,  min_stock: 3,  unit: 'kg',  cost: 18 },
  { name: 'Pepino (kg)',           category: 'Verduras',  stock: 4,  min_stock: 2,  unit: 'kg',  cost: 20 },
  { name: 'Oreo (paq)',            category: 'Abarrotes', stock: 10, min_stock: 5,  unit: 'pz',  cost: 35 },
]

async function run() {
  console.log('🚀 Configurando tablas de RESTA3...\n')

  // Mesas
  const { data: existingTables } = await sb.from('tables').select('id').limit(1)
  if (existingTables && existingTables.length > 0) {
    console.log('⏭️  Tabla "tables" ya tiene datos, saltando.')
  } else {
    const { error } = await sb.from('tables').insert(TABLES)
    if (error) console.error('❌ Error en tables:', error.message)
    else console.log(`✅ ${TABLES.length} mesas insertadas`)
  }

  // Inventario
  const { data: existingInv } = await sb.from('inventory').select('id').limit(1)
  if (existingInv && existingInv.length > 0) {
    console.log('⏭️  Tabla "inventory" ya tiene datos, saltando.')
  } else {
    const { error } = await sb.from('inventory').insert(INVENTORY)
    if (error) console.error('❌ Error en inventory:', error.message)
    else console.log(`✅ ${INVENTORY.length} productos insertados`)
  }

  console.log('\n✅ Listo. Ahora ejecuta el SQL en Supabase si las tablas no existen.')
}

run()
