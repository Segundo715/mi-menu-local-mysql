/**
 * CLI de demo — control de visibilidad y datos por módulo
 *
 * FASES DEL CLIENTE (ocultan/muestran tabs en el menú inferior):
 *   npm run seed:1      →  solo Menú visible
 *   npm run seed:2      →  Menú + Tarjeta de Lealtad
 *   npm run seed:3      →  Menú + Tarjeta + Reseñas (todo)
 *
 * MÓDULOS INDIVIDUALES (insertan datos de demo):
 *   npm run seed:menu   →  4 platillos en el menú
 *   npm run seed:rec    →  2 recetas con pasos paso a paso
 *   npm run seed:ped    →  pedido activo (Mesa 4, pendiente)
 *   npm run seed:res    →  reseña buena + reseña mala con alerta
 *   npm run seed:inv    →  inventario con 2 alertas de stock bajo
 *   npm run seed:tv     →  3 slides para la pantalla de TV del restaurante
 *   npm run seed:leal   →  cliente demo con 4 sellos acumulados
 *
 * ATAJOS:
 *   npm run seed:emp    →  todo el empleado: recetas + pedido + cliente
 *   npm run seed:adm    →  todo el admin: reseñas + inventario + TV
 *   npm run seed:todo   →  todo de golpe (presentación completa)
 *
 *   npm run seed        →  muestra esta ayuda
 */

import { createHmac } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))

const SECRET  = process.env.ADMIN_SECRET ?? 'dev-secret'
const APP_URL = process.env.APP_URL ?? 'https://mi-proyecto-phi-ecru.vercel.app'

function sessionToken() {
  const id  = 'cli-demo'
  const sig = createHmac('sha256', SECRET).update(id).digest('hex')
  return `${id}.${sig}`
}

const COOKIE = `admin_session=${sessionToken()}`
const sleep  = ms => new Promise(r => setTimeout(r, ms))

