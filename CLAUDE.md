@AGENTS.md

# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) cuando trabaja en este repositorio.

## Comandos

```bash
npm run dev      # Servidor de desarrollo (next dev --webpack)
npm run build    # Build de producción
npm run lint     # Ejecutar ESLint
npx tsc --noEmit # Verificar tipos sin emitir archivos
```

No hay suite de pruebas configurada. Siempre ejecutar `npx tsc --noEmit` para verificar — los diagnósticos del IDE son frecuentemente obsoletos e incorrectos.

## Qué hace esta app

Plataforma SaaS multi-restaurante. Este repositorio sirve a **NICHO** (`NEXT_PUBLIC_RESTAURANT_ID` ausente → `'default'`). Comparte Supabase con `mi-restauranteportales` (restaurant_id=`'portales'`); el aislamiento es por `restaurant_id` en cada tabla. Tres audiencias:

- **Clientes** (público): menú digital (`/menu`), reseñas (`/review`, `/resena`), recetario (`/recetas`, `/resetas`), estilos de tarjeta de lealtad (`/card`, `/card/premium`, `/card/2x1`, `/card/descuento`, `/card/wallet`, `/card/usuario`), registro (`/registro`, `/loyalty`), activación (`/activate`). Señalización TV en `/tv`.
- **Empleados** (`/employee/*`): sellar tarjetas de lealtad, gestionar pedidos, menú, recetas, clientes. Login en `/employee/login`.
- **RESTA3** (`/resta3/*`): panel secundario del personal con marca propia (logo/acento/nombre guardados como `resta3_logo`, `resta3_accent`, `resta3_name` en la tabla `settings`). Login en `/resta3/login`. Rutas: dashboard, TPV/Caja (`/resta3/tpv`), Mesas (`/resta3/mesas`), Cocina (`/resta3/cocina`), Domicilios (`/resta3/domicilios`), Inventario (`/resta3/inventario`), Compras (`/resta3/compras`), Empleados (`/resta3/empleados`), Menú, Reportes (`/resta3/reportes`), Corte de Caja (`/resta3/corte`), Pantalla TV. Login acepta tab `login` y tab `register` (nombre completo de 2+ palabras, contraseña mín. 12 chars con letras+números). Usuario recordado en localStorage `r3_remembered_name`.
- **Admins** (`/admin/*`): dashboard completo — analíticas, CRM, ventas, menú, recetas, TV, reservaciones y plano de mesas, lealtad/sellado, reseñas, automatización, contenido, producción, reportes, configuración (`/admin/configuracion`), editor de navegación del cliente (`/admin/navegador`). Login en `/admin/login`.

`app/page.tsx` redirige `/` → `/menu`.

## Arquitectura

**Stack:** Next.js 16 (App Router, webpack) · React 19 · Tailwind CSS 4 · TypeScript · Supabase · Konva/react-konva (canvas) · lottie-react

> ⚠️ Esta es Next.js 16 con cambios que rompen compatibilidad con versiones anteriores. Ver `AGENTS.md` — leer `node_modules/next/dist/docs/` antes de escribir código del framework.

### Multi-tenancy — aislamiento por restaurante

Todos los proyectos comparten el mismo Supabase. Cada tabla tiene columna `restaurant_id TEXT DEFAULT 'default'`. Todos los módulos `lib/*Db.ts` declaran:

```ts
const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'
```

y filtran **todas** las lecturas con `.eq('restaurant_id', RID)` e incluyen `restaurant_id: RID` en todos los inserts. Este proyecto usa `'default'` (NICHO).

**Excepción — `settingsDb.ts`:** la tabla `settings` no tiene `restaurant_id`; usa prefijo de clave:
```ts
function scopedKey(key: string) {
  return RID === 'default' ? key : `${RID}:${key}`
}
```
Para NICHO las claves se guardan sin prefijo. Para portales se guardan como `portales:restaurant_name`, etc.

**Excepción — `getFeatureFlags()` en `lib/features.ts`:** consulta directamente Supabase (no via `getSetting`) buscando `feature_flags_${rid}` primero, luego `feature_flags`. El super-admin escribe en estas claves para habilitar/deshabilitar módulos por restaurante.

