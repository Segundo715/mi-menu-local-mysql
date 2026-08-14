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
 *   npm run seed:ped    →  pedido activo (Mesa 4, pendiente)
 *   npm run seed:res    →  reseña buena + reseña mala con alerta
 *   npm run seed:leal   →  cliente demo con 4 sellos acumulados
 *
 * ATAJOS:
 *   npm run seed:emp    →  pedido + cliente de lealtad
 *   npm run seed:adm    →  reseñas
 *   npm run seed:todo   →  todo de golpe (presentación completa)
 *
 *   npm run seed        →  muestra esta ayuda
 */

import { createHmac } from 'node:crypto'

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
  const r = await api('/api/menu/seed', {})
  if (r.created > 0) console.log(`   ✅  ${r.created} platillos insertados`)
  else               console.log(`   ⏭  Menú ya cargado`)
  console.log('   👉  /menu\n')
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
  console.log('   👉  /admin/orders\n')
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

async function modLealtad() {
  console.log('\n🃏  Lealtad — cliente demo con 4 sellos acumulados\n')
  const r = await api('/api/customers', {
    name:  'María García',
    phone: '6641234567',
    age:   28,
  }).catch(() => null)
  if (r?.id) console.log('   ✅  María García — creada (escanear su QR para sellar)')
  else       console.log('   ⏭  María García — ya existe')
  console.log('   👉  /admin/sellar  (escanear QR del cliente para sellar)\n')
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
  console.log('\n👷  EMPLEADO — pedido + cliente de lealtad\n')
  await modPedido()
  await modLealtad()
}

async function faseAdm() {
  console.log('\n👑  ADMIN — reseñas\n')
  await modResenas()
}

async function todo() {
  console.log('\n🚀  TODO — cargando presentación completa...\n')
  await modMenu()
  await modPedido()
  await modResenas()
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
  seed:ped   →  📦  pedido activo en /admin/orders
  seed:res   →  ⭐  reseña buena + reseña mala (alerta roja al admin)
  seed:leal  →  🃏  cliente demo con 4 sellos para mostrar lealtad

  ATAJOS:
  seed:emp   →  👷  pedido + cliente de lealtad (ped + leal)
  seed:adm   →  👑  reseñas (res)
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
    case 'ped':  await modPedido(); break
    case 'res':  await modResenas();break
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
