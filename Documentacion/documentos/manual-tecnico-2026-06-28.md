# Manual Técnico — Plataforma NICHO (`mi-proyecto`)

**Versión:** 2026-06-28
**Dirigido a:** Desarrolladores
**Stack:** Next.js 16 (App Router, webpack) · React 19 · TypeScript · Tailwind CSS 4 · Supabase · Konva/react-konva · lottie-react

> ⚠️ Esta es **Next.js 16** con cambios que rompen compatibilidad con versiones anteriores. Consulta `AGENTS.md` y lee `node_modules/next/dist/docs/` antes de escribir código del framework. Los `params` de rutas dinámicas y `cookies()` son **asíncronos** (`await`).

---

## 1. Arquitectura general

### 1.1 Resumen

`mi-proyecto` es una aplicación SaaS **multi-restaurante** monolítica. Este repositorio sirve a **NICHO** (`NEXT_PUBLIC_RESTAURANT_ID` ausente → `'default'`). Comparte la misma instancia de Supabase con `mi-restauranteportales` (`restaurant_id='portales'`); el aislamiento es **por columna `restaurant_id`** en cada tabla.

```
                       ┌──────────────────────────────────────────┐
                       │            Supabase (1 proyecto)          │
                       │  Tablas con columna restaurant_id          │
                       │  customers · loyalty_cards · menu_items     │
                       │  orders · recipes · reviews · tv_slides     │
                       │  settings · admins · employees · tables     │
                       │  inventory · birthday_registrations         │
                       │  sa_tickets · Storage bucket "uploads"      │
                       └───────────────▲──────────────▲────────────┘
                                       │              │
              restaurant_id='default'  │              │  restaurant_id='portales'
                                       │              │
        ┌──────────────────────────────┴───┐   ┌──────┴───────────────────────┐
        │          mi-proyecto (NICHO)      │   │   mi-restauranteportales      │
        │  Next.js 16 · Vercel              │   │   (sincronizado vía GH Action)│
        └───────────────────────────────────┘   └───────────────────────────────┘
                          ▲
                          │  /api/features (CORS), /api/tickets
                          │
        ┌─────────────────┴───────────────────┐
        │   mi-superadmindrestaurante           │
        │   (gestiona feature flags y permisos) │
        └───────────────────────────────────────┘
```

### 1.2 Audiencias y rutas

- **Clientes** (público): `/menu`, `/review`, `/resena`, `/recetas`, `/resetas`, `/card` (+ `/card/premium`, `/card/2x1`, `/card/descuento`, `/card/wallet`, `/card/usuario`), `/registro`, `/loyalty`, `/activate`, `/tv`.
- **Empleados** (`/employee/*`): `orders`, `menu`, `recipes`, `customers`, `tv`. Login en `/employee/login`.
- **RESTA3** (`/resta3/*`): grupo de rutas `(panel)` con `tpv`, `mesas`, `cocina`, `domicilios`, `inventario`, `compras`, `empleados`, `menu`, `reportes`, `corte`, `tv`. Login en `/resta3/login`.
- **Admins** (`/admin/*`): `analytics`, `estadisticas`, `marketing`, `crm`, `reservaciones`, `ventas`, `menu`, `recipes`, `operaciones`, `tv`, `sellar`, `tarjetas`, `reviews`, `automatizaciones`, `contenido`, `produccion`, `reportes`, `cumpleanos`, `configuracion`, `resta3` (gestión de usuarios RESTA3). Login en `/admin/login`.

`app/page.tsx` redirige `/` → `/menu`.

### 1.3 Decisiones de diseño clave

- **Monolito por dominio:** cada dominio de datos vive en un `lib/*Db.ts` propio (server-only) que es dueño de una tabla.
- **Aislamiento por `restaurant_id`** en lugar de proyectos separados de Supabase.
- **WebP en el cliente:** `sharp` no funciona en Vercel Hobby; la conversión ocurre en el navegador (Canvas API).
- **Auth con HMAC firmado** en cookie HttpOnly, verificada tanto en Node (API Routes) como en Edge (middleware).
- **Feature flags + permisos** controlados externamente por el super-admin vía la tabla `settings`.

---

## 2. Setup de desarrollo

### 2.1 Requisitos

- Node.js 20+
- Cuenta de Supabase (URL + claves)
- Archivo `.env.local` en la raíz