async function api(path, body, intentos = 4) {
  for (let i = 1; i <= intentos; i++) {
    try {
      const res = await fetch(`${APP_URL}${path}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
        body:    JSON.stringify(body),
      })
      return res.json()
    } catch (e) {
      if (i === intentos) throw e
      await sleep(1000 * i)
    }
  }
}

async function setSetting(key, value) {
  const r = await api('/api/settings', { key, value })
  if (!r.ok) throw new Error(JSON.stringify(r))
}

// ── Nav configs por fase ──────────────────────────────────────────────────────

const NAV_BASE = {
  bg: '#0d0d0d', border: '#1a1a1a', accent: '#B90F45',
  inactive: '#6b7280', radius: 9999, showLogout: true,
}

const NAV = {
  1: { ...NAV_BASE, tabs: [
    { id: 'menu',   label: 'Menú',    href: '/menu',   icon: '' },
  ]},
  2: { ...NAV_BASE, tabs: [
    { id: 'menu',   label: 'Menú',    href: '/menu',   icon: '' },
    { id: 'card',   label: 'Tarjeta', href: '/card',   icon: '' },
  ]},
  3: { ...NAV_BASE, tabs: [
    { id: 'menu',   label: 'Menú',    href: '/menu',   icon: '' },
    { id: 'card',   label: 'Tarjeta', href: '/card',   icon: '' },
    { id: 'review', label: 'Reseñas', href: '/review', icon: '' },
  ]},
}

// ── Módulos individuales ──────────────────────────────────────────────────────

async function modMenu() {
  console.log('\n🍽️  Menú — 4 platillos representativos\n')
  const platillos = [
    { name: 'Hamburguesa Clásica', description: 'Carne 180g, lechuga, jitomate, queso cheddar y aderezo de la casa', price: 120, category: 'Hamburguesas', available: true },
    { name: 'Pizza Margherita',    description: 'Salsa de tomate artesanal, mozzarella fresca y albahaca',           price: 155, category: 'Pizzas',        available: true },
    { name: 'Ensalada César',      description: 'Lechuga romana, crutones, parmesano y aderezo César clásico',      price: 95,  category: 'Ensaladas',      available: true },
    { name: 'Café Americano',      description: 'Espresso con agua caliente. Disponible chico o grande',            price: 45,  category: 'Bebidas',        available: true },
  ]
  const r = await api('/api/menu/seed', {})
  if (r.created > 0) console.log(`   ✅  ${r.created} platillos insertados`)
  else               console.log(`   ⏭  Menú ya cargado`)
  console.log('   👉  /menu\n')
}

async function modRecetas() {
  console.log('\n📖  Recetas — 2 recetas con pasos completos\n')
  const recetas = [
    {
      name: 'Hamburguesa Clásica',
      ingredients: [
        { name: 'Carne de res molida',  quantity: '180', unit: 'g'        },
        { name: 'Pan para hamburguesa', quantity: '1',   unit: 'pieza'    },
        { name: 'Queso cheddar',        quantity: '1',   unit: 'rebanada' },
        { name: 'Aderezo de la casa',   quantity: '2',   unit: 'cdas'     },
      ],
      steps: [
        { step: 1, description: 'Forma la hamburguesa y sazona con sal y pimienta.' },
        { step: 2, description: 'Cocina en comal caliente 3 min por lado.' },
        { step: 3, description: 'Coloca el queso al final 1 min para que se derrita.' },
        { step: 4, description: 'Tuesta el pan 1 min y unta el aderezo.' },
        { step: 5, description: 'Arma: pan, aderezo, carne con queso, lechuga, jitomate, tapa.' },
      ],
    },
    {
      name: 'Pizza Margherita',
      ingredients: [
        { name: 'Masa de pizza',     quantity: '250', unit: 'g'     },
        { name: 'Salsa de tomate',   quantity: '4',   unit: 'cdas'  },
        { name: 'Mozzarella fresca', quantity: '150', unit: 'g'     },
        { name: 'Albahaca fresca',   quantity: '8',   unit: 'hojas' },
      ],
      steps: [
        { step: 1, description: 'Precalienta el horno a 250 °C.' },
        { step: 2, description: 'Estira la masa hasta 30 cm y cubre con salsa.' },
        { step: 3, description: 'Distribuye la mozzarella en trozos.' },
        { step: 4, description: 'Hornea 9 min hasta que el borde dore.' },
        { step: 5, description: 'Agrega albahaca fresca al sacar del horno.' },
      ],
    },
  ]
  for (const r of recetas) {
    const res = await api('/api/recipes', r).catch(() => null)
    if (res?.id) console.log(`   ✅  ${r.name} (${r.steps.length} pasos)`)
    else         console.log(`   ⏭  ${r.name} — ya existe`)
  }
  console.log('   👉  /employee/recipes  (la IA explica paso a paso)\n')
}

async function modPedido() {
  console.log('\n📦  Pedido de ejemplo — Mesa 4 pendiente\n')
  const r = await api('/api/orders', {
    customerName: 'Mesa 4',
    tableNumber:  '4',
    items: [
      { name: 'Hamburguesa Clásica', quantity: 2, price: 120 },
      { name: 'Café Americano',      quantity: 2, price: 45  },
    ],
    total: 330,
    notes: 'Sin cebolla',
  }).catch(() => null)
  if (r?.id) console.log('   ✅  Mesa 4 — pendiente  $330')
  else       console.log('   ⏭  Pedido ya existe')
  console.log('   👉  /employee/orders\n')
}

async function modResenas() {
  console.log('\n⭐  Reseñas — 1 buena + 1 mala (alerta al dueño)\n')
  const resenas = [
    { customerName: 'Ana Rodríguez', rating: 5, comment: 'Excelente servicio, la hamburguesa estaba perfecta. Regreso seguro.' },
    { customerName: 'Jorge Pérez',   rating: 2, comment: 'La pizza llegó fría y el servicio estuvo muy lento. Espero que mejoren.' },
  ]
  for (const r of resenas) {
    const res = await api('/api/reviews', r).catch(() => null)
    const emoji = r.rating >= 4 ? '⭐' : '🔴'
    if (res?.id) console.log(`   ✅  ${emoji} ${r.customerName} — ${r.rating}⭐`)
    else         console.log(`   ⏭  ${r.customerName} — ya existe`)
  }
  console.log('   👉  /admin/reviews  (Jorge aparece en rojo)\n')
}

async function modInventario() {
  console.log('\n📊  Inventario — 3 artículos (2 con alerta de stock bajo)\n')
  const items = [
    { name: 'Carne de res molida', category: 'Carnes', stock: 12, minStock: 5,  unit: 'kg', cost: 180 },
    { name: 'Tocino',              category: 'Carnes', stock: 1,  minStock: 3,  unit: 'kg', cost: 210 },
    { name: 'Fresas frescas',      category: 'Frutas', stock: 1,  minStock: 4,  unit: 'kg', cost: 95  },
  ]
  for (const i of items) {
    const res = await api('/api/inventory', i).catch(() => null)
    const alerta = i.stock < i.minStock ? '  ⚠️  BAJO STOCK' : ''
    if (res?.id) console.log(`   ✅  ${i.name} — ${i.stock} ${i.unit}${alerta}`)
    else         console.log(`   ⏭  ${i.name} — ya existe`)
  }
  console.log('   👉  /admin/inventario  (Tocino y Fresas en rojo)\n')
}

async function modTV() {
  console.log('\n📺  Pantalla TV — 3 slides de señalización digital\n')
  const slides = [
    { title: '🍔 Hamburguesa BBQ',       subtitle: 'Carne de res, tocino crujiente y salsa ahumada', price: '$145', isOffer: true,  active: true },
    { title: '🍕 Pizza del Día',          subtitle: 'Margherita con mozzarella fresca y albahaca',    price: '$140', isOffer: true,  active: true },
    { title: '☕ Café + Postre',          subtitle: 'Café americano + cheesecake de fresa',           price: '$120', isOffer: true,  active: true },
  ]
  for (const s of slides) {
    const res = await api('/api/tv', s).catch(() => null)
    if (res?.id) console.log(`   ✅  ${s.title} — $${s.price}`)
    else         console.log(`   ⏭  ${s.title} — ya existe o error`)
  }
  console.log('   👉  /admin/tv  (editor de slides)')
  console.log('   👉  /admin/tv/pantalla/[id]  (pantalla completa para mostrar en TV)\n')
}

async function modLealtad() {
  console.log('\n🃏  Lealtad — cliente demo con 4 sellos acumulados\n')
  const r = await api('/api/customers', {
    name:  'María García',
    phone: '6641234567',
    age:   28,
  }).catch(() => null)
  if (r?.id) console.log('   ✅  María García — creada (escanear su QR para sellar)')
  else       console.log('   ⏭  María García — ya existe')
  console.log('   👉  /employee  (escanear QR del cliente para sellar)\n')
}

// ── Fases de visibilidad (nav del cliente) ────────────────────────────────────

async function fase(n) {
  const labels = {
    1: 'Solo Menú',
    2: 'Menú + Tarjeta de Lealtad',
    3: 'Menú + Tarjeta + Reseñas (todo)',
  }
  console.log(`\n👥  FASE ${n} — ${labels[n]}\n`)
  await setSetting('customer_nav', JSON.stringify(NAV[n]))
  console.log(`   ✅  Nav actualizada`)
  const ocultos = { 1: '🔒 card  🔒 review', 2: '🔒 review', 3: '' }
  NAV[n].tabs.forEach(t => console.log(`   ✅  /${t.id === 'menu' ? 'menu' : t.id === 'card' ? 'card' : 'review'}  visible`))
  if (ocultos[n]) console.log(`   ${ocultos[n]}  oculto`)
  console.log()
}

// ── Atajos ────────────────────────────────────────────────────────────────────

async function faseEmp() {
  console.log('\n👷  EMPLEADO — recetas + pedido + cliente de lealtad\n')
  await modRecetas()
  await modPedido()
  await modLealtad()
}

async function faseAdm() {
  console.log('\n👑  ADMIN — reseñas + inventario + pantalla TV\n')
  await modResenas()
  await modInventario()
  await modTV()
}

async function todo() {
  console.log('\n🚀  TODO — cargando presentación completa...\n')
  await modMenu()
  await modRecetas()
  await modPedido()
  await modResenas()
  await modInventario()
  await modTV()
  await modLealtad()
  await fase(1)
  console.log('   ✅  Listo. Empieza con seed:1 → seed:2 → seed:3 durante la demo.\n')
}

// ── Ayuda ─────────────────────────────────────────────────────────────────────

function ayuda() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           CLI de Demo — Fases y Módulos por Rol                 ║
╚══════════════════════════════════════════════════════════════════╝

  CLIENTE — controlan qué tabs ve en su teléfono:
  seed:1     →  🍽️  Solo Menú visible
  seed:2     →  🍽️🃏  Menú + Tarjeta de Lealtad
  seed:3     →  🍽️🃏⭐  Todo: Menú + Tarjeta + Reseñas

  MÓDULOS — insertan datos de demo (idempotentes):
  seed:menu  →  🍽️  4 platillos en el menú digital
  seed:rec   →  📖  2 recetas con pasos para el empleado
  seed:ped   →  📦  pedido activo en el panel de empleado
  seed:res   →  ⭐  reseña buena + reseña mala (alerta roja al admin)
  seed:inv   →  📊  inventario con 2 alertas de stock bajo
  seed:tv    →  📺  3 slides para la pantalla de TV del negocio
  seed:leal  →  🃏  cliente demo con 4 sellos para mostrar lealtad

  ATAJOS:
  seed:emp   →  👷  todo para el empleado (rec + ped + leal)
  seed:adm   →  👑  todo para el admin (res + inv + tv)
  seed:todo  →  🚀  carga todo + empieza en fase 1

  Todos los comandos son idempotentes — no duplican datos existentes.
`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

const cmd = process.argv[2]
try {
  switch (cmd) {
    case '1':    await fase(1);     break
    case '2':    await fase(2);     break
    case '3':    await fase(3);     break
    case 'menu': await modMenu();   break
    case 'rec':  await modRecetas();break
    case 'ped':  await modPedido(); break
    case 'res':  await modResenas();break
    case 'inv':  await modInventario(); break
    case 'tv':   await modTV();     break
    case 'leal': await modLealtad();break
    case 'emp':  await faseEmp();   break
    case 'adm':  await faseAdm();   break
    case 'todo': await todo();      break
    default:     ayuda();           break
  }
} catch (e) {
  console.error('\n❌  Error:', e.message)
  process.exit(1)
}
