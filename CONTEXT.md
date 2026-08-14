# Contexto — mi-proyecto (mi-menu-local-mysql)

Este documento refleja el estado **real y verificado** del código (auditado línea por
línea el 2026-08-14). Si algo aquí no coincide con lo que ves en `app/`, `lib/` o la
base de datos, confía en el código — este archivo puede quedarse desactualizado si
no se mantiene junto con los cambios.

## ¿Qué es este proyecto?

Un sitio de un solo restaurante con: menú digital para clientes, tarjeta de
fidelización (sellos por visita), reseñas, y un panel de administración básico
(menú, pedidos, reseñas, tarjetas de lealtad, sellado por QR/teléfono,
configuración). **No** es una plataforma multi-tenant, no tiene chat de IA,
recetario, señalización TV, reservaciones, ni analíticas avanzadas — todo eso
existía en un proyecto hermano del que este repo se copió, y ya se eliminó del
código.

## Stack técnico real

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.6 — App Router, `next dev --webpack` |
| UI | React 19.2.4 + TypeScript, Tailwind CSS 4 |
| **Base de datos** | **MySQL** vía `mysql2/promise` (`lib/mysql.ts`) — todas las tablas |
| **Storage de imágenes** | **Supabase Storage únicamente** (`lib/supabase.ts`) — Supabase no guarda ninguna tabla de datos de este proyecto |
| Email | Nodemailer, solo para alertar reseñas con rating ≤ 3 |
| QR | `html5-qrcode` (leer, en `/admin/sellar`), `react-qr-code` (generar) |
| Auth | HMAC-SHA256 sin estado (`lib/auth.ts`), verificado en `proxy.ts` (Node.js runtime — en Next 16 el antiguo "middleware" se llama Proxy) |
| Deploy | Vercel |

El pool de MySQL (`lib/mysql.ts`) se cachea en `global` a propósito — sin eso, el
hot-reload de `next dev` re-ejecuta el módulo en cada guardado y crea un pool nuevo
de 10 conexiones sin cerrar el anterior, agotando `max_connections` del servidor.

## Autenticación — estado real

Solo **Admin** tiene un flujo de login funcional. Empleado, Resta3 y Cliente no.

| Rol | ¿Login real? | Detalle |
|---|---|---|
| **Admin** | ✅ Sí | `POST /api/auth` verifica contra `admins.password_hash` (`authenticateAdmin()` en `lib/adminDb.ts`), emite cookie HttpOnly `admin_session` (HMAC firmado con `ADMIN_SECRET`, `lib/auth.ts`). `proxy.ts` protege todo `/admin/*` excepto `/admin/login`. |
| Empleado | ❌ No | `authenticateEmployee()` existe en `lib/employeeDb.ts` pero **ningún endpoint la llama** — no hay `/employee/login` ni `/api/employee/auth` (se borraron). `/employee/menu` es una página **pública**, sin gate de sesión. |
| Resta3 | ❌ No | Igual que Empleado: cuentas `admins.role='Resta3'` se pueden crear desde `/admin/configuracion`, pero no existe `/resta3/login` ni `/api/resta3/auth`. `app/api/auth/route.ts` incluso **bloquea explícitamente** el login de admin normal si `role === 'Resta3'` (línea 37). `/resta3/menu` es pública, sin gate. |
| Cliente | ❌ No | `authenticateCustomer()` existe en `lib/db.ts` pero tampoco la llama nadie. `POST /api/customers` (usado antes por un flujo de registro ya borrado) ni siquiera acepta contraseña. |

**Esto es un estado conocido y decidido, no un bug pendiente.** `/employee/menu` y
`/resta3/menu` se dejaron abiertas deliberadamente al reducir la app — ver
`app/components/EmployeeNav.tsx` y `app/components/Resta3Nav.tsx`, que solo tienen un
link ("Menú") cada uno.

### Multi-restaurante (infraestructura presente, un solo restaurante desplegado)

Todos los `lib/*Db.ts` filtran por `restaurant_id` usando
`const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'`. `settingsDb.ts`
usa prefijo de clave en vez de columna (`scopedKey()`). En este despliegue
`NEXT_PUBLIC_RESTAURANT_ID=menu-demo`, así que las claves de `settings` se guardan
como `menu-demo:restaurant_name`, etc. El mecanismo soporta varios restaurantes en
la misma base, pero solo hay uno configurado y en uso.

### Integración externa: SuperAdmin