**Regla:** al agregar una tabla nueva, añadir siempre `restaurant_id TEXT DEFAULT 'default'` y filtrar en el módulo `lib/*Db.ts` correspondiente.

### Capa de datos — Supabase

Toda la persistencia pasa por Supabase (`lib/supabase.ts`, cliente de clave anon único con strip de BOM). Cada dominio tiene su propio módulo `lib/*Db.ts` que posee una tabla y expone funciones async que devuelven tipos camelCase mediante un mapper `toX(row)` (columnas de BD en snake_case):

| Módulo | Tabla | Notas |
|---|---|---|
| `lib/db.ts` | `customers` | Clientes de lealtad + cuentas de cliente (hash SHA-256). Máquina de estados de activación. |
| `lib/loyaltyDb.ts` | `loyalty_cards` | Flag `active`, `expires_at` rotativo de 90 días. `findOrCreate` por nombre + teléfono normalizado. |
| `lib/menuDb.ts` | `menu_items` | CRUD, contador `likes`, flag `available`. |
| `lib/ordersDb.ts` | `orders` | `status`: pending → preparing → ready → delivered. |
| `lib/recipeDb.ts` | `recipes` | Cargado desde `data/recipes.json` vía `POST /api/recipes/seed`. |
| `lib/reviewDb.ts` | `reviews` | `bad = rating <= 3`, `published = rating >= 4`. Reseñas malas disparan email. |
| `lib/tvDb.ts` | `tv_slides` | `slide_order`, `active`, `is_offer`. |
| `lib/settingsDb.ts` | `settings` | Clave-valor con prefijo por restaurante: `getSetting(key, fallback)` / `setSetting(key, value)`. |
| `lib/adminDb.ts` | `admins` | SHA-256(`ADMIN_SECRET:name:password`). Filtrado por `restaurant_id`. |
| `lib/employeeDb.ts` | `employees` | SHA-256(`emp:ADMIN_SECRET:name:password`). Filtrado por `restaurant_id`. |
| `lib/tablesDb.ts` | `tables` | Mesas del restaurante: `status` = `libre \| ocupada \| reservada \| limpieza`. |
| `lib/inventoryDb.ts` | `inventory` | `stock`, `minStock` (umbral de alerta), `unit`, `cost`. |
| `lib/birthdayDb.ts` | `birthday_registrations` | Usa fetch directo a Supabase REST (no cliente supabase-js) con `SUPABASE_SERVICE_KEY` (fallback a anon key). Strip de BOM manual. Columnas: `id`, `name`, `phone`, `birthdate`, `created_at`, `restaurant_id`. Exports: `getAllBirthdays()`, `createBirthday(name, phone, birthdate)`, `deleteBirthday(id)`. |

Estos módulos son **solo de servidor** — nunca importar desde componentes cliente. Los archivos `data/*.json` son obsoletos y no se usan en tiempo de ejecución.

**`lib/supabase.ts`:** strip de BOM (U+FEFF=65279) que PowerShell puede agregar a env vars:
```ts
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(new RegExp('^' + String.fromCharCode(65279)), '').trim()
const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(new RegExp('^' + String.fromCharCode(65279)), '').trim()
```

**Subida de imágenes:** `app/api/{menu,tv,recipes,settings}/upload/route.ts` acepta multipart, sube al bucket `uploads/` de Supabase Storage (prefijado por dominio), devuelve URL pública. Las rutas de subida son **pass-through** — almacenan lo que reciben. La conversión a WebP ocurre **en el navegador** via `lib/uploadWebp.ts` antes de subir.

### Manejo de imágenes — WebP en el cliente

`lib/uploadWebp.ts` es una utilidad `'use client'` — importar solo desde componentes cliente, nunca desde rutas del servidor:

- `browserToWebp(file)` — convierte via Canvas API a calidad 0.82 (omite SVG/WebP)
- `uploadWebp(file, apiUrl, onSize?)` — convierte y luego sube; callback `onSize(bytesOriginal, bytesWebP)` para feedback en UI
- `fmtBytes(n)` — formatea bytes como B / KB / MB

