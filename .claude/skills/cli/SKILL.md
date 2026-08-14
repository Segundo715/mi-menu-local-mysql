---
name: cli
description: Todos los comandos npm de mi-proyecto (dev/build/start/lint/seed). Úsala antes de levantar el servidor, poblar datos de prueba, o probar rutas protegidas (/admin) sin credenciales reales.
---

# CLI — mi-proyecto

Referencia completa de atajos de línea de comandos de este repo.

## Desarrollo

Desde la raíz de `mi-proyecto`:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en `localhost:3000` (usa `next dev --webpack`) |
| `npm run build` | Compila para producción |
| `npm run start` | Sirve el build de producción (requiere `build` antes) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type-check sin emitir archivos — más confiable que los diagnósticos del IDE |

**Puerto ocupado:** si el 3000 ya está en uso, Next.js salta automáticamente al
3001, 3002, etc. y lo avisa en el log de arranque — no asumas que sigue en 3000,
lee la línea `- Local: http://localhost:XXXX`.

**Nunca mates procesos node a lo bruto.** `taskkill /F /IM node.exe /T` (o
`pkill node`) mata **todos** los procesos Node del sistema, incluido cualquier
`npm run dev` que el usuario ya tuviera corriendo para otra cosa. Para parar
solo el servidor que tú arrancaste, guarda su PID y mata solo ese proceso.

**Cuidado con `npm run dev` y MySQL:** `lib/mysql.ts` cachea el pool de
conexiones en `global` precisamente para sobrevivir el hot-reload de Next.js —
si por algún motivo se edita ese archivo para quitar el cacheo, cada guardado
crea 10 conexiones nuevas sin cerrar las anteriores y agota `max_connections`
de MySQL (`Too many connections`). Si eso pasa, buscar procesos `node`
huérfanos con conexiones abiertas al puerto 3306 (`netstat -ano` en Windows)
antes que asumir que el servicio MySQL está caído.

## Seeds (poblar MySQL)

Requieren `.env.local` con las variables de entorno (ver abajo) y contra un
servidor de desarrollo corriendo (pegan vía HTTP a `APP_URL`, por defecto la
URL de producción — pasar `APP_URL=http://localhost:3000` si se quiere poblar
local). Todos son **idempotentes** — no duplican datos si se corren varias
veces.

| Comando | Qué inserta |
|---|---|
| `npm run seed:menu` | 4 platillos en el menú digital |
| `npm run seed:ped` | 1 pedido activo, visible en `/admin/orders` |
| `npm run seed:res` | 1 reseña buena + 1 mala (la mala dispara alerta al admin) |
| `npm run seed:leal` | Cliente demo con 4 sellos de lealtad |
| `npm run seed:emp` | Atajo: `ped` + `leal` |
| `npm run seed:adm` | Atajo: `res` |
| `npm run seed:todo` | Todos los módulos + arranca en fase 1 |
| `npm run seed:1` | Fase cliente 1 — el teléfono del cliente solo ve tab Menú |
| `npm run seed:2` | Fase cliente 2 — Menú + Tarjeta de lealtad |
| `npm run seed:3` | Fase cliente 3 — Menú + Tarjeta + Reseñas (todo) |
| `npm run seed` (sin args) | Muestra la ayuda con este mismo resumen |

Las fases (1/2/3) controlan qué tabs ve el cliente vía la clave de settings
`customer_nav`, pensadas para ir avanzando durante una demo en vivo:
`seed:1 → seed:2 → seed:3`.

## Probar rutas protegidas sin login real

Solo `/admin/*` requiere sesión — está protegido por `proxy.ts` (el
"middleware" en Next.js 16 se renombró a Proxy), que verifica la firma HMAC de
la cookie `admin_session` contra `ADMIN_SECRET` sin consultar la base de
datos. Para probar una página de admin sin credenciales reales (headless
browser, curl, etc.) puedes forjar una cookie válida tú mismo si conoces
`ADMIN_SECRET` (en `.env.local`):

```js
const crypto = require('crypto')
const SECRET = 'valor-de-ADMIN_SECRET-en-.env.local'
const id = 'test-admin'          // no necesita existir en la tabla admins
const sig = crypto.createHmac('sha256', SECRET).update(id).digest('hex')
const cookieValue = `${id}.${sig}`   // usar como cookie admin_session
```

`/employee/menu` y `/resta3/menu` **no tienen ninguna protección** — son
páginas públicas por decisión de producto (los logins de empleado y resta3 se
eliminaron), así que no hace falta cookie para probarlas.

## Variables de entorno (`.env.local`)

```
MYSQL_HOST=
MYSQL_PORT=
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_DATABASE=
ADMIN_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_RESTAURANT_ID=
GMAIL_USER=
GMAIL_APP_PASSWORD=
REVIEW_EMAIL=
```

MySQL es la base de datos real (todas las tablas). Las dos claves de Supabase
son **solo** para subir imágenes a Supabase Storage (`app/api/menu/upload`,
`app/api/settings/upload`) — Supabase no guarda ninguna tabla de este proyecto.
`GMAIL_USER`/`GMAIL_APP_PASSWORD`/`REVIEW_EMAIL` son opcionales, solo para el
correo de alerta cuando llega una reseña con rating ≤ 3.
