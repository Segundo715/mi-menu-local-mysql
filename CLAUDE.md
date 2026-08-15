@AGENTS.md

# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) cuando trabaja en este repositorio.

Ver también `CONTEXT.md` para el detalle completo y verificado del esquema de datos,
rutas y autenticación — este archivo es el resumen operativo.

## Comandos

```bash
npm run dev      # Servidor de desarrollo (next dev --webpack)
npm run build    # Build de producción
npm run lint     # Ejecutar ESLint
npx tsc --noEmit # Verificar tipos sin emitir archivos
```

No hay suite de pruebas configurada. Siempre ejecutar `npx tsc --noEmit` para verificar — los diagnósticos del IDE son frecuentemente obsoletos e incorrectos.

Ver la skill `cli` (`.claude/skills/cli/SKILL.md`) para comandos de seed y cómo forjar una cookie de admin para probar rutas protegidas sin login real.

## Qué hace esta app

Sitio de **un solo restaurante**: menú digital, tarjeta de fidelización con sellos, reseñas, y un panel de administración básico. No es una plataforma multi-tenant ni tiene IA, recetario, TV, reservaciones o analíticas — ese alcance existía en un proyecto hermano del que este repo se copió y ya se eliminó del código.

- **Clientes** (público, sin login): `/menu` (menú + pedido por WhatsApp), `/review` (reseñas), `/card` + `/card/2x1` + `/card/descuento` + `/card/premium` (tarjeta de fidelización por categoría — cada una se auto-registra por nombre+teléfono, categorías definidas en `settings.reward_categories` y editables desde `/admin/tarjetas`).
- **Admin** (`/admin/*`, login real en `/admin/login`): `/admin/menu`, `/admin/orders`, `/admin/reviews`, `/admin/tarjetas` (tarjetas + categorías de recompensa), `/admin/sellar` (sellar por QR/teléfono + lista de tarjetas activas), `/admin/configuracion` (identidad del restaurante + perfiles admin).
- **Empleado / Resta3** (`/employee/menu`, `/resta3/menu`): páginas **públicas sin sesión** — sus logins se eliminaron deliberadamente. No asumir que hay protección aquí.

`app/page.tsx` redirige `/` → `/menu`. `app/admin/page.tsx` redirige `/admin` → `/admin/menu`.

## Arquitectura

**Stack:** Next.js 16 (App Router, webpack) · React 19 · Tailwind CSS 4 · TypeScript · **MongoDB Atlas** (driver oficial `mongodb`) · Supabase Storage (solo imágenes)

> ⚠️ Esta es Next.js 16 con cambios que rompen compatibilidad con versiones anteriores. Ver `AGENTS.md` — leer `node_modules/next/dist/docs/` antes de escribir código del framework. El antiguo `middleware.ts` se llama `proxy.ts` en Next 16 (exporta `proxy()`, no `middleware()`).

### Base de datos — MongoDB Atlas es la fuente de verdad

Toda la persistencia de datos pasa por MongoDB vía `lib/mongodb.ts`, que expone `getDb(): Promise<Db>` sobre un **cliente cacheado en `global`**:

```ts
const clientPromise = global.__mongoClientPromise ?? new MongoClient(uri).connect()
if (process.env.NODE_ENV !== 'production') global.__mongoClientPromise = clientPromise
```

Esto es intencional y **no se debe quitar** — mismo motivo que tenía el pool de MySQL que reemplazó (ver Notas de contexto): sin el cacheo, el hot-reload de `next dev` reabriría una conexión nueva en cada guardado de archivo.

Cada dominio tiene su módulo `lib/*Db.ts` que expone funciones async devolviendo tipos camelCase mediante un mapper `toX(doc)`. Los `_id` de todos los documentos son los mismos UUID string que ya generaba la app (`randomUUID()`) — **no se usa `ObjectId`** en ningún lado, para no tener que tocar rutas API ni frontend (que tratan `id` como string en toda la app).