`app/api/features/route.ts` (CORS restringido a `https://mi-superadmindrestaurante.vercel.app`)
y `pingSuperAdmin()` en `app/api/auth/route.ts` (fire-and-forget, usa
`SUPERADMIN_URL` + `NICHO_REGISTER_KEY`) son la única conexión real con un panel
externo. **Nota de seguridad:** `POST /api/features` no tiene ninguna verificación
de sesión, solo depende de CORS — CORS no protege peticiones server-to-server
(curl, fetch de servidor). Cualquiera que conozca la URL puede sobrescribir los
feature flags. `lib/features.ts` declara ~19 claves de `FEATURES` (incluye
`tv`, `analytics`, `crm`, `reservaciones`, etc.) heredadas del proyecto hermano —
la mayoría no corresponden a ninguna página real de este repo; se dejaron así por
compatibilidad con lo que el SuperAdmin externo pueda esperar leer, no por uso
interno.

## Páginas reales (17)

| Ruta | Rol | Descripción |
|---|---|---|
| `/` | Cliente | Redirige a `/menu` |
| `/menu` | Cliente | Menú digital, pedidos por WhatsApp |
| `/review` | Cliente | Formulario de reseña |
| `/card` | Cliente | Tarjeta de fidelización, categoría `cafe` — auto-registro por nombre+teléfono contra `/api/loyalty` |
| `/card/2x1` | Cliente | Tarjeta de fidelización, categoría `dosxuno` |
| `/card/descuento` | Cliente | Tarjeta de fidelización, categoría `descuento` |
| `/card/premium` | Cliente | Tarjeta de fidelización, categoría `premium` |
| `/admin/login` | Admin | Login (única puerta real de sesión) |
| `/admin` | Admin | Redirige a `/admin/menu` |
| `/admin/menu` | Admin | CRUD del menú |
| `/admin/orders` | Admin | Lista de pedidos |
| `/admin/reviews` | Admin | Lista de reseñas |
| `/admin/tarjetas` | Admin | Gestión de tarjetas de lealtad + categorías de recompensa (filtro por categoría) |
| `/admin/sellar` | Admin | Sellar visitas (QR/teléfono) + lista de tarjetas activas con botón "Sellar visita" directo |
| `/admin/configuracion` | Admin | Identidad del restaurante (nombre/logo/colores) + alta/baja de perfiles Admin |
| `/employee/menu` | — (pública) | Ver/editar el menú, sin sesión |
| `/resta3/menu` | — (pública) | Ver/editar el menú, sin sesión |

## Rutas API reales (21)

| Ruta | Métodos | Auth | Notas |
|---|---|---|---|
| `/api/auth` | POST, DELETE | — | Login/registro/logout admin. `action: 'register'` crea el primer admin sin auth previa |
| `/api/admins` | GET, POST, DELETE | admin | Gestión de perfiles Admin (usada por `/admin/configuracion`) |
| `/api/employees` | GET, POST, DELETE | admin | CRUD de registros de empleado — sin uso de login real (ver arriba) |
| `/api/resta3/users` | GET, POST, DELETE | admin | Reusa la tabla `admins` filtrando `role='Resta3'` (`lib/adminDb.ts`), no hay tabla propia |
| `/api/menu` | GET, POST | POST: admin | GET público |
| `/api/menu/[id]` | PATCH, DELETE | admin | |
| `/api/menu/[id]/like` | POST | público | Incremento de likes |
| `/api/menu/upload` | POST | admin (implícito) | Sube imagen a Supabase Storage |
| `/api/menu/seed` | POST | admin | Siembra 4 platillos demo, usado por `scripts/seed.mjs` |
| `/api/orders` | GET, POST | público | GET sin auth (empleado/resta3 lo consumen sin sesión) |
| `/api/orders/[id]` | PATCH | — | Cambia `status` |
| `/api/loyalty` | GET, POST | GET: admin | POST público (auto-registro desde `/card`) |
| `/api/loyalty/[id]` | GET, PATCH, DELETE | admin (PATCH/DELETE) | `action`: `stamp` / `redeem` / `activate` / `deactivate` |
| `/api/reviews` | GET, POST | GET `?all=1`: admin | POST público, dispara email si `rating <= 3` |
| `/api/reviews/[id]` | PATCH, DELETE | admin | Sin consumidor actual en el código (ninguna página kept la usa) |
| `/api/customers` | GET, POST | GET: admin | Modelo legacy — `POST` ya no lo usa ninguna página (el flujo de registro se borró); solo `/admin/sellar` gestiona clientes ya existentes. `GET` se protegió el 2026-08-14 (antes no tenía ninguna verificación y exponía `passwordHash` de todos los clientes) |
| `/api/customers/[id]` | GET, PATCH, DELETE | **ninguna** | `action`: `confirm` / `stamp` / `redeem` / `checkin`. **Hueco de seguridad sin corregir**: `GET` expone `passwordHash` del cliente, y `PATCH`/`DELETE` (incluye eliminar el registro) no piden sesión — cualquiera sin login puede borrar un cliente si conoce su `id` |
| `/api/settings` | GET, POST | POST: admin | GET público. Key-value con prefijo por restaurante (ver arriba) |
| `/api/settings/upload` | POST | admin | Sube logos a Supabase Storage |
| `/api/features` | GET, POST, OPTIONS | **ninguna** (solo CORS) | Ver nota de seguridad arriba |
| `/api/tickets` | POST | admin/employee/resta3_session (cualquiera válida) | "Reportar problema" — requiere la tabla `sa_tickets`, que faltaba en la BD y se creó en la sesión de limpieza (ver `mysql_setup.sql`) |