### 2.2 Comandos (`package.json`)

```bash
npm run dev      # Servidor de desarrollo (next dev --webpack)
npm run build    # Build de producción
npm run start    # Servir build
npm run lint     # ESLint
npx tsc --noEmit # Verificar tipos sin emitir
```

> No hay suite de pruebas. **Siempre** ejecutar `npx tsc --noEmit` — los diagnósticos del IDE suelen estar obsoletos.

**Seeds** (cargan datos de prueba desde `scripts/seed.mjs` con `--env-file=.env.local`):

```bash
npm run seed:menu   # menú      npm run seed:rec   # recetas
npm run seed:ped    # pedidos   npm run seed:res   # reseñas
npm run seed:inv    # inventario npm run seed:tv   # tv slides
npm run seed:leal   # lealtad   npm run seed:emp   # empleados
npm run seed:adm    # admins    npm run seed:todo  # todo
```

### 2.3 Variables de entorno

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (cliente y server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon (cliente `supabase`) |
| `SUPABASE_SERVICE_KEY` | Clave service-role (usada por `birthdayDb.ts`; fallback a anon) |
| `ADMIN_SECRET` | Sal/secreto para hashing de contraseñas y firma HMAC de sesión |
| `NEXT_PUBLIC_RESTAURANT_ID` | ID del restaurante; ausente → `'default'` (NICHO) |
| `GROQ_API_KEY` | Clave para el asistente IA (Groq / Llama 3) |
| `SUPERADMIN_URL` | URL del super-admin para auto-registro al hacer login |
| `NICHO_REGISTER_KEY` | Clave compartida para el endpoint de registro del super-admin |

> ⚠️ **BOM:** PowerShell puede prefijar `U+FEFF` a las env vars al guardarlas en Vercel. `lib/supabase.ts` y `lib/birthdayDb.ts` hacen strip manual del BOM.

---

## 3. Multi-tenancy

### 3.1 Filtrado por `restaurant_id`

Todos los módulos `lib/*Db.ts` declaran:

```ts
const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'
```

y filtran **todas** las lecturas con `.eq('restaurant_id', RID)` y agregan `restaurant_id: RID` en todos los inserts. Ejemplo real (`lib/menuDb.ts`):

```ts
export async function getAllMenuItems(): Promise<MenuItem[]> {
  const { data } = await supabase.from('menu_items')
    .select('*').eq('restaurant_id', RID).order('created_at')
  return (data ?? []).map(toItem)
}
```

**Regla:** al crear una tabla nueva, añade siempre `restaurant_id TEXT DEFAULT 'default'` y filtra en el módulo correspondiente.

### 3.2 Excepción — `settingsDb.ts` (scopedKey)

La tabla `settings` **no** tiene columna `restaurant_id`; se aísla por **prefijo de clave**:

```ts
function scopedKey(key: string): string {
  return RID === 'default' ? key : `${RID}:${key}`
}
export async function getSetting(key: string, fallback = ''): Promise<string> {
  const { data } = await supabase.from('settings').select('value').eq('key', scopedKey(key)).maybeSingle()
  return data?.value ?? fallback
}
export async function setSetting(key: string, value: string): Promise<void> {
  await supabase.from('settings').upsert({ key: scopedKey(key), value }, { onConflict: 'key' })
}
```

Para NICHO las claves se guardan sin prefijo; para portales se guardan como `portales:restaurant_name`, etc.

### 3.3 Excepción — `getFeatureFlags()`

`lib/features.ts` consulta Supabase **directamente** (no vía `getSetting`), buscando primero la clave específica del restaurante y luego la global:

```ts
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID
  const keys = rid ? [`feature_flags_${rid}`, 'feature_flags'] : ['feature_flags']
  let overrides: Partial<FeatureFlags> = {}
  for (const key of keys) {
    const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle()
    if (data?.value) { overrides = JSON.parse(data.value); break }
  }
  // Feature ausente en Supabase → habilitada por defecto
  return Object.fromEntries(
    Object.keys(FEATURES).map(k => [k, overrides[k as FeatureKey] ?? true])
  ) as FeatureFlags
}
```

`FEATURES` (catálogo) incluye: `orders`, `menu`, `reviews`, `tv`, `customers`, `analytics`, `loyaltyCard`, `favorites`, `ventas`, `marketing`, `crm`, `reservaciones`, `operaciones`, `automatizaciones`, `contenido`, `produccion`, `reportes`, `configuracion`, `cumpleanos`.

---

## 4. Sistema de autenticación

### 4.1 Tokens HMAC

`lib/auth.ts` (Node Runtime, API Routes):

```ts
import { createHmac } from 'node:crypto'
const SECRET = process.env.ADMIN_SECRET ?? 'dev-secret'
function hmac(data: string): string {
  return createHmac('sha256', SECRET).update(data).digest('hex')
}
// Token: "<adminId>.<firma>"
export function createSession(adminId: string): string {
  return `${adminId}.${hmac(adminId)}`
}
export function verifySession(session?: string): string | null {
  if (!session) return null
  const dot = session.lastIndexOf('.')
  if (dot === -1) return null
  const adminId = session.slice(0, dot)
  const sig = session.slice(dot + 1)
  if (!adminId || hmac(adminId) !== sig) return null
  return adminId
}
```

El formato del token es `<id>.<hmac_sha256(id)>`. La firma protege contra falsificación del id.

### 4.2 Hashing de contraseñas

Cada audiencia usa un **prefijo de namespace** distinto para que el mismo nombre+contraseña produzca hashes diferentes:

| Módulo | Fórmula |
|---|---|
| `adminDb.ts` | `SHA-256(ADMIN_SECRET:name.toLowerCase():password)` |
| `employeeDb.ts` | `SHA-256(emp:ADMIN_SECRET:name.toLowerCase():password)` |
| `db.ts` (clientes) | `SHA-256(customer:name.toLowerCase():password)` |

Las búsquedas usan `ilike` (case-insensitive sobre el nombre) + `restaurant_id`.

### 4.3 Cookies

`POST /api/auth` (login/registro de admin) establece:

```ts
res.cookies.set('admin_session', createSession(admin.id),
  { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 86400 })  // 24h
res.cookies.set('admin_name', admin.name,
  { path: '/', sameSite: 'lax', maxAge: 86400 })  // legible por JS para UI
```

- `admin_session` — HttpOnly, firmada (no manipulable desde JS).
- `admin_name` — no HttpOnly, solo para mostrar en la UI.
- Cookies análogas: `employee_session`, `resta3_session`.

`DELETE /api/auth` cierra sesión poniendo `maxAge: 0`.

### 4.4 Guards

**Páginas (Edge Runtime) — `middleware.ts`:** reimplementa la verificación HMAC con **Web Crypto API** (porque Edge no tiene `node:crypto`):

```ts
const key = await crypto.subtle.importKey('raw', enc.encode(secret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
const computed = await crypto.subtle.sign('HMAC', key, enc.encode(id))
```

`matcher: ['/admin', '/admin/:path*', '/employee', '/employee/:path*']`. Las rutas `*/login` están exentas. Si la sesión es inválida, redirige a la página de login correspondiente.

**APIs (Node Runtime):** cada handler protegido llama `verifySession(req.cookies.get('<cookie>')?.value)` y devuelve `401` si falla. Las rutas que escriben en RESTA3 leen `cookies()` (asíncrono):

```ts
const jar = await cookies()
if (!verifySession(jar.get('resta3_session')?.value))
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
```

### 4.5 Auto-registro en el super-admin

`POST /api/auth` (login exitoso) dispara `pingSuperAdmin()` en fire-and-forget hacia `${SUPERADMIN_URL}/api/public/register` con `NICHO_REGISTER_KEY`, reportando el `restaurantId` y la cantidad de usuarios. Los logins con rol `Resta3` se rechazan en el endpoint de admin.

---

## 5. Capa de datos (`lib/*Db.ts`)

Todos los módulos son **solo de servidor** (nunca importar desde componentes cliente). Patrón común: tipos camelCase en TS, columnas snake_case en BD, mapper `toX(row)`, patch parcial en updates para no sobrescribir con `undefined`.

| Módulo | Tabla | Notas |
|---|---|---|
| `db.ts` | `customers` | Lealtad + cuentas de cliente. Máquina de estados de activación. |
| `loyaltyDb.ts` | `loyalty_cards` | Flag `active`, `expires_at` rotativo (~90 días / 3 meses). |
| `menuDb.ts` | `menu_items` | CRUD, `likes`, `available`. |
| `ordersDb.ts` | `orders` | `status`: pending → preparing → ready → delivered. |
| `recipeDb.ts` | `recipes` | `ingredients: string[]`, `steps: string[]`. |
| `reviewDb.ts` | `reviews` | `bad = rating <= 3`, `published = rating >= 4`. |
| `tvDb.ts` | `tv_slides` | `slide_order`, `active`, `is_offer`. |
| `settingsDb.ts` | `settings` | Clave-valor con `scopedKey`. |
| `adminDb.ts` | `admins` | Hashing con `ADMIN_SECRET`. |
| `employeeDb.ts` | `employees` | Hashing con prefijo `emp:`. |
| `tablesDb.ts` | `tables` | `status`: libre \| ocupada \| reservada \| limpieza. |
| `inventoryDb.ts` | `inventory` | `stock`, `min_stock` (umbral de alerta). |
| `birthdayDb.ts` | `birthday_registrations` | **fetch directo a REST**, no supabase-js. |

### 5.1 Ejemplo de mapper y update parcial (`menuDb.ts`)

```ts
function toItem(row: Record<string, unknown>): MenuItem {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    price: row.price as number,
    category: row.category as string,
    imageUrl: (row.image_url as string) ?? undefined,
    available: row.available as boolean,
    likes: (row.likes as number) ?? 0,
    createdAt: row.created_at as string,
  }
}

export async function updateMenuItem(id, data) {
  const patch: Record<string, unknown> = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.price !== undefined) patch.price = data.price
  if (data.imageUrl !== undefined) patch.image_url = data.imageUrl
  // ...solo campos definidos
  const { data: row } = await supabase.from('menu_items').update(patch).eq('id', id).select().single()
  return row ? toItem(row) : null
}
```

### 5.2 Lógica de lealtad (`loyaltyDb.ts` / `db.ts`)

- `findOrCreate(name, phone, cardType, validityMonths)` — busca por nombre + teléfono **normalizado** (`phone.replace(/\D/g, '')`); crea inactiva si no existe.
- `addStamp(id)` — solo suma si `active && visits < 5`; renueva `expires_at`.
- `activateCard(id)` / `deactivateCard(id)` — flag `active`.
- `redeemCoffee(id)` — resetea `visits` a 0.

### 5.3 Caso especial — `birthdayDb.ts`

Usa **fetch directo** a la API REST de Supabase con `SUPABASE_SERVICE_KEY` (fallback anon), por incompatibilidades del cliente supabase-js en ese contexto. Hace strip de BOM manual:

```ts
function getBase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const raw = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const key = raw.replace(new RegExp('^' + BOM), '').trim()
  return { url, key }
}
```

---

## 6. APIs

Convenciones: respuestas con `Response.json(...)` o `NextResponse.json(...)`. Auth con `verifySession`. Errores con status HTTP (`400`, `401`, `500`).

| Endpoint | Métodos | Auth | Descripción |
|---|---|---|---|
| `/api/auth` | POST, DELETE | — / cookie | Login+registro de admin (`action`). DELETE cierra sesión. |
| `/api/employee/auth` | POST | — | Login de empleado. |
| `/api/resta3/auth` | POST | — | Login de RESTA3. |
| `/api/menu` | GET, POST | GET público / POST admin | Lista menú / crea platillo. |
| `/api/menu/[id]` | PATCH, DELETE | admin | Editar / eliminar platillo. |
| `/api/menu/[id]/like` | POST | — | Incrementa `likes`. |
| `/api/menu/upload` | POST | admin | Sube imagen al bucket `uploads/menu/`. |
| `/api/orders` | GET, POST | GET y POST públicos | Lista pedidos / crea pedido. |
| `/api/orders/[id]` | PATCH | — | Cambia estado o campos del pedido. |
| `/api/recipes`, `/api/recipes/[id]`, `/api/recipes/seed`, `/api/recipes/upload` | varios | admin | CRUD de recetas + seed. |
| `/api/reviews`, `/api/reviews/[id]` | GET, POST, PATCH | público / admin | Reseñas. |
| `/api/loyalty`, `/api/loyalty/[id]` | GET, POST, PATCH | público | Tarjetas de lealtad. |
| `/api/customers`, `/api/customers/[id]` | varios | admin | Clientes. |
| `/api/customer-auth` | POST | — | Login de cliente con cuenta. |
| `/api/admins`, `/api/employees` | varios | admin | Gestión de perfiles. |
| `/api/inventory` | varios | RESTA3/admin | Inventario. |
| `/api/tv`, `/api/tv/[id]`, `/api/tv/upload` | varios | admin | Señalización TV. |
| `/api/settings`, `/api/settings/upload` | GET, POST | público GET / admin | Lectura/escritura de `settings`. |
| `/api/cumpleanos`, `/api/cumpleanos/[id]` | varios | admin | Cumpleaños. |
| `/api/analytics` | GET | admin | Métricas. |
| `/api/features` | GET, POST, OPTIONS | CORS super-admin | Lee/escribe feature flags. |
| `/api/permissions` | GET | — | Permisos de empleado y usuario. |
| `/api/resta3/corte` | GET, POST | resta3 | Corte de caja por turno. |
| `/api/resta3/features`, `/api/resta3/inventory`, `/api/resta3/tables`, `/api/resta3/users` | varios | resta3 | Operación RESTA3. |
| `/api/ai/chat` | POST | — | Asistente IA por streaming. |
| `/api/tickets` | POST | cualquier sesión | Reporta ticket de soporte. |

### 6.1 `/api/auth` (POST)

Body: `{ action: 'login' | 'register', name, password }`.
- `register`: crea admin, retorna `409` si el nombre ya existe.
- `login`: autentica; rechaza rol `Resta3`; retorna `401` si falla. Setea cookies y dispara `pingSuperAdmin()`.

### 6.2 `/api/orders` (POST, público)

```ts
const { customerName, tableNumber, items, total, notes } = await req.json()
if (!customerName?.trim() || !Array.isArray(items) || items.length === 0)
  return Response.json({ error: 'Nombre e items requeridos' }, { status: 400 })
```

El **tipo de pedido, domicilio y forma de pago** se codifican en el campo `notes` (la tabla no tiene columnas dedicadas). El cliente arma el texto con `buildOrderNotes()` (prefijos `🍽 En restaurante` / `🛵 A domicilio`, `Pago: ...`).

### 6.3 `/api/features` (CORS)

CORS **restringido** al dominio del super-admin:

```ts
const CORS = {
  'Access-Control-Allow-Origin': 'https://mi-superadmindrestaurante.vercel.app',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
}
```

`POST` hace `upsert` en `settings` con la clave `settingsKey` (default `feature_flags`).

### 6.4 `/api/resta3/corte` (corte de caja)

Categoriza ventas del turno por prefijo en `notes`:

```ts
const DELIVERY_KEYS = ['GOGO', 'RAPPI', 'UBEREATS']
// [GOGO]/[RAPPI]/[UBEREATS] → domicilio
// [TARJETA] → tarjeta ; [TRANSFERENCIA] → transferencia ; resto → efectivo
```

`GET` devuelve totales del turno actual (filtra `orders` con `createdAt >= turno.at`) + historial (últimos 30). `POST` cierra el corte, lo guarda en `settings.cortes_historial` (máx 100) y arranca turno nuevo en `corte_turno_inicio`.

### 6.5 `/api/tickets`

Acepta cualquier sesión válida (`admin_session` || `employee_session` || `resta3_session`). Inserta en `sa_tickets` con `restaurant_id`, `restaurant_name` (de `settings`), `from_name`, `from_role`, `message`.

---

## 7. Feature flags y permisos

### 7.1 Flujo completo

```
Super-admin  ──POST /api/features──▶  settings.feature_flags(_rid)
                                        │
                  getFeatureFlags() ◀───┘
                        │
         ┌──────────────┴───────────────┐
         ▼                              ▼
  admin/layout.tsx (SSR)        AdminNav (cliente, /api/features)
  → BrandProvider.features      → oculta links deshabilitados ("PRO")
         │
         ▼
  FeatureGuard (cliente) → redirige si el módulo de la ruta está OFF
```

### 7.2 Permisos granulares

`/api/permissions` (GET) combina dos claves de `settings` con fallback por restaurante:

```ts
async function getPerms(baseKey: string) {
  const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID
  const keys = rid ? [`${baseKey}_${rid}`, baseKey] : [baseKey]
  for (const key of keys) {
    const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle()
    if (data?.value) return JSON.parse(data.value)
  }
  return {}
}
// Devuelve { employee: {...}, user: {...} }
```

- **Empleado:** módulos como `emp_pedidos`, `emp_menu_ver`, `emp_recetario`, `emp_clientes_ver`, `emp_pantalla_tv`, `emp_fidelizacion`.
- **Usuario/cliente:** `usr_menu`, `usr_resenas`, `usr_tarjeta` (consumidos por `CustomerNav`).

### 7.3 `FeatureGuard` (componente invisible)

`app/components/FeatureGuard.tsx` corre en cada navegación. Mapea ruta → feature/permiso y, si está OFF, redirige:

- **Admin:** `ROUTE_FEATURE[pathname]` contra `/api/features`; fallback al primer módulo habilitado de `ADMIN_FALLBACKS`.
- **Empleado:** `EMPLOYEE_ROUTE_MODULE[pathname]` contra `/api/permissions`.
- **RESTA3:** deriva el flag del segmento de URL: `r3_<segment>` (ej. `/resta3/tpv` → `r3_tpv`) contra `/api/resta3/features`.
- **Cliente:** sin redirección; la visibilidad se maneja en `CustomerNav`.

---

## 8. Sistema de IA (`/api/ai/chat`)

### 8.1 Configuración

- Proveedor: **Groq** (`https://api.groq.com/openai/v1/chat/completions`), API compatible con OpenAI.
- Modelos: `llama-3.1-8b-instant` (cliente, rápido) y `llama-3.3-70b-versatile` (resto).
- **No usa Edge Runtime:** `export const maxDuration = 60`. Edge causaba `401` porque Vercel no inyecta env vars sensibles en ese contexto.

### 8.2 Roles y contexto

`type Role = 'cook' | 'staff' | 'customer' | 'admin' | 'recipe' | 'resta3' | 'employee'`.

`buildSystem(role, restaurantName, menuContext)` arma un system prompt distinto por rol, inyectando datos en vivo de Supabase:

| Rol | Datos inyectados |
|---|---|
| `customer` | Solo el menú enviado por el cliente (sin llamadas a Supabase). |
| `cook` | Pedidos activos + menú + recetario completo. |
| `staff` | Pedidos + menú disponible + tarjetas. |
| `employee` | Pedidos + menú + recetario + tarjetas. |
| `resta3` | Mesas + pedidos + inventario (alertas) + ventas del día. |
| `recipe` | Recetario + menú. |
| `admin` | Resumen del día/semana, pedidos, menú, top likes, reseñas, tarjetas, recetario. |

Cada llamada a Supabase está envuelta en un timeout de 2.5 s (`safe()`), para no exceder los límites de Vercel Hobby.

### 8.3 Streaming

La respuesta se transmite como `text/plain` mediante un `ReadableStream` que parsea los SSE de Groq (`data: ...`, `[DONE]`). Timeouts: 25 s (cliente) / 20 s (resto) con `AbortController`. Maneja errores de Groq (`429` = límite, `401` = clave inválida) devolviendo mensajes legibles en español.

### 8.4 Cliente — `AIChat.tsx`

- Rol detectado por `getRoleFromPath()` o prop explícita.
- Acciones rápidas auto-generadas: para `cook`/`employee` consulta `/api/recipes` y crea un botón por receta.
- Voz: Web Speech API (entrada con micrófono + salida con `speechSynthesis`).
- Recomendaciones: en rol cliente, `findMentioned()` detecta platillos citados en la respuesta y renderiza `DishCard`s; el botón "+ Agregar" emite un `CustomEvent('ai-add-to-cart')` que escucha `menu/page.tsx`.

---

## 9. Subida de imágenes (WebP en el cliente)

### 9.1 Por qué en el cliente

`lib/imageWebp.ts` (servidor) es un **pass-through** — `sharp` no tiene binarios nativos en Vercel Hobby:

```ts
// La conversión WebP ocurre en el navegador (ver lib/uploadWebp.ts).
export async function toWebp(buffer, mimeType) {
  const ext = extMap[mimeType] ?? '.jpg'
  return { data: buffer, contentType: mimeType, ext }
}
```

### 9.2 Conversión en el navegador — `lib/uploadWebp.ts`

`'use client'`. Usa Canvas API para convertir a WebP (calidad 0.82); deja pasar SVG y WebP sin tocar:

```ts
async function browserToWebp(file: File): Promise<File> {
  if (file.type === 'image/svg+xml' || file.type === 'image/webp') return file
  // dibuja en <canvas> y exporta con canvas.toBlob(..., 'image/webp', 0.82)
}
export async function uploadWebp(file, apiUrl, onSize?) {
  const webpFile = await browserToWebp(file)
  onSize?.(file.size, webpFile.size)
  const fd = new FormData(); fd.append('file', webpFile)
  const r = await fetch(apiUrl, { method: 'POST', body: fd })
  return (await r.json()).url ?? null
}
```

### 9.3 Endpoint de subida — convención de paths

`app/api/{menu,tv,recipes,settings}/upload/route.ts`. Verifica sesión admin, sube al bucket **`uploads`** de Supabase Storage con path `<dominio>/<uuid><ext>` y devuelve URL pública:

```ts
const storagePath = `menu/${randomUUID()}${ext}`
await supabase.storage.from('uploads').upload(storagePath, data, { contentType, upsert: true })
const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${storagePath}`
```

---

## 10. Componentes clave

| Componente | Rol |
|---|---|
| `AIChat.tsx` | Widget flotante de IA, multi-rol, voz, recomendaciones. |
| `AdminNav.tsx` | Sidebar admin: links drag-reorderables (localStorage `admin_nav_order`), oculta features OFF, modal "Reportar problema" (→ `/api/tickets`), logout. |
| `CustomerNav.tsx` | Nav inferior del cliente; config desde `settings.customer_nav` (JSON) vía `normalizeNavConfig`; oculta tabs según `usr_*`. |
| `RightRail.tsx` | Rail derecho fijo de RESTA3; expone `useRightRail()` (contexto + `createPortal`) para que las páginas llenen el panel. |
| `FeatureGuard.tsx` | Redirección client-side por feature/permiso. |
| `BrandProvider.tsx` | Provee nombre/logo/acento/features (leídos en SSR en `admin/layout.tsx`). |
| `Resta3Nav.tsx`, `EmployeeNav.tsx` | Navegación de RESTA3 y empleado. |
| `QRScanner.tsx` | Escaneo de QR (html5-qrcode) para sellar lealtad. |
| `floor-plan/` (Konva) | Plano de mesas interactivo. |

### 10.1 `AdminNav` — reordenamiento por arrastre

Usa eventos `onPointerDown/Move/Up` con un umbral (`DRAG_THRESHOLD = 8`). `normalizeOrder()` fusiona el orden guardado con los IDs actuales. Los links se ocultan si `isEnabled(features, feature) === false`. El color de acento viene de `useBrand()`; `contrastText()` elige texto blanco/negro según luminancia.

### 10.2 `CustomerNav` — config dinámica

`NavConfig` (bg, border, accent, inactive, radius, tabs, showLogout) se persiste en `settings.customer_nav`. `normalizeNavConfig()` migra la config antigua (`labels`) a la nueva (`tabs`). Tabs de fábrica: `menu`, `review`, `card`. `logout()` limpia `loyalty_*` de localStorage y va a `/loyalty`.

---

## 11. Sync con `mi-restauranteportales`

`.github/workflows/sync-portales.yml` corre en cada push a `main`:

1. Hace checkout de ambos repos (`mi-proyecto` y `mi-restauranteportales` con `PORTALES_PAT`, rama `master`).
2. `rsync` de `app/` **excluyendo** archivos con branding/colores propios:
   - `api/auth/route.ts`, `admin/layout.tsx`, `admin/login/page.tsx`, `admin/configuracion/page.tsx`, `admin/menu/page.tsx`, `admin/recipes/page.tsx`, `globals.css`, `menu/page.tsx`, `page.tsx`, `loyalty/page.tsx`, `registro/page.tsx`, `resena/page.tsx`, `recetas/page.tsx`, `resetas/page.tsx`, `review/page.tsx`, `salon/page.tsx`, `card/`, `components/CustomerNav.tsx`, `components/AdminNav.tsx`, `components/EmployeeNav.tsx`, `employee/login/page.tsx`, `employee/recipes/page.tsx`, `resta3/login/page.tsx`.
3. `rsync` de `lib/` **excepto `supabase.ts`** (portales tiene su propia BD/cliente).
4. Copia `public/`, `package.json`, `tsconfig.json`, `middleware.ts`. **No** copia `next.config.ts` (portales usa `ignoreBuildErrors`).
5. Commit + push solo si hay cambios.

> **Cuándo agregar una exclusión:** cualquier archivo que tenga branding, colores o lógica específica del restaurante (NICHO `#B90F45` vs portales). Si lo dejas sincronizar, sobrescribirás el branding de portales.

---

## 12. Deploy

- **Plataforma:** Vercel (plan Hobby — limita duración de funciones y binarios nativos).
- **Build:** `next build`. Dev usa `--webpack`.
- Configurar todas las env vars de la sección 2.3 en Vercel → Settings → Environment Variables. Cuidado con el **BOM** al pegar desde PowerShell.
- `next.config.ts`:
  - `poweredByHeader: false`
  - `serverExternalPackages: ['sharp']`
  - `allowedDevOrigins` (localhost, IPs LAN, ngrok)
  - Headers de seguridad globales: `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Content-Security-Policy: frame-ancestors 'self'`, `Permissions-Policy`, y `Cache-Control: no-cache` para HTML dinámico.

**Dependencias clave (`package.json`):** `@supabase/supabase-js`, `next 16.2.6`, `react 19.2.4`, `konva`/`react-konva`, `lottie-react`, `html5-qrcode`, `react-qr-code`, `nodemailer`, `sharp` (declarada pero la conversión es client-side), `pg` (dev).

---

## 13. Patrones y convenciones

1. **Módulos `lib/*Db.ts` son server-only.** Nunca importarlos desde `'use client'`.
2. **Siempre filtrar por `restaurant_id`** en lecturas y agregarlo en inserts (excepto `settings` → `scopedKey`).
3. **Mappers `toX(row)`** para traducir snake_case ↔ camelCase. Updates con patch parcial (solo campos `!== undefined`).
4. **Auth:** `verifySession` en cada API protegida; nunca confiar en cookies no firmadas.
5. **Imágenes:** convertir a WebP en el cliente con `uploadWebp` antes de subir.
6. **Verificación de tipos:** `npx tsc --noEmit` antes de dar por terminado (IDE poco fiable).
7. **Strip de BOM** en cualquier nueva lectura directa de env vars sensibles.
8. **Next.js 16:** `params` y `cookies()` son `await`. Leer los docs en `node_modules/next/dist/docs/`.
9. Al **agregar una vista admin**: registrar la ruta en `AdminNav.NAV_LINKS`, en `FeatureGuard.ROUTE_FEATURE`/`ADMIN_FALLBACKS` y, si aplica, en `FEATURES`.

---

## 14. Riesgos y deuda técnica

| Riesgo | Detalle |
|---|---|
| **RLS decorativo** | El aislamiento depende del filtro en código por `restaurant_id`, no de Row Level Security real. Una query mal escrita puede cruzar tenants. |
| **`/api/orders` POST sin auth** | Necesario para el cliente público, pero permite crear pedidos sin sesión. |
| **`/api/menu/[id]/like` sin auth** | El control "un voto por platillo" vive en localStorage del cliente; es evadible. |
| **BOM de PowerShell** | Env vars pegadas desde PowerShell pueden traer `U+FEFF`. Strip manual en `supabase.ts` y `birthdayDb.ts`. |
| **`sharp` declarado pero no usado en server** | La conversión WebP es client-side. No eliminar `sharp`/`serverExternalPackages` sin confirmar; algunos paths pueden depender de él. |
| **Forma de pago/domicilio en `notes`** | No hay columnas dedicadas; la info se codifica con prefijos en texto (`[TARJETA]`, `[DOMICILIO]`, `Pago: ...`). El corte de caja depende de ese formato. |
| **Cookie `admin_name` legible por JS** | Solo para UI; no usar para decisiones de seguridad. |
| **Sesiones de 24h sin rotación** | El token HMAC no expira por sí solo más allá del `maxAge` de la cookie. |
| **Stripe pendiente** | El checkout real de Stripe no está integrado; los pedidos con `payMethod='stripe'` se registran como "pendiente de cobro". |
| **Timeouts agresivos de IA** | En Vercel Hobby, llamadas a Supabase dentro de `/api/ai/chat` tienen 2.5 s; si la BD está lenta, el contexto se degrada con fallbacks vacíos. |
| **Archivos `data/*.json` obsoletos** | No se usan en runtime; solo para seeds. No confiar en ellos como fuente de verdad. |

---

*Fin del Manual Técnico — NICHO `mi-proyecto` · 2026-06-28*