`lib/imageWebp.ts` es ahora un pass-through (sin dependencia de sharp — los binarios nativos de sharp fallan en Vercel).

### Autenticación y sesiones

- **Admin/empleado/resta3:** `lib/auth.ts` emite un token HMAC sin estado `"<id>.<hmac(id)>"` firmado con `ADMIN_SECRET`, guardado en la cookie httpOnly `admin_session`. Las rutas API protegen escrituras con `verifySession(req.cookies.get('admin_session')?.value)`. Login/logout: `POST`/`DELETE /api/auth` (admin), `/api/employee/auth`, `/api/resta3/auth`.
- **Cuentas de clientes:** nombre + contraseña (`/api/customer-auth`), hash en `lib/db.ts`.

### Marca y configuración (tabla `settings`)

La marca es basada en datos, no hardcodeada. Los layouts de admin/empleado/resta3 leen la configuración **en el servidor** y la inyectan via `BrandProvider` + un script de init `data-admin-theme` para evitar parpadeo.

**Color por defecto en código:** `--ad-accent: #B90F45` en `app/globals.css` — aplica cuando no hay `sidebar_accent` configurado en settings. Esto garantiza color consistente sin depender de BD.

Claves conocidas:

- `restaurant_name`, `profile_logo`, `sidebar_accent` — chrome del panel admin/empleado
- `restaurant_address`, `restaurant_phone` — impresos en tickets de pedido
- `admin_subtitle` — subtítulo bajo el nombre del restaurante en sidebars de admin/empleado/resta3
- `resta3_logo`, `resta3_accent`, `resta3_name` — overrides de RESTA3 (si vacíos, usa los generales)
- `employee_logo`, `employee_accent` — overrides del panel de empleados
- `menu_logo` — logo en páginas de cliente `/menu` y `/card` (fallback a `profile_logo`)
- `menu_bg_color`, `menu_btn_color`, `menu_hover_color` — colores del portal cliente (defaults: `#0d0d0d`, `#B90F45`, `#DC5E86`)
- `business_wa` — número de WhatsApp del negocio (dígitos, ej. `526641234567`) usado por `/menu` para pedidos; distinto de la constante `BUSINESS_WA` en `LoyaltyCard.tsx`
- `registro_titulo`, `registro_subtitulo` — texto de `/registro`
- `customer_nav` — JSON `NavConfig` para tabs de `CustomerNav`: `bg`, `border`, `accent`, `inactive` (colores), `radius` (0-9999), `tabs[]` (`id`, `label`, `href`, `icon` URL), `showLogout`. Editable en `/admin/navegador` via `NavegadorEditor`
- `reward_categories` — JSON para niveles de tarjeta de lealtad
- `recetario_color`, `recetario_logo` — marca del recetario
- `employee_permissions` — JSON flags por módulo de empleado: `emp_fidelizacion`, `emp_pedidos`, `emp_menu_ver`, `emp_recetario`, `emp_clientes_ver` → boolean
- `user_permissions` — JSON flags por tab de cliente: `usr_menu`, `usr_resenas`, `usr_tarjeta` → boolean
- `corte_turno_inicio` — timestamp de inicio del turno activo de RESTA3 (JSON)
- `cortes_historial` — historial de cortes de caja de RESTA3 (JSON array, últimos 100)
- `feature_flags_${restaurantId}` — JSON de flags de módulos admin por restaurante (escrito por super-admin, sin prefijo de `settingsDb`)
- `feature_flags_resta3` — JSON de flags de módulos RESTA3: `r3_tpv`, `r3_mesas`, `r3_cocina`, `r3_inventario`, `r3_compras`, `r3_empleados`, `r3_reportes`

### Asistente de IA (`app/api/ai/chat/route.ts`)

Endpoint de chat en streaming respaldado por la API de Groq. Restricciones clave:

- **Autenticación:** el rol `customer` es público. Todos los demás roles (`staff`, `cook`, `employee`, `resta3`, `admin`, `recipe`) requieren cookie de sesión válida (`admin_session`, `employee_session` o `resta3_session`). El handler parsea el header `Cookie` manualmente (no usa `NextRequest`) y verifica con `verifySession()` de `lib/auth.ts`.
- **Debe usar Lambda de Node.js** — `export const maxDuration = 60`. Nunca usar `export const runtime = 'edge'`; Vercel no inyecta `GROQ_API_KEY` en los aislados V8 del Edge Runtime (causa 401).
- Modelos: `llama-3.1-8b-instant` (rol cliente, rápido) · `llama-3.3-70b-versatile` (todos los roles de personal/admin)
- `buildSystem(role, restaurantName, menuContext?)` obtiene datos en tiempo real de Supabase por rol (timeout de 2.5 s por llamada via `Promise.race`):

| Rol | Datos obtenidos |
|---|---|
| `customer` | Usa `menuContext` enviado por el cliente — sin llamadas a Supabase |
| `cook` | Pedidos + menú + recetas completas (paso a paso) |
| `staff` | Pedidos + menú + conteos de tarjetas de lealtad |
| `employee` | Pedidos + menú + recetas completas + tarjetas de lealtad |
| `resta3` | Mesas (conteos por estado) + pedidos + alertas de inventario + menú + ventas día/semana |
| `admin` | Pedidos + menú + reseñas (rating promedio, negativas) + tarjetas + alertas inventario + ventas |
| `recipe` | Recetas completas + menú |

**Componente `AIChat`** (`app/components/AIChat.tsx`):
- Tipo `AIRole`: `'cook' | 'staff' | 'customer' | 'admin' | 'recipe' | 'resta3' | 'employee'`
- `getRoleFromPath(path)` detecta el rol por URL: `/resta3/cocina` → `cook`, `/resta3` → `resta3`, `/employee` → `employee`, `/admin` → `admin`, `/reseta|/receta` → `recipe`, sino → `customer`
- Los roles `cook` y `employee` cargan automáticamente la lista de recetas como botones de acción rápida
- El rol `customer` envía `menuContext` (ya obtenido en el cliente) para evitar dobles llamadas a Supabase
- Entrada por voz via Web Speech API. Requiere HTTPS. Si `busy`, el texto capturado va al campo de entrada en lugar de enviarse de inmediato.
- Incluido en: `app/admin/layout.tsx`, `app/employee/layout.tsx`, páginas de resta3

### Flags de funcionalidades

`lib/features.ts` exporta `FEATURES` (clave → `{ label, emoji }`). Claves del admin: `orders`, `menu`, `reviews`, `tv`, `customers`, `analytics`, `loyaltyCard`, `favorites`, `ventas`, `marketing`, `crm`, `reservaciones`, `operaciones`, `automatizaciones`, `contenido`, `produccion`, `reportes`, `configuracion`, `cumpleanos`. `getFeatureFlags()` busca `feature_flags_${rid}` en settings (directo a Supabase, sin `scopedKey`) y si no existe busca `feature_flags`. Feature no encontrada = habilitada por defecto. El super-admin (`mi-superadminrestaurante`) escribe estas claves para cada restaurante. `AdminNav` es reorganizable por arrastre (orden en localStorage `admin_nav_order`). Los flags **solo se deshabilitan desde el super-admin o la BD** — no hay UI en `/admin/configuracion`.

**Flags RESTA3** (`feature_flags_resta3`, sin prefijo de restaurante): `r3_tpv`, `r3_mesas`, `r3_cocina`, `r3_inventario`, `r3_compras`, `r3_empleados`, `r3_reportes`. Leídos por `GET /api/resta3/features`. `FeatureGuard` los aplica en rutas `/resta3/*` comprobando `r3_<segmento>`.

**Permisos de empleado/cliente** (segunda capa bajo feature flags): `employee_permissions` y `user_permissions` en settings. Leídos por `GET /api/permissions`. `FeatureGuard` redirige a `/employee` si el módulo está desactivado; `CustomerNav` oculta tabs cuyo permiso sea `false`. Escritos por el super-admin.

### Máquina de estados del cliente

```
loading → form → confirm → waiting → (enlace de activación enviado) → card
```
- `loyalty_pending_id` en localStorage = registrado, sin activar
- `loyalty_id` / `loyalty_card_id` = confirmado, activo