| Módulo | Colección | Notas |
|---|---|---|
| `lib/menuDb.ts` | `menu_items` | CRUD, contador `likes`, flag `available` |
| `lib/ordersDb.ts` | `orders` | `status`: pending → preparing → ready → delivered. `items` es array nativo |
| `lib/loyaltyDb.ts` | `loyalty_cards` | Modelo de fidelización activo. `cardType` referencia un `id` dentro de `settings.reward_categories` (JSON en `value`), sin relación real |
| `lib/reviewDb.ts` | `reviews` | `bad = rating <= 3` (dispara email), `published = rating >= 4` — calculado en código |
| `lib/db.ts` | `customers` | Modelo de fidelización **legacy** — ya no recibe altas nuevas (el flujo de registro que lo alimentaba se eliminó); solo `/admin/sellar` gestiona clientes ya existentes |
| `lib/employeeDb.ts` | `employees` | CRUD de registros — sin login funcional, ver sección de autenticación |
| `lib/adminDb.ts` | `admins` | SHA-256(`ADMIN_SECRET:name:password`). `role='Resta3'` es un subtipo sin login propio |
| `lib/settingsDb.ts` | `settings` | Clave-valor: `_id` es la key (con prefijo por restaurante), `getSetting(key, fallback)` / `setSetting(key, value)` hacen upsert |

Estos módulos son **solo de servidor** — nunca importar desde componentes cliente.

**Esquema completo verificado** (colecciones, campos, índices recomendados): ver `mongodb_setup.md`. MongoDB es schemaless — no hace falta correr nada para "crear" las colecciones, se crean solas al insertar el primer documento.

**Colecciones que ya no tienen código** (tampoco se migraron desde MySQL): `recipes`, `tv_slides`, `tables`, `inventory`, `birthday_registrations`. No reintroducir referencias a ellas sin antes recrear el módulo correspondiente.

**Migración de datos**: `scripts/migrate-mysql-to-mongo.mjs` (`npm run migrate:mongo`) copió los datos reales desde el MySQL local que usaba este proyecto antes de la migración a MongoDB. Es idempotente (upsert por `_id`), pero es un script de un solo uso — no forma parte del flujo normal de la app.

**Subida de imágenes:** `app/api/{menu,settings}/upload/route.ts` aceptan multipart, suben al bucket `uploads/` de **Supabase Storage** y devuelven la URL pública. Supabase **no** almacena ninguna tabla de datos de este proyecto — es exclusivamente storage de imágenes (`lib/supabase.ts`).

### Autenticación — solo Admin es real

`lib/auth.ts` emite un token HMAC sin estado `"<id>.<hmac(id)>"` firmado con `ADMIN_SECRET`, guardado en la cookie httpOnly `admin_session`. `proxy.ts` (Node.js runtime, no Edge) protege todo `/admin/*` excepto `/admin/login` verificando esa cookie — no consulta la base de datos.

`/employee/menu` y `/resta3/menu` **no tienen ninguna protección**. Existen `authenticateEmployee()` (`lib/employeeDb.ts`) y `authenticateCustomer()` (`lib/db.ts`) pero **ningún endpoint las llama** — sus rutas de login (`/employee/login`, `/api/employee/auth`, `/resta3/login`, `/api/resta3/auth`) se eliminaron al reducir la app. `app/api/auth/route.ts` incluso bloquea explícitamente el login normal de un admin con `role === 'Resta3'`. Esto es un **estado conocido y decidido**, no un bug — no "arreglarlo" agregando gates sin que se pida explícitamente.

### Multi-restaurante (infraestructura presente, un solo restaurante en uso)

Todos los `lib/*Db.ts` declaran `const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'` y filtran por `restaurant_id`. `settingsDb.ts` usa prefijo de clave (`scopedKey()`) en vez de columna. En este despliegue `NEXT_PUBLIC_RESTAURANT_ID=menu-demo`. El mecanismo soporta varios restaurantes en la misma base, pero solo hay uno configurado.

### Integración externa — SuperAdmin

