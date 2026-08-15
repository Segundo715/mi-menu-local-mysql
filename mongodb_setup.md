# Restaurante — Esquema MongoDB

Reemplaza a `mysql_setup.sql` (ahora retirado). MongoDB es schemaless — no hay
`CREATE TABLE`, las colecciones se crean solas al insertar el primer
documento. Este archivo documenta la forma esperada de cada colección para
que `lib/*Db.ts` siga siendo la única fuente de verdad de qué campos existen.

Todas usan `_id` como string (los mismos UUID que ya generaba la app con
`randomUUID()` — **no** se usa `ObjectId`). Todas salvo `settings` tienen un
campo `restaurantId` (equivalente a la columna `restaurant_id` de MySQL).

## Colecciones activas

### `menu_items`
```
_id: string, name: string, description: string, price: number, category: string,
imageUrl: string | null, available: boolean, likes: number, createdAt: Date,
restaurantId: string
```

### `orders`
```
_id: string, customerName: string, tableNumber: string | null,
items: { menuItemId, name, quantity, price }[], total: number,
status: 'pending' | 'preparing' | 'ready' | 'delivered', notes: string | null,
createdAt: Date, restaurantId: string
```

### `loyalty_cards`
```
_id: string, name: string, phone: string, visits: number, active: boolean,
cardType: string, expiresAt: Date | null, stamps: { timestamp, visitsAfter }[],
registeredAt: Date, restaurantId: string
```
`cardType` referencia el `id` de una categoría dentro del JSON
`settings.reward_categories` — sin FK real, igual que en MySQL.

### `reviews`
```
_id: string, customerName: string, rating: number, comment: string,
published: boolean, bad: boolean, createdAt: Date, restaurantId: string
```

### `customers` (modelo legacy, solo lo usa `/admin/sellar`)
```
_id: string, name: string, age: number | null, phone: string, visits: number,
confirmed: boolean, registeredAt: Date, stamps: { timestamp, visitsAfter }[],
requestedAt: Date | null, passwordHash: string | null, restaurantId: string
```

### `employees`
```
_id: string, name: string, passwordHash: string, role: string,
createdAt: Date, restaurantId: string
```

### `admins`
```
_id: string, name: string, passwordHash: string, role: string,
createdAt: Date, restaurantId: string
```
`role='Resta3'` es un subtipo sin login propio (ver `app/api/resta3/users/route.ts`).

### `settings`
```
_id: string (la "key", con prefijo de restaurante vía scopedKey), value: string
```
Sin `restaurantId` — el filtrado por restaurante va codificado en el propio `_id`.

### `sa_tickets` ("Reportar problema")
```
_id: string, restaurantId: string, restaurantName: string | null,
fromName: string | null, fromRole: string | null, message: string, createdAt: Date
```

## Índices recomendados

`_id` ya tiene índice único automático en Mongo (no hace falta crearlo). Para
mejor rendimiento a futuro, opcionalmente:

```js
db.menu_items.createIndex({ restaurantId: 1 })
db.orders.createIndex({ restaurantId: 1, createdAt: -1 })
db.loyalty_cards.createIndex({ restaurantId: 1, phone: 1 })
db.reviews.createIndex({ restaurantId: 1, published: 1 })
```

No son obligatorios para que la app funcione — las colecciones son pequeñas.

## Colecciones que existían en MySQL pero no se migran

`recipes`, `tv_slides`, `tables`, `inventory`, `birthday_registrations` — ya
no tenían código que las leyera/escribiera desde antes de esta migración (ver
`CLAUDE.md`). No se migran a Mongo.

## Migración de datos desde el MySQL local

`scripts/migrate-mysql-to-mongo.mjs` — copia los datos reales del MySQL local
a la base de Mongo indicada en `MONGODB_URI`. Es idempotente (usa `_id` para
hacer upsert, correrlo varias veces no duplica). Ver `npm run migrate:mongo`.