**Activación:** Cliente envía formulario → `POST /api/customers` → empleado envía `wa.me/...?text=.../activate?id=UUID` → cliente toca el enlace → confirmado.

### Rutas API (`app/api/`)

Ruta de colección (`GET`/`POST`) + ruta `[id]` (`GET`/`PATCH`/`DELETE`). `PATCH` despacha por campo `action`:
- `customers/[id]`: `confirm | stamp | redeem`
- `loyalty/[id]`: `stamp | redeem | activate | deactivate` (protegido con admin)
- `menu/[id]/like`: incremento público de `likes`
- `settings`: `GET ?key=` público; `POST` solo admin
- `recipes/seed`: llena desde `data/recipes.json` sin sobreescribir ingredientes/pasos existentes
- `menu/seed`: llena demo desde `lib/demo-menu.json` (salta items existentes por nombre, requiere admin)
- `ai/chat`: proxy Groq en streaming — ver sección de IA
- `admins` / `admins?id=`: `GET` lista, `POST` crea (roles posibles: `Administrador | Gerente | Supervisor | Encargado | Cajero | Auditor`), `DELETE` borra (protege auto-borrado y cuenta mínima de 1)
- `employees` / `employees?id=`: igual que admins (roles: `Mesero | Capitán | Hostess | Bartender | Barista | Cocina | Cajero | Repartidor`)
- `analytics`: `GET` — stats del dashboard: conteos de tarjetas/sellos/canjes, pedidos por estado y revenue, top 5 items, histograma 7 días, rating promedio
- `features`: `GET` flags del restaurante; `POST { settingsKey, flags }` escribe cualquier clave de flags; CORS restringido a `https://mi-superadmindrestaurante.vercel.app`
- `permissions`: `GET` devuelve `{ employee: Record<string,boolean>, user: Record<string,boolean> }` desde `employee_permissions` y `user_permissions`
- `cumpleanos` / `cumpleanos/[id]`: `GET` requiere admin; `POST` público (auto-registro de cliente); `DELETE` requiere admin
- `resta3/features`: `GET` devuelve flags RESTA3 desde `feature_flags_resta3`
- `resta3/corte`: `GET` turno activo + conteos por tipo de pago (efectivo/tarjeta/transferencia/domicilio, inferidos de tags `[TARJETA]`, `[TRANSFERENCIA]`, `[GOGO]`, `[RAPPI]`, `[UBEREATS]` en notas de pedido) + historial; `POST` cierra turno y abre nuevo
- `resta3/inventory` / `resta3/inventory/[id]`: CRUD de inventario, requiere `resta3_session`; `GET` es público

### Códigos QR y escáner

- QR del negocio (`/admin`): codifica `window.location.origin`
- QR del panel empleado (`/employee`): codifica `${origin}/card` — redirige al cliente a su tarjeta de lealtad. **No usar `/loyalty`** (ruta inexistente).
- QR del cliente: codifica el UUID — el empleado escanea para sellar
- `QRScanner` importa dinámicamente `html5-qrcode` dentro de `useEffect` (no seguro en SSR). El `div#qr-reader` debe existir antes de `Html5Qrcode.start()`; el padre lo remonta vía bump de ref `scanKey`.
- `/activate` envuelve `useSearchParams()` en `<Suspense>` (requerido por App Router).

### Módulos solo cliente (Konva + localStorage)

Carpeta raíz `components/` (distinta de `app/components/`), importada via `@/components/...`.

- **Señalización TV** — editor `/admin/tv` + vista fullscreen `/admin/tv/pantalla/[id]`. Animaciones Lottie en `public/animations/`; registrar via `app/components/animations/registry.ts`. localStorage: `pantalla_dashboard_v1`.
- **Reservaciones** — `/admin/reservaciones` con pestañas: plano de mesas (react-konva, `floor_plan_v1`), panel de servicio, perfiles (`guest_profiles_v1`), turnos (`shift_plan_v1`), timeline, consumo.

**Regla Konva/SSR:** cargar el canvas con `next/dynamic(() => import('./FloorCanvas'), { ssr: false })` desde un componente `'use client'` — nunca importar react-konva desde un Server Component.

