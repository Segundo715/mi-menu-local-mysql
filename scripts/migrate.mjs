// Script de migración: JSON → Supabase
// Ejecutar: node scripts/migrate.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { createHash } from 'crypto'

const SUPABASE_URL = 'https://zxynrlqubdlrwcfoewdv.supabase.co'
const SUPABASE_KEY = 'sb_publishable_u9rPrDPuBeLDinNMzcloBw_Tu1ydr7m'

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

function readJson(path) {
  if (!existsSync(path)) { console.log(`  (no existe ${path}, saltando)`); return [] }
  return JSON.parse(readFileSync(path, 'utf-8'))
}

async function run() {
  console.log('🚀 Iniciando migración a Supabase...\n')

  // ── Menú ──────────────────────────────────────────────
  const menu = readJson('data/menu.json')
  if (menu.length) {
    const rows = menu.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      category: item.category,
      image_url: item.imageUrl ?? null,
      available: item.available ?? true,
      likes: item.likes ?? 0,
      created_at: item.createdAt ?? new Date().toISOString(),
    }))
    const { error } = await sb.from('menu_items').upsert(rows, { onConflict: 'id' })
    if (error) console.error('❌ menu_items:', error.message)
    else console.log(`✅ menu_items: ${rows.length} platillos migrados`)
  }

  // ── Empleados ─────────────────────────────────────────
  const employees = readJson('data/employees.json')
  if (employees.length) {
    const rows = employees.map(e => ({
      id: e.id,
      name: e.name,
      password_hash: e.passwordHash,
      created_at: e.createdAt ?? new Date().toISOString(),
    }))
    const { error } = await sb.from('employees').upsert(rows, { onConflict: 'id' })
    if (error) console.error('❌ employees:', error.message)
    else console.log(`✅ employees: ${rows.length} empleados migrados`)
  }

  // ── Tarjetas de fidelización ──────────────────────────
  const cards = readJson('data/loyaltyCards.json')
  if (cards.length) {
    const expires = new Date(Date.now() + 90 * 86400000).toISOString()
    const rows = cards.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      visits: c.visits ?? 0,
      active: true,
      expires_at: expires,
      registered_at: c.registeredAt ?? new Date().toISOString(),
      stamps: c.stamps ?? [],
    }))
    const { error } = await sb.from('loyalty_cards').upsert(rows, { onConflict: 'id' })
    if (error) console.error('❌ loyalty_cards:', error.message)
    else console.log(`✅ loyalty_cards: ${rows.length} tarjetas migradas`)
  }

  // ── Reseñas ───────────────────────────────────────────
  const reviews = readJson('data/reviews.json')
  if (reviews.length) {
    const rows = reviews.map(r => ({
      id: r.id,
      customer_name: r.customerName,
      rating: r.rating,
      comment: r.comment ?? '',
      published: r.published ?? false,
      bad: r.bad ?? false,
      created_at: r.createdAt ?? new Date().toISOString(),
    }))
    const { error } = await sb.from('reviews').upsert(rows, { onConflict: 'id' })
    if (error) console.error('❌ reviews:', error.message)
    else console.log(`✅ reviews: ${rows.length} reseñas migradas`)
  }

  // ── Clientes (customers con contraseña) ───────────────
  const customers = readJson('data/customers.json')
  if (customers.length) {
    const rows = customers.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone ?? '',
      visits: c.visits ?? 0,
      confirmed: c.confirmed ?? true,
      registered_at: c.registeredAt ?? new Date().toISOString(),
      stamps: c.stamps ?? [],
      password_hash: c.passwordHash ?? null,
    }))
    const { error } = await sb.from('customers').upsert(rows, { onConflict: 'id' })
    if (error) console.error('❌ customers:', error.message)
    else console.log(`✅ customers: ${rows.length} clientes migrados`)
  }

  // ── TV Slides ─────────────────────────────────────────
  const tv = readJson('data/tv.json')
  if (Array.isArray(tv) && tv.length) {
    const rows = tv.map((s, i) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle ?? null,
      price: s.price ?? null,
      image_url: s.imageUrl ?? null,
      is_offer: s.isOffer ?? false,
      slide_order: s.order ?? i,
      active: s.active ?? true,
      created_at: s.createdAt ?? new Date().toISOString(),
    }))
    const { error } = await sb.from('tv_slides').upsert(rows, { onConflict: 'id' })
    if (error) console.error('❌ tv_slides:', error.message)
    else console.log(`✅ tv_slides: ${rows.length} slides migrados`)
  }

  console.log('\n✅ Migración completada.')
  console.log('\n📸 Las imágenes siguen en public/uploads/ — están funcionando.')
  console.log('   Para subirlas a Supabase Storage ejecuta: node scripts/upload-images.mjs')
}

run().catch(console.error)
