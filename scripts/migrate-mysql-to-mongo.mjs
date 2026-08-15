// Migración única: copia los datos reales del MySQL local a MongoDB Atlas.
// Requiere MONGODB_URI en .env.local (ya con el connection string real de Atlas).
// El MySQL de origen se asume local (mismos valores que usaba .env.local antes
// de la migración) — se puede sobreescribir con las env vars de abajo si hace falta.
//
// Ejecutar: node --env-file=.env.local scripts/migrate-mysql-to-mongo.mjs

import mysql from 'mysql2/promise'
import { MongoClient } from 'mongodb'
import { setServers } from 'node:dns'

// Ver lib/mongodb.ts: el resolutor de DNS de Node en Windows a veces no
// resuelve el SRV de "mongodb+srv://" aunque el sistema sí pueda.
setServers(['8.8.8.8', '1.1.1.1'])

const MYSQL_HOST     = process.env.SOURCE_MYSQL_HOST || 'localhost'
const MYSQL_PORT     = Number(process.env.SOURCE_MYSQL_PORT || 3306)
const MYSQL_USER     = process.env.SOURCE_MYSQL_USER || 'root'
const MYSQL_PASSWORD = process.env.SOURCE_MYSQL_PASSWORD || '12345'
const MYSQL_DATABASE = process.env.SOURCE_MYSQL_DATABASE || 'mi_menu'

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DB  = process.env.MONGODB_DB || 'mi_menu'

if (!MONGODB_URI) {
  console.error('❌ Falta MONGODB_URI. Agrégalo a .env.local (el connection string real de Atlas) antes de correr esto.')
  process.exit(1)
}

const bool = v => Boolean(v)
const json = (v, fallback) => {
  if (v == null) return fallback
  if (typeof v === 'string') { try { return JSON.parse(v) } catch { return fallback } }
  return v
}
const iso = d => (d instanceof Date ? d : new Date(d))

// tabla MySQL → { coleccion, mapeo de fila a documento Mongo (_id incluido) }
const TABLES = [
  {
    table: 'menu_items', collection: 'menu_items',
    map: r => ({
      _id: r.id, name: r.name, description: r.description ?? '', price: r.price,
      category: r.category, imageUrl: r.image_url ?? null, available: bool(r.available),
      likes: r.likes ?? 0, createdAt: iso(r.created_at), restaurantId: r.restaurant_id ?? 'default',
    }),
  },
  {
    table: 'orders', collection: 'orders',
    map: r => ({
      _id: r.id, customerName: r.customer_name, tableNumber: r.table_number ?? null,
      items: json(r.items, []), total: r.total, status: r.status, notes: r.notes ?? null,
      createdAt: iso(r.created_at), restaurantId: r.restaurant_id ?? 'default',
    }),
  },
  {
    table: 'loyalty_cards', collection: 'loyalty_cards',
    map: r => ({
      _id: r.id, name: r.name, phone: r.phone ?? '', visits: r.visits ?? 0, active: bool(r.active),
      cardType: r.card_type ?? 'cafe', expiresAt: r.expires_at ? iso(r.expires_at) : null,
      stamps: json(r.stamps, []), registeredAt: iso(r.registered_at), restaurantId: r.restaurant_id ?? 'default',
    }),
  },
  {
    table: 'reviews', collection: 'reviews',
    map: r => ({
      _id: r.id, customerName: r.customer_name, rating: r.rating, comment: r.comment ?? '',
      published: bool(r.published), bad: bool(r.bad), createdAt: iso(r.created_at),
      restaurantId: r.restaurant_id ?? 'default',
    }),
  },
  {
    table: 'customers', collection: 'customers',
    map: r => ({
      _id: r.id, name: r.name, age: r.age ?? null, phone: r.phone ?? '',
      visits: r.visits ?? 0, confirmed: bool(r.confirmed), registeredAt: iso(r.registered_at),
      stamps: json(r.stamps, []), requestedAt: r.requested_at ? iso(r.requested_at) : null,
      passwordHash: r.password_hash ?? null, restaurantId: r.restaurant_id ?? 'default',
    }),
  },
  {
    table: 'employees', collection: 'employees',
    map: r => ({
      _id: r.id, name: r.name, passwordHash: r.password_hash, role: r.role ?? 'Mesero',
      createdAt: iso(r.created_at), restaurantId: r.restaurant_id ?? 'default',
    }),
  },
  {
    table: 'admins', collection: 'admins',
    map: r => ({
      _id: r.id, name: r.name, passwordHash: r.password_hash, role: r.role ?? 'Administrador',
      createdAt: iso(r.created_at), restaurantId: r.restaurant_id ?? 'default',
    }),
  },
  {
    table: 'settings', collection: 'settings',
    map: r => ({ _id: r.key, value: r.value }),
  },
  {
    table: 'sa_tickets', collection: 'sa_tickets',
    map: r => ({
      _id: r.id, restaurantId: r.restaurant_id ?? 'default', restaurantName: r.restaurant_name ?? null,
      fromName: r.from_name ?? null, fromRole: r.from_role ?? null, message: r.message,
      createdAt: iso(r.created_at),
    }),
  },
]

async function main() {
  console.log(`\n🔌  Conectando a MySQL (${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE})...`)
  const mysqlConn = await mysql.createConnection({
    host: MYSQL_HOST, port: MYSQL_PORT, user: MYSQL_USER, password: MYSQL_PASSWORD, database: MYSQL_DATABASE,
    decimalNumbers: true,
  })

  console.log('🔌  Conectando a MongoDB Atlas...')
  const mongoClient = new MongoClient(MONGODB_URI)
  await mongoClient.connect()
  const db = mongoClient.db(MONGODB_DB)

  console.log('\n📦  Migrando...\n')
  for (const { table, collection, map } of TABLES) {
    try {
      const [rows] = await mysqlConn.query(`SELECT * FROM \`${table}\``)
      if (rows.length === 0) { console.log(`   ⏭  ${table}: sin filas, nada que migrar`); continue }
      const docs = rows.map(map)
      const col = db.collection(collection)
      // upsert por _id → correr el script varias veces no duplica datos.
      const ops = docs.map(doc => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } }))
      const result = await col.bulkWrite(ops)
      console.log(`   ✅  ${table} → ${collection}: ${docs.length} filas (${result.upsertedCount} nuevas, ${result.modifiedCount} actualizadas)`)
    } catch (e) {
      console.log(`   ⚠️  ${table}: ${e.message} (¿la tabla no existe en tu MySQL? se salta)`)
    }
  }

  // Índice único en settings.key, para que el upsert de getSetting/setSetting sea consistente.
  await db.collection('settings').createIndex({ _id: 1 }, { unique: true }).catch(() => {})

  console.log('\n✅  Migración terminada.\n')
  await mysqlConn.end()
  await mongoClient.close()
}

main().catch(e => { console.error('\n❌  Error:', e); process.exit(1) })