### Componentes de infraestructura (`app/components/`)

- `AIChat.tsx` — ver sección de IA
- `AdminThemeToggle.tsx` — botón dark/light. Lee/escribe `admin_theme` en localStorage y setea `data-admin-theme` en `<html>`. Sin estado React — DOM-driven para evitar hydration mismatch. Usado en AdminNav, EmployeeNav, Resta3Nav
- `RightRail.tsx` — panel lateral derecho fijo de 420px usado solo en RESTA3. En mobile/tablet es drawer deslizable. Expone `useRightRail()` context: `mount` (nodo DOM portal), `setFilled`, `setTitle`, `open`/`setOpen`. Contenido por defecto: reloj en vivo + atajos a TPV/Cocina/Mesas. Las páginas usan `createPortal` al nodo `mount`
- `RewardIcon.tsx` — íconos SVG para categorías de recompensa de lealtad. Keys: `coffee`, `cup`, `cake`, `gift`, `star`, `crown`, `tag`, `percent`, `heart`, `bag`, `ticket`, `bolt`, `flame`. Fallback a URL/path si `isCustomIcon(name)` (empieza con `http`, `/` o `data:`). Exporta `REWARD_ICON_KEYS` e `isCustomIcon`
- `Icon.tsx` — sistema de íconos de línea (~50 nombres en tipo `IconName`) usado en admin/empleado/resta3
- `LoyaltyCard.tsx` — tiene constante `BUSINESS_WA` (WhatsApp, sin `+` ni espacios) que cambiar por despliegue

### Cabeceras de seguridad (`next.config.ts`)

- `poweredByHeader: false` — elimina `X-Powered-By`
- Todas las rutas: `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Content-Security-Policy: frame-ancestors 'self'`, `Permissions-Policy: microphone=(self) camera=(self)`
- Páginas dinámicas: `Cache-Control: no-cache`
- `X-Frame-Options` **no se usa** — reemplazado por CSP `frame-ancestors`
- `serverExternalPackages: ['sharp']` — sharp declarado como externo para evitar fallo de binarios nativos en Vercel (imageWebp.ts es pass-through)
- `allowedDevOrigins`: localhost, 127.0.0.1, 192.168.1.4, 192.168.1.8 y wildcards `*.ngrok-free.dev`, `*.ngrok-free.app`, `*.ngrok.io` para túneles locales

### Email

`lib/email.ts` usa nodemailer (Gmail). `createReview` con `rating <= 3` envía alerta. No hace nada si `GMAIL_USER`/`GMAIL_APP_PASSWORD` no están configurados.

## Variables de entorno