`app/api/features/route.ts` (CORS restringido a `https://mi-superadmindrestaurante.vercel.app`) y `pingSuperAdmin()` en `app/api/auth/route.ts` (usa `SUPERADMIN_URL` + `NICHO_REGISTER_KEY`, fire-and-forget) conectan con un panel externo real. `POST /api/features` **no tiene verificación de sesión**, solo CORS — CORS no protege peticiones server-to-server. `lib/features.ts` declara ~19 `FEATURES` heredadas del proyecto hermano (`tv`, `analytics`, `crm`, `reservaciones`, etc.); la mayoría no corresponde a ninguna página real aquí — se conservan por si el SuperAdmin externo las espera al leer el endpoint, no por uso interno.

### Rutas API (`app/api/`) — 21 rutas activas

Ver la tabla completa con auth/notas en `CONTEXT.md`. Patrón general: `PATCH` en rutas `[id]` despacha por campo `action` (ej. `loyalty/[id]`: `stamp | redeem | activate | deactivate`; `customers/[id]`: `confirm | stamp | redeem | checkin`).

### Códigos QR

- `/admin/sellar` importa dinámicamente `html5-qrcode` dentro de `useEffect` (no seguro en SSR) para escanear el QR de una tarjeta de lealtad.
- El QR de una tarjeta codifica su `id` de `/api/loyalty` — `/admin/sellar` intenta primero `/api/customers/[id]` (modelo legacy) y si falla intenta `/api/loyalty/[id]` (modelo activo), porque ambos sistemas de fidelización coexisten.

### Cabeceras de seguridad (`next.config.ts`)

- `poweredByHeader: false`
- Todas las rutas: `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Content-Security-Policy: frame-ancestors 'self'`
- `X-Frame-Options` **no se usa** — reemplazado por CSP `frame-ancestors`
- `serverExternalPackages: ['sharp']` — declarado como externo aunque `lib/imageWebp.ts` es actualmente un pass-through sin uso directo de `sharp`; se deja por si Vercel intenta bundlearlo transitivamente

### Email

`lib/email.ts` usa nodemailer (Gmail). `createReview` con `rating <= 3` envía alerta async. No hace nada si `GMAIL_USER`/`GMAIL_APP_PASSWORD` no están configurados.

## Variables de entorno

