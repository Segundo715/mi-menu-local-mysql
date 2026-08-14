---
name: cli
description: Todos los comandos npm de mi-proyecto (dev/build/start/lint/seed). Úsala antes de levantar el servidor, poblar datos de prueba, o probar rutas protegidas (/admin, /employee, /resta3) sin credenciales reales.
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
solo el servidor que tú arrancaste, guarda su PID (`echo $! > /tmp/dev.pid`
en bash, o filtra `ps aux` por el puerto/PID exacto) y mata solo ese proceso.

## Seeds (poblar Supabase)

Requieren `.env.local` con las variables de entorno (ver abajo). Todos son
**idempotentes** — no duplican datos si se corren varias veces.

| Comando | Qué inserta |
|---|---|
| `npm run seed:menu` | 4 platillos en el menú digital |
| `npm run seed:rec` | 2 recetas con pasos, para el panel de empleado |
| `npm run seed:ped` | 1 pedido activo en el panel de empleado |
| `npm run seed:res` | 1 reseña buena + 1 mala (la mala dispara alerta al admin) |
| `npm run seed:inv` | Inventario con 2 alertas de stock bajo |
| `npm run seed:tv` | 3 slides para la pantalla de TV del negocio |
| `npm run seed:leal` | Cliente demo con 4 sellos de lealtad |
| `npm run seed:emp` | Atajo: `rec` + `ped` + `leal` (todo lo del rol empleado) |
| `npm run seed:adm` | Atajo: `res` + `inv` + `tv` (todo lo del rol admin) |
| `npm run seed:todo` | Todos los módulos + arranca en fase 1 |
| `npm run seed:1` | Fase cliente 1 — el teléfono del cliente solo ve tab Menú |
| `npm run seed:2` | Fase cliente 2 — Menú + Tarjeta de lealtad |
| `npm run seed:3` | Fase cliente 3 — Menú + Tarjeta + Reseñas (todo) |
| `npm run seed` (sin args) | Muestra la ayuda con este mismo resumen |

Las fases (1/2/3) controlan qué tabs ve el cliente en `CustomerNav`, pensadas
para ir avanzando durante una demo en vivo: `seed:1 → seed:2 → seed:3`.

## Probar rutas protegidas sin login real

`/admin/*` y `/employee/*` están protegidos por `middleware.ts`, que solo
verifica la firma HMAC de la cookie — **no** consulta la base de datos. Para
probar una página sin credenciales reales (headless browser, curl, etc.)
puedes forjar una cookie válida tú mismo si conoces `ADMIN_SECRET`
(en `.env.local`):

```js
const crypto = require('crypto')
const SECRET = 'valor-de-ADMIN_SECRET-en-.env.local'
const id = 'test-admin'          // no necesita existir en la tabla admins/employees
const sig = crypto.createHmac('sha256', SECRET).update(id).digest('hex')
const cookieValue = `${id}.${sig}`   // usar como cookie admin_session (o employee_session)
```

Nota: `/resta3/*` **no** está cubierto por `middleware.ts` (solo `/admin` y
`/employee` están en el `matcher`) — las páginas de resta3 dependen de que
las rutas de API individuales verifiquen `resta3_session` en sus propios
handlers, así que muchos `GET` ahí son públicos a propósito (revisar el
comentario en cada `route.ts` antes de asumir que hace falta cookie).

## Variables de entorno (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_RESTAURANT_ID=
ADMIN_SECRET=
GROQ_API_KEY=
```

`GROQ_API_KEY` es para el chat de IA (Llama vía Groq): https://console.groq.com/keys.
`NEXT_PUBLIC_RESTAURANT_ID` va vacío en este repo (NICHO = `'default'`).