- `NEXT_PUBLIC_SUPABASE_URL` — **requerida**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **requerida**
- `NEXT_PUBLIC_RESTAURANT_ID` — ID del restaurante para aislamiento de datos. Ausente en este proyecto (→ `'default'` = NICHO). Portales usa `'portales'`. Afecta todos los `lib/*Db.ts` y el prefijo de settings.
- `ADMIN_SECRET` — secreto HMAC de sesión + hash de contraseña. Fallback a `'dev-secret'` (inseguro).
- `GROQ_API_KEY` — **requerida para el chat de IA**. Debe configurarse en Vercel → Settings → Environment Variables (no solo en `.env.local`).
- `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `REVIEW_EMAIL` — opcionales, alertas de reseñas negativas por email
- `SUPABASE_SERVICE_KEY` — opcional, usado por `lib/birthdayDb.ts` para operaciones con privilegios de servicio

`app/components/LoyaltyCard.tsx` tiene una constante `BUSINESS_WA` (número de WhatsApp, sin `+` ni espacios) que cambiar por despliegue.

## Seguridad

- **CORS no es suficiente:** el endpoint `POST /api/features` dependía solo de CORS. CORS no protege peticiones server-to-server (curl, fetch de servidor). Cualquier endpoint de escritura sin autenticación real está expuesto.
- **`/api/ai/chat`:** protegido con `verifySession()` para roles de personal (corregido 2026-07-06). El rol `customer` permanece público por diseño.
- **`/api/features` (portales):** protegido con header `x-admin-secret` verificado contra `ADMIN_SECRET` (corregido 2026-07-06).

## Notas de contexto — lecciones aprendidas

- **2026-07-06 — Seguridad y correcciones:** `/api/ai/chat` ahora requiere sesión para roles no-customer. QR en panel empleado corregido a `/card` (era `/loyalty`, ruta inexistente). Color hardcodeado `#f59e0b→#d97706` en 7 páginas resta3 reemplazado por `S.accent` (variable de marca dinámica). Módulos demo en `mi-pruebas` corregidos: `combo_empleado` agregó `tv`, `combo_resta3` removió `dashboard`.
- **restaurant_id='default':** todos los datos se crean con `restaurant_id='default'` cuando `NEXT_PUBLIC_RESTAURANT_ID` no está configurada. Si la app muestra datos vacíos tras configurar esa variable, hacer PATCH masivo en Supabase: `PATCH /rest/v1/menu_items?restaurant_id=eq.default` con `{"restaurant_id":"portales"}`. Aplica a: `menu_items`, `recipes`, `admins`, `employees`, `customers`, `orders`.
- **Dos Supabase para portales:** `.env.local` en `mi-restauranteportales` usa la BD principal (zxynrlqubdlrwcfoewdv) para desarrollo local. Vercel usa la BD propia de portales (qmtsetcqnovcahuimkvg). Los seeds locales NO afectan producción.
- **Vercel no auto-deploya portales:** el proyecto portales en Vercel no está conectado a GitHub. Después de cada push, hacer `vercel --prod --token $TOKEN` manualmente desde `mi-restauranteportales/`.
- **Fotos en Supabase Storage:** las imágenes subidas vía admin panel están en el bucket `uploads/` de Supabase, no en git. El sync de GitHub Actions no las afecta.
- **Sync exclusiones:** `mi-proyecto/.github/workflows/sync-portales.yml` excluye ~20 archivos con branding de portales. Si un nuevo archivo tiene colores/logos hardcodeados, agregar a la lista `--exclude`.

## Restricciones importantes

- **Agregar un campo persistido** → actualizar el mapper `toX(row)`, los payloads de inserción/actualización y la `interface` en `lib/*Db.ts`. Si es una tabla nueva, incluir `restaurant_id TEXT DEFAULT 'default'` y filtrar por `RID`.
- **Multi-tenancy:** nunca hacer `supabase.from('tabla').select('*')` sin `.eq('restaurant_id', RID)` en módulos `lib/*Db.ts`. La única excepción es `settings` que usa prefijo de clave.
- Tailwind CSS 4: `@import "tailwindcss"` en `globals.css`, sin `tailwind.config.js`. Tokens personalizados en `@theme inline {}`. Temas del admin via variables CSS `--ad-*` activadas por `data-admin-theme`. Color acento por defecto: `#B90F45`.
- `RouteContext<'/api/.../[id]'>` es un tipo de Next.js 16 disponible globalmente — sin necesidad de importar.
- `html5-qrcode` — nunca importar estáticamente; siempre `import()` dentro de `useEffect`.
- `react-konva`/`konva` — nunca importar estáticamente; usar `next/dynamic(..., { ssr: false })` desde un componente cliente.
- `lib/uploadWebp.ts` — solo `'use client'`; nunca importar desde rutas del servidor ni `lib/*Db.ts`.
- `app/api/ai/chat/route.ts` — debe permanecer como Lambda de Node.js (`maxDuration = 60`); Edge Runtime rompe la inyección de `GROQ_API_KEY`.
- El alias `@/*` apunta a la raíz del repositorio, por lo que `@/components/...` = `components/` raíz (módulos Konva), no `app/components/`.
- Solo servidor: `lib/*Db.ts`, `lib/auth.ts`, `lib/email.ts` — nunca importar desde componentes cliente.
- BOM (U+FEFF): PowerShell 5.1 agrega BOM al guardar env vars en Vercel. `lib/supabase.ts` y `lib/birthdayDb.ts` ya lo stripean con `String.fromCharCode(65279)`. Si se agregan más clientes HTTP directos, aplicar el mismo strip.