- `MONGODB_URI` — **requerida**, connection string completo de MongoDB Atlas
- `MONGODB_DB` — nombre de la base dentro del cluster, default `mi_menu`
- `ADMIN_SECRET` — secreto HMAC de sesión + hash de contraseña. Fallback a `'dev-secret'` (inseguro, solo dev)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **requeridas**, pero solo para Storage de imágenes
- `NEXT_PUBLIC_RESTAURANT_ID` — `menu-demo` en este despliegue; afecta el filtrado `restaurant_id` y el prefijo de `settings`
- `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `REVIEW_EMAIL` — opcionales, alertas de reseñas negativas
- `SUPERADMIN_URL`, `NICHO_REGISTER_KEY` — opcionales, beacon fire-and-forget al panel SuperAdmin externo en cada login de admin

## Seguridad

- **`POST /api/features` solo depende de CORS** — no hay verificación de sesión. CORS no protege peticiones server-to-server (curl, fetch de servidor). Esto es una exposición real conocida, no corregida en este repo (sí se corrigió en el proyecto hermano "portales" — no asumir que aplica aquí también sin verificar).
- **`app/api/customers/[id]/route.ts` no tiene ninguna verificación de sesión** — `GET` expone `passwordHash` del cliente, y `PATCH`/`DELETE` (confirmar/sellar/canjear/**eliminar** un cliente) tampoco piden `admin_session`. Cualquiera que conozca el `id` puede borrar un registro sin login. `app/api/customers/route.ts` (la ruta raíz, `GET` lista todos) **sí se corrigió** el 2026-08-14 con `verifySession()`.
- **`admin_session` no expira del lado del servidor.** `lib/auth.ts` firma `"<id>.<hmac(id)>"` sin timestamp — `verifySession()` solo valida la firma, nunca una fecha. El `maxAge: 86400` (24h) del cookie es solo un hint del navegador; una copia del valor del token (filtrada, loggeada, compartida) sirve para siempre. Para expiración real habría que incluir un timestamp en el payload firmado y validarlo en `verifySession()`.
- **`/employee/*` y `/resta3/*` están abiertas sin auth por decisión de producto**, no por descuido — ver sección de autenticación arriba.

## Notas de contexto — lecciones aprendidas

- **2026-08-14 — Reducción de alcance:** se eliminaron recetario, TV, reservaciones, analíticas, paneles completos de empleado/resta3 (excepto `/menu` de cada uno), y las 5 tablas de BD que ya no tenían código. Se agregó `/admin/tarjetas` y `/admin/sellar` al panel admin para no perder la gestión de fidelización al quitar los paneles de empleado/resta3.
- **Dependencias npm huérfanas retiradas:** `konva`, `react-konva` (eran del floor-plan de reservaciones), `lottie-react` (animaciones de TV), `pg` (nunca se usó cuando el proyecto era MySQL).
- **2026-08-14 — Auditoría externa (Flutter):** un colaborador construyendo un cliente Flutter contra esta API auditó los contratos reales y encontró que `/card/2x1`, `/card/descuento`, `/card/premium` habían sido borradas mientras `/admin/tarjetas` seguía dejando editar esas 3 categorías completas (`reward_categories`) — se restauraron las 3 páginas (`app/card/2x1`, `app/card/descuento`, `app/card/premium`, dependen de `app/components/CustomerNav.tsx`, también restaurado) para que el editor coincida con lo que existe. También encontró y se corrigió el hueco de `GET /api/customers` (ver Seguridad arriba); el de `customers/[id]` queda pendiente, documentado.
- **2026-08-14 — Migración de MySQL a MongoDB Atlas:** el objetivo era desplegar a Vercel, que no puede alcanzar un MySQL corriendo en `localhost`. Se evaluó contratar un MySQL en la nube (Railway/Aiven — cero cambios de código) pero se optó por MongoDB Atlas, lo que implicó reescribir los 8 `lib/*Db.ts` y el cliente de BD (`lib/mysql.ts` → `lib/mongodb.ts`). Se corrigió un leak de conexiones de MySQL en dev durante la sesión anterior (pool no sobrevivía el hot-reload) — el mismo patrón de cacheo en `global` se replicó en `lib/mongodb.ts`. Se creó `scripts/migrate-mysql-to-mongo.mjs` para copiar los datos reales una sola vez. `mysql_setup.sql` se retiró; `mongodb_setup.md` es su reemplazo.

## Restricciones importantes

- **Agregar un campo persistido** → actualizar el mapper `toX(doc)`, los payloads de inserción/actualización y la `interface` en `lib/*Db.ts`. Si es una colección nueva, incluir `restaurantId: string` (salvo que sea tipo `settings`, que usa el `_id` como key) y documentarla en `mongodb_setup.md`.
- **Nunca quitar el cacheo en `global` de `lib/mongodb.ts`** — ver sección de base de datos arriba.
- Tailwind CSS 4: `@import "tailwindcss"` en `globals.css`, sin `tailwind.config.js`. Temas del admin via variables CSS `--ad-*` activadas por `data-admin-theme`. Color acento por defecto: `#B90F45`.
- `RouteContext<'/api/.../[id]'>` es un tipo de Next.js 16 disponible globalmente — sin necesidad de importar.
- `html5-qrcode` — nunca importar estáticamente; siempre `import()` dentro de `useEffect`.
- `lib/uploadWebp.ts` — solo `'use client'`; nunca importar desde rutas del servidor ni `lib/*Db.ts`.
- Solo servidor: `lib/*Db.ts`, `lib/auth.ts`, `lib/email.ts` — nunca importar desde componentes cliente.
- No reintroducir código para las 5 tablas sin uso (`recipes`, `tv_slides`, `tables`, `inventory`, `birthday_registrations`) ni para rutas de login de empleado/resta3/cliente sin que el usuario lo pida explícitamente — fueron eliminadas a propósito.
- BOM (U+FEFF): PowerShell 5.1 agrega BOM al guardar env vars en Vercel. `lib/supabase.ts` ya lo stripea con `String.fromCharCode(65279)`. Si se agrega otro cliente HTTP que lea env vars directamente, aplicar el mismo strip.