## Esquema de base de datos (8 tablas activas)

Fuente exacta de columnas: `mysql_setup.sql` (verificado contra `SHOW CREATE TABLE`
en la base real, no es un documento teórico). Todas usan `restaurant_id VARCHAR(100)
DEFAULT 'default'` salvo `settings` (usa prefijo de clave).

| Tabla | Para qué | Relación / notas |
|---|---|---|
| `menu_items` | Platillos del menú | Referenciada por nombre en `orders.items` (JSON), no hay FK real |
| `orders` | Pedidos | `items` es JSON con snapshot de nombre/precio/cantidad, no FK a `menu_items` |
| `loyalty_cards` | Tarjetas de fidelización (modelo nuevo) | `card_type` referencia el `id` de una categoría dentro del JSON `settings.reward_categories` — no hay FK, es texto libre |
| `reviews` | Reseñas de clientes | `published = rating >= 4`, `bad = rating <= 3` (calculado en `lib/reviewDb.ts`, no en BD) |
| `customers` | Clientes (modelo viejo, legacy) | Sin relación a `loyalty_cards` — son dos sistemas de fidelización paralelos, `customers` ya no recibe altas nuevas |
| `employees` | Registros de empleado | `role` es texto libre (Mesero, Capitán, etc.), sin login funcional |
| `admins` | Cuentas con acceso a `/admin/login` | `role='Resta3'` es un subtipo sin login funcional propio (ver arriba) |
| `settings` | Key-value genérico | PK es `key` (con prefijo `menu-demo:` en este despliegue). Guarda `restaurant_name`, `menu_logo`, `sidebar_accent`, `reward_categories` (JSON), etc. |

Hay **5 tablas más en la base de datos real** (`recipes`, `tv_slides`, `tables`,
`inventory`, `birthday_registrations`) que **no tienen ningún código que las lea o
escriba** — sus `lib/*Db.ts` y rutas API se eliminaron. Se conservan con sus datos
existentes solo por si se quieren recuperar; no son parte del sistema activo.

## Variables de entorno reales

```
MYSQL_HOST=
MYSQL_PORT=
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_DATABASE=
ADMIN_SECRET=                   # HMAC de sesión + salt de contraseñas
NEXT_PUBLIC_SUPABASE_URL=       # Solo para Storage (imágenes)
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_RESTAURANT_ID=      # 'menu-demo' en este despliegue
GMAIL_USER=                     # Opcional — alertas de reseñas malas
GMAIL_APP_PASSWORD=
REVIEW_EMAIL=
SUPERADMIN_URL=                 # Opcional — beacon a panel externo en cada login
NICHO_REGISTER_KEY=
```

## Reglas de negocio verificadas

### Tarjeta de fidelización (`loyalty_cards`)
- `expires_at` rotativo (`lib/loyaltyDb.ts`), se renueva en cada sello/canjeo.
- Categorías de recompensa (meta de sellos, premio, colores) viven en
  `settings.reward_categories` como JSON, editables desde `/admin/tarjetas`.

### Reseñas
- `rating >= 4` → `published = true`. `rating <= 3` → `bad = true` + email async
  (no bloquea la respuesta HTTP) si `GMAIL_USER`/`GMAIL_APP_PASSWORD` están
  configurados.

### Pedidos
- Flujo de estados: `pending → preparing → ready → delivered`.
- `GET /api/orders` es público a propósito.

### Admins
- No se puede eliminar el propio perfil ni dejar la tabla en 0 admins
  (`lib/adminDb.ts` + `app/api/admins/route.ts`).
