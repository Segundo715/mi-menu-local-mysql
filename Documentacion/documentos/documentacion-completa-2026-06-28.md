# Documentación Técnica Completa — `mi-proyecto` (NICHO / Chubis)

> **Generada:** 2026-06-28 | **Modelo:** Claude Opus 4.8 (exploración exhaustiva del código fuente)
> **Restaurante actual:** Chubis (`NEXT_PUBLIC_RESTAURANT_ID=chubis`)
> **URL producción:** `mi-proyecto-phi-ecru.vercel.app`

---

## 0. Resumen ejecutivo

Plataforma SaaS multi-rol para restaurantes construida en Next.js 16 App Router + Supabase. Un mismo repositorio sirve a **4 tipos de usuario** con áreas independientes y protección distinta. Incluye asistente IA (GROQ/Llama), programa de fidelización, menú digital, KDS (cocina), TPV, plano de planta, TV corporativa y recetario interno.

---

## 1. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js **16.2.6** (App Router, Turbopack en dev) |
| UI | React **19.2.4** + TypeScript 5 |
| Estilos | Tailwind CSS 4 + variables CSS (`--ad-*`) |
| Base de datos | Supabase (PostgreSQL) — anon key + RLS permisiva |
| IA | **GROQ** — modelos Llama 3.1-8B y 3.3-70B, streaming SSE |
| Email | Nodemailer + Gmail — alertas de reseñas negativas |
| QR | `html5-qrcode` (leer) + `react-qr-code` (generar) |
| Animaciones | `lottie-react` |
| Canvas | `konva` + `react-konva` — editor de plano de planta |
| Auth | Web Crypto API (Edge/middleware) + Node crypto (API routes) |
| Deploy | Vercel (Hobby) |

---

## 2. Estructura de carpetas

```
mi-proyecto/
├── app/
│   ├── admin/            # Panel del administrador (protegido por middleware)
│   │   ├── layout.tsx    # Server: carga brand, flags, monta BrandProvider + AIChat
│   │   ├── page.tsx      # Dashboard / fidelización
│   │   ├── login/        # Formulario de login admin
│   │   ├── analytics/    # Métricas y gráficas
│   │   ├── estadisticas/ # Estadísticas avanzadas
│   │   ├── automatizaciones/
│   │   ├── configuracion/# Settings del restaurante
│   │   ├── contenido/    # Editor de contenido
│   │   ├── crm/          # Gestión de clientes (CRM)
│   │   ├── cumpleanos/   # Programa de cumpleaños
│   │   ├── customers/    # Lista de clientes
│   │   ├── marketing/
│   │   ├── menu/         # CRUD del menú
│   │   ├── operaciones/
│   │   ├── orders/       # Pedidos en tiempo real
│   │   ├── produccion/   # Panel de producción
│   │   ├── recipes/      # Recetario interno
│   │   ├── reportes/
│   │   ├── reservaciones/
│   │   ├── reviews/      # Moderación de reseñas
│   │   ├── sellar/       # Sellar visita por QR o teléfono
│   │   ├── tarjetas/     # Tarjetas de fidelización
│   │   ├── tv/           # Gestión de pantalla TV
│   │   │   └── pantalla/[id]/  # Vista TV fullscreen
│   │   ├── ventas/       # Historial de ventas por día
│   │   └── resta3/       # Gestión de cuentas Resta3
│   │
│   ├── employee/         # Panel de empleado (protegido por middleware)
│   │   ├── layout.tsx
│   │   ├── page.tsx      # Dashboard empleado
│   │   ├── login/
│   │   ├── customers/, menu/, orders/, recipes/, tv/
│   │
│   ├── resta3/           # Módulo Resta3 (TPV, mesas, cocina, compras…)
│   │   ├── login/
│   │   └── (panel)/
│   │       ├── layout.tsx
│   │       ├── page.tsx  # Dashboard Resta3
│   │       ├── tpv/, mesas/, cocina/, domicilios/
│   │       ├── compras/, empleados/, inventario/
│   │       ├── menu/, reportes/, corte/
│   │       └── tv/, tv/pantalla/[id]/
│   │
│   ├── api/              # API Routes (ver sección 4)
│   │
│   ├── card/             # Tarjeta fidelización del cliente (pública)
│   │   ├── page.tsx, 2x1/, descuento/, premium/, usuario/, wallet/
│   │
│   ├── components/       # Componentes React de la app
│   │   ├── BrandProvider.tsx, FeatureGuard.tsx, AIChat.tsx
│   │   ├── AdminNav.tsx, EmployeeNav.tsx, CustomerNav.tsx, Resta3Nav.tsx
│   │   ├── AdminThemeToggle.tsx, QRScanner.tsx, Icon.tsx
│   │   ├── NavegadorEditor.tsx, RightRail.tsx, RewardIcon.tsx
│   │   └── animations/ (LottiePlayer, AnimationRenderer, registry…)
│   │
│   ├── globals.css       # Tema dark/light con variables --ad-*
│   ├── layout.tsx        # Root layout: fuentes Geist, lang="es"
│   ├── page.tsx          # Landing pública
│   ├── menu/             # Menú digital público
│   ├── loyalty/          # Programa de fidelización (cliente)
│   ├── registro/         # Registro de cliente
│   ├── review/           # Formulario de reseña
│   ├── resena/           # Ver reseñas publicadas
│   ├── salon/            # Plano del salón en tiempo real
│   ├── tv/               # Pantalla TV pública
│   ├── cumpleanos/       # Registro de cumpleaños
│   ├── recetas/, resetas/ # Recetario público
│   ├── activate/         # Activación de cuenta
│   └── bloqueado/        # Página de acceso bloqueado
│
├── components/           # UI compleja reutilizable
│   ├── floor-plan/       # Editor visual de planta (Konva)
│   ├── service/          # Panel de servicio
│   ├── guests/           # Perfiles de comensales
│   ├── shifts/           # Planificador de turnos
│   ├── spend/            # Alertas de gasto
│   └── timeline/         # Vista de línea de tiempo
│
├── lib/                  # Capa de acceso a datos + utilidades
├── public/               # Assets: logo.png, animations/, uploads/, svg
├── scripts/              # Seeds y migraciones (.mjs)
├── middleware.ts         # Edge Runtime — protege /admin y /employee
├── supabase_setup.sql    # Esquema de la BD
├── next.config.ts        # Headers de seguridad, serverExternalPackages
├── .github/workflows/    # sync-portales.yml — auto-sync a mi-restauranteportales
└── Documentacion/        # Esta carpeta
```

---

## 3. Páginas y accesos

### Públicas (sin sesión)
| Ruta | Descripción |
|------|-------------|
| `/` | Landing / redirección |
| `/menu` | Menú digital con likes y pedidos |
| `/loyalty` | Consulta / registro de fidelización |
| `/registro` | Registro de cliente |
| `/review` | Formulario de reseña |
| `/resena` | Reseñas publicadas |
| `/salon` | Plano del salón con mesas en vivo |
| `/tv` | Pantalla TV corporativa |
| `/cumpleanos` | Registro de cumpleaños |
| `/recetas`, `/resetas` | Recetario público |
| `/card/*` | Tarjeta de fidelización del cliente (6 variantes) |
| `/activate` | Activación de cuenta |

### Admin (`/admin/*` — cookie `admin_session`)
El `layout.tsx` server-side carga `restaurant_name`, `profile_logo`, `sidebar_accent` y feature flags antes del primer render (sin parpadeo). Monta `BrandProvider`, `FeatureGuard` y widget `AIChat`.

### Empleado (`/employee/*` — cookie `employee_session`)
Acceso reducido: dashboard, clientes, menú, pedidos, recetas, TV.

### Resta3 (`/resta3/*` — cookie `resta3_session`)
TPV, mesas, cocina (KDS), domicilios, compras, empleados, inventario, menú, reportes, corte de caja. **No pasa por middleware**; se protege en cada API route.

---

## 4. APIs — Endpoints completos

### Autenticación

| Endpoint | Método | Auth requerida | Descripción |
|----------|--------|---------------|-------------|
| `/api/auth` | POST | — | Login/registro admin. Acción `login` rechaza role `Resta3`. Tras login hace ping fire-and-forget al SuperAdmin. |
| `/api/auth` | DELETE | `admin_session` | Logout admin |
| `/api/employee/auth` | POST / DELETE | — / `employee_session` | Login/logout empleado |
| `/api/resta3/auth` | POST / DELETE | — / `resta3_session` | Login/logout Resta3 (role=`Resta3`) |
| `/api/customer-auth` | POST | — | Registro/login cliente (stateless, sin cookie) |

### Menú

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/menu` | GET | — | Lista ítems del restaurante |
| `/api/menu` | POST | admin | Crear ítem |
| `/api/menu/[id]` | PATCH | admin | Editar ítem (patch dinámico) |
| `/api/menu/[id]` | DELETE | admin | Eliminar ítem |
| `/api/menu/[id]/like` | POST | — | Incrementar likes |
| `/api/menu/upload` | POST | admin | Subir imagen → Storage `uploads/menu/` |
| `/api/menu/seed` | POST | admin | Sembrar menú demo desde `demo-menu.json` |

### Pedidos

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/orders` | GET | — | Lista pedidos (sin auth — KDS/empleados) |
| `/api/orders` | POST | — | Crear pedido (`status: 'pending'`) |
| `/api/orders/[id]` | PATCH | — | Avanzar estado (`pending→preparing→ready→delivered`) o reclasificar (domicilio, notas) |

### Recetas

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/recipes` | GET | — | Lista recetas |
| `/api/recipes` | POST | admin | Crear receta |
| `/api/recipes/[id]` | PATCH / DELETE | admin / employee / resta3 | Editar / eliminar |
| `/api/recipes/upload` | POST | admin | Imagen → Storage `uploads/recipes/` |
| `/api/recipes/seed` | POST | admin | No-op (devuelve `created:0`) |

### Reseñas

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/reviews` | GET | — / admin(`?all=1`) | GET público ve publicadas; admin ve todas |
| `/api/reviews` | POST | — | Crear reseña. ≥4 estrellas → auto-publicada. ≤3 → `bad:true` + email async |
| `/api/reviews/[id]` | PATCH / DELETE | admin | Moderar / eliminar |

### Clientes y Fidelización

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/customers` | GET | admin | Lista todos los clientes |
| `/api/customers` | POST | — | Crear cliente (`confirmed: false`) |
| `/api/customers/[id]` | GET / PATCH / DELETE | admin | PATCH acciones: `confirm`, `stamp`, `redeem`, `checkin` |
| `/api/loyalty` | GET | admin | Lista tarjetas de fidelización |
| `/api/loyalty` | POST | — | Crear/encontrar tarjeta (vigencia configurable) |
| `/api/loyalty/[id]` | GET / PATCH / DELETE | admin | PATCH acciones: `stamp`, `redeem`, `activate`, `deactivate` |

### Cumpleaños

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/cumpleanos` | GET | admin | Lista registros de cumpleaños |
| `/api/cumpleanos` | POST | — | Registrar cumpleaños (tabla `birthday_registrations`) |
| `/api/cumpleanos/[id]` | DELETE | admin | Eliminar registro |

### TV / Pantalla digital

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/tv` | GET | — / admin | GET sin auth ve slides activos; con admin ve todas |
| `/api/tv` | POST | admin | Crear slide |
| `/api/tv/[id]` | PATCH / DELETE | admin | Editar / eliminar slide |
| `/api/tv/upload` | POST | admin | Imagen → Storage `uploads/tv/` |

### Configuración y Flags

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/settings` | GET | — | Leer setting por `?key=` |
| `/api/settings` | POST | admin | Guardar setting (upsert) |
| `/api/settings/upload` | POST | admin | Subir logo → Storage `uploads/settings/` |
| `/api/features` | GET / POST | CORS → SuperAdmin | Feature flags por restaurante |
| `/api/permissions` | GET | — | Permisos empleado/usuario (`employee_permissions`, `user_permissions`) |
| `/api/analytics` | GET | admin | KPIs: clientes, tarjetas, pedidos, ingresos, top items, histograma 7 días |

### Admin y Admins

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/admins` | GET / POST / DELETE | admin | Gestión de cuentas admin (excluye role Resta3, no permite dejar 0 admins) |
| `/api/tickets` | POST | admin / employee / resta3 | Enviar ticket/reporte al SuperAdmin (inserta en `sa_tickets`) |

### IA

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/ai/chat` | POST | `maxDuration=60`. Recibe `{messages, role, menuContext}`. Arma system prompt con datos vivos de Supabase (pedidos, menú, mesas, inventario, reseñas, recetas). Streaming SSE a GROQ. Modelos: `llama-3.1-8b-instant` (cliente) / `llama-3.3-70b-versatile` (resto). |

### Resta3

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/resta3/features` | GET | — | Flags `r3_*` (tpv, mesas, cocina, inventario, compras, empleados, reportes) |
| `/api/resta3/inventory` | GET / POST | — / resta3 | Inventario |
| `/api/resta3/inventory/[id]` | PATCH / DELETE | resta3 | Soporta `stockDelta` relativo |
| `/api/resta3/tables` | GET / POST | — / resta3/admin | Mesas |
| `/api/resta3/tables/[id]` | PATCH / DELETE | resta3 | Estados: libre/ocupada/reservada/limpieza |
| `/api/resta3/users` | GET / POST / DELETE | admin | Cuentas con role `Resta3` |
| `/api/resta3/corte` | GET / POST | resta3 | Corte de caja: agrupa por método de pago detectado en `notes` ([TARJETA], [TRANSFERENCIA], [GOGO]/[RAPPI]/[UBEREATS]=domicilio, resto=efectivo). Guarda historial en `settings.cortes_historial` |

---

## 5. Librerías (`lib/`)

Todas filtran por `RID = NEXT_PUBLIC_RESTAURANT_ID || 'default'` para multi-tenancy y mapean snake_case → camelCase.

| Archivo | Exporta | Propósito |
|---------|---------|-----------|
| `supabase.ts` | `supabase` | Cliente singleton anon key (limpia BOM de env vars) |
| `auth.ts` | `createSession`, `verifySession` | HMAC-SHA256 `<id>.<firma>` con `ADMIN_SECRET` |
| `features.ts` | `FEATURES`, `getFeatureFlags()` | Catálogo de features. Default `true`, fallback por `restaurant_id` |
| `adminDb.ts` | `createAdmin`, `authenticateAdmin`, `listAdmins`, `countAdmins`, `deleteAdmin` | Hash: `${secret}:${name}:${password}` |
| `employeeDb.ts` | CRUD empleados | Hash: `emp:${secret}:${name}:${password}` |
| `db.ts` | CRUD clientes | Hash: `customer:${name}:${password}`. `addStamp`, `redeemCoffee`, `requestCheckIn` |
| `loyaltyDb.ts` | CRUD tarjetas | Vigencia configurable (default 3 meses). Máx 5 sellos |
| `menuDb.ts` | CRUD ítems | Patch dinámico (no sobreescribe con `undefined`) |
| `ordersDb.ts` | CRUD pedidos | Estados: `pending→preparing→ready→delivered` |
| `recipeDb.ts` | CRUD recetas | `ingredients`/`steps` como `TEXT[]` |
| `reviewDb.ts` | CRUD reseñas | `bad:true` si rating≤3, `published:true` si ≥4 |
| `tablesDb.ts` | CRUD mesas | Siempre actualiza `updated_at` |
| `inventoryDb.ts` | CRUD inventario | `updateStock`, `minStock` para alertas |
| `tvDb.ts` | CRUD slides | `slide_order` auto, `getActiveSlides` |
| `settingsDb.ts` | `getSetting`, `setSetting` | Upsert. `scopedKey` (`RID:key`) si RID ≠ default |
| `birthdayDb.ts` | CRUD cumpleaños | Usa REST API Supabase directa con `SUPABASE_SERVICE_KEY` |
| `email.ts` | `sendBadReviewEmail` | Nodemailer/Gmail. Omite si no hay credenciales |
| `uploadWebp.ts` | (cliente) | Convierte a WebP con Canvas + sube a Storage |
| `imageWebp.ts` | (servidor) | Passthrough (Sharp no disponible en Vercel Hobby) |

---

## 6. Componentes principales

### `app/components/`

| Componente | Descripción |
|-----------|-------------|
| `BrandProvider.tsx` | Context `{name, logo, accent, features}`. Hook `useBrand()` |
| `FeatureGuard.tsx` | Invisible. Tras cada navegación consulta flags/permisos y redirige si el módulo está deshabilitado. Mapea rutas→flags para admin, employee (`emp_*`) y resta3 (`r3_*`) |
| `AIChat.tsx` | Widget flotante de chat IA. Detecta rol por pathname, inyecta datos vivos, soporta voz. Muestra `DishCard` cuando el AI menciona platillos. Streaming desde GROQ |
| `AdminNav.tsx` | Sidebar admin con filtro de módulos por flags/permisos |
| `EmployeeNav.tsx` | Nav empleado con filtro |
| `CustomerNav.tsx` | Nav cliente (excluido del sync a portales) |
| `Resta3Nav.tsx` | Nav Resta3 con flags `r3_*` |
| `AdminThemeToggle.tsx` | Toggle dark/light — `localStorage.admin_theme` |
| `QRScanner.tsx` | Lector QR con `html5-qrcode` |
| `NavegadorEditor.tsx` | Editor de navegación personalizada |
| `Icon.tsx`, `RewardIcon.tsx`, `RightRail.tsx` | UI auxiliar |
| `animations/` | Registry de animaciones Lottie para TV |

### `components/` (UI compleja)

| Carpeta | Contenido |
|---------|-----------|
| `floor-plan/` | Editor visual de planta con Konva (`FloorPlanEditor`, `FloorCanvas`, `FloorToolbar`, `TablePropertiesPanel`) |
| `service/` | Panel de servicio de mesa (`ServicePanel`, `ServiceView`) |
| `guests/` | Perfiles de comensales (`GuestProfiles`) |
| `shifts/` | Planificador de turnos (`ShiftPlanner`) |
| `spend/` | Alertas de gasto (`SpendAlerts`) |
| `timeline/` | Vista de línea de tiempo (`TimelineView`) |

---

## 7. Base de datos (Supabase)

> Esquema completo en `supabase_setup.sql`. RLS habilitado con policy `allow_all` (USING true) — la seguridad real está en la capa de aplicación con tokens HMAC.

| Tabla | Columnas clave |
|-------|---------------|
| `menu_items` | id, name, description, price, category, image_url, available, likes, restaurant_id, created_at |
| `orders` | id, customer_name, table_number, items(JSONB), total, status, notes, restaurant_id, created_at |
| `customers` | id, name, age, phone, password_hash, visits, confirmed, stamps(JSONB), restaurant_id |
| `loyalty_cards` | id, name, phone, visits, active, card_type, expires_at, stamps(JSONB), restaurant_id |
| `admins` | id, name, password_hash, role, restaurant_id |
| `employees` | id, name, password_hash, role, restaurant_id |
| `recipes` | id, name, description, category, ingredients(TEXT[]), steps(TEXT[]), image_url, restaurant_id |
| `reviews` | id, customer_name, rating(1–5), comment, published, bad, restaurant_id |
| `tv_slides` | id, title, subtitle, price, image_url, is_offer, slide_order, active, restaurant_id |
| `tables` | id, label, seats, status, customer, since, zone, restaurant_id, updated_at |
| `inventory` | id, name, category, stock, min_stock, unit, cost, restaurant_id |
| `birthday_registrations` | id, name, phone, birthdate, restaurant_id |
| `settings` | key(PK), value(JSON string) |
| `sa_tickets` | id, restaurant_id, restaurant_name, from_name, from_role, message, read, created_at |

### Claves `settings` usadas
| Clave | Contenido |
|-------|-----------|
| `feature_flags` | `{featureId: boolean}` — flags del restaurante |
| `feature_flags_resta3` | Flags con prefijo `r3_*` |
| `employee_permissions` | Permisos por módulo para empleados |
| `user_permissions` | Permisos por módulo para clientes |
| `restaurant_name`, `profile_logo`, `sidebar_accent` | Branding del admin panel |
| `reward_categories` | Configuración de fidelización |
| `cortes_historial` | Historial de cortes de caja Resta3 |
| `corte_turno_inicio` | Inicio del turno actual |
| `customer_nav` | Navegación personalizada del cliente |

### Storage
Bucket público `uploads/` con subcarpetas: `menu/`, `tv/`, `recipes/`, `settings/`

---

## 8. Variables de entorno

| Variable | Propósito | Exposición |
|----------|-----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase | Pública |
| `SUPABASE_SERVICE_KEY` | Service role key (bypassa RLS) — usado en birthdayDb | Solo servidor |
| `NEXT_PUBLIC_RESTAURANT_ID` | Tenant ID (`'chubis'`) | Pública |
| `ADMIN_SECRET` | Secret HMAC para firmar sesiones (default `'dev-secret'` — inseguro) | Solo servidor |
| `GROQ_API_KEY` | API key del asistente IA (GROQ) | Solo servidor |
| `GMAIL_USER` | Cuenta Gmail para envío de emails | Solo servidor |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación Gmail | Solo servidor |
| `REVIEW_EMAIL` | Destino de alertas de reseñas negativas | Solo servidor |
| `SUPERADMIN_URL` | URL del SuperAdmin para auto-registro | Solo servidor |
| `NICHO_REGISTER_KEY` | Clave compartida para auto-registro | Solo servidor |
| `CALLMEBOT_API_KEY` | WhatsApp via CallMeBot (declarada, sin uso activo detectado) | Solo servidor |

---

## 9. Feature flags

**Catálogo completo** (`lib/features.ts`):

| Flag | Módulo |
|------|--------|
| `orders` | Pedidos |
| `menu` | Menú |
| `reviews` | Reseñas |
| `tv` | Pantalla TV |
| `customers` | Clientes |
| `analytics` | Analítica |
| `loyaltyCard` | Tarjetas de fidelización |
| `favorites` | Favoritos |
| `ventas` | Historial de ventas |
| `marketing` | Marketing |
| `crm` | CRM |
| `reservaciones` | Reservaciones |
| `operaciones` | Operaciones |
| `automatizaciones` | Automatizaciones |
| `contenido` | Contenido |
| `produccion` | Producción / Recetario |
| `reportes` | Reportes |
| `configuracion` | Configuración |
| `cumpleanos` | Cumpleaños |

**Resta3** (prefijo `r3_`): `r3_tpv`, `r3_mesas`, `r3_cocina`, `r3_inventario`, `r3_compras`, `r3_empleados`, `r3_reportes`

- Default: **habilitado** si la clave no existe
- Gestionados desde `mi-superadmindrestaurante` vía `POST /api/features` (CORS restringido)
- `FeatureGuard` redirige al primer módulo disponible si se accede a uno deshabilitado

---

## 10. Flujos principales

### Login Admin
`POST /api/auth {action:'login'}` → `authenticateAdmin` (SHA-256 con salt `secret:name:pass`) → cookie `admin_session` (HMAC, HttpOnly, 24h) + `admin_name` → middleware valida cada request → layout server carga brand+flags → ping fire-and-forget al SuperAdmin.

### Pedido completo
1. Cliente abre `/menu` → `POST /api/orders {status:'pending'}`
2. Cocina/KDS lee `GET /api/orders` (sin auth) en tiempo real
3. `PATCH /api/orders/[id] {status:'preparing'}` → `'ready'` → `'delivered'`
4. Domicilio: `PATCH` con `notes: '[DOMICILIO] Dirección...'`

### Fidelización
1. Cliente se registra en `/loyalty` → `POST /api/loyalty` crea tarjeta
2. Admin/empleado va a `/admin/sellar` → escanea QR o busca por teléfono
3. `PATCH /api/customers/[id] {action:'stamp'}` — máx 5 sellos
4. Al 6° sello: `{action:'redeem'}` canjea y resetea a 0

### Asistente IA
Según la ruta se asigna un rol (`cook`, `staff`, `customer`, `admin`, `recipe`, `resta3`). El endpoint construye system prompt con datos vivos de Supabase (timeouts 2.5s por consulta) y hace streaming desde GROQ. El modelo liviano `llama-3.1-8b-instant` se usa para clientes y el `llama-3.3-70b-versatile` para admin/cocina.

### Corte de caja (Resta3)
`POST /api/resta3/corte` agrupa pedidos del turno clasificando por etiquetas en `notes`:
- `[TARJETA]` → tarjeta
- `[TRANSFERENCIA]` → transferencia
- `[GOGO]`, `[RAPPI]`, `[UBEREATS]` → domicilio
- Sin etiqueta → efectivo

Guarda el corte en `settings.cortes_historial` e inicia nuevo turno.

### Reseñas con alerta
`POST /api/reviews` → si `rating ≤ 3`: marca `bad:true` y dispara `sendBadReviewEmail` async (no bloquea la respuesta).

---

## 11. Middleware y autenticación

**`middleware.ts`** — Edge Runtime, Web Crypto API:
- Matcher: `/admin`, `/admin/:path*`, `/employee`, `/employee/:path*`
- Verifica cookie HMAC: recomputa `SHA-256(secret + id)` y compara
- Si inválida → redirect a login correspondiente
- Login routes (`/admin/login`, `/employee/login`) quedan exentas

**Hash de contraseñas** (SHA-256):
- Admin: `SHA-256("${ADMIN_SECRET}:${name}:${password}")`
- Empleado: `SHA-256("emp:${ADMIN_SECRET}:${name}:${password}")`
- Cliente: `SHA-256("customer:${name}:${password}")`

**Resta3** — NO pasa por middleware; protegido por `resta3_session` en cada API route + `FeatureGuard` client-side.

---

## 12. Integraciones externas

| Servicio | Cómo se usa |
|----------|-------------|
| **Supabase** | BD principal + Storage bucket `uploads/` |
| **GROQ AI** | Asistente IA con modelos Llama, streaming SSE via `/api/ai/chat` |
| **Gmail/Nodemailer** | Alertas de reseñas negativas (rating ≤ 3) |
| **SuperAdmin** (`mi-superadmindrestaurante`) | Recibe feature flags (CORS), auto-registro al login, inbox de tickets (`sa_tickets`) |
| **CallMeBot** | WhatsApp (API key declarada, sin uso activo detectado en código) |

---

## 13. Auto-sync con `mi-restauranteportales`

`.github/workflows/sync-portales.yml` — sincroniza cambios a `Segundo715/mi-restauranteportales` en cada push a `main`.

**Archivos excluidos del sync** (branding propio de portales):
- `api/auth/route.ts` (nombre del restaurante: "Los Portales")
- `admin/layout.tsx`, `admin/login/page.tsx`, `admin/configuracion/page.tsx`
- `admin/menu/page.tsx`, `admin/recipes/page.tsx`
- `globals.css`, `menu/page.tsx`, `page.tsx`
- `loyalty/`, `registro/`, `resena/`, `recetas/`, `resetas/`, `review/`, `salon/`
- `card/`
- `components/CustomerNav.tsx`, `components/AdminNav.tsx`, `components/EmployeeNav.tsx`
- `employee/login/page.tsx`, `employee/recipes/page.tsx`
- `resta3/login/page.tsx`
- `lib/supabase.ts` (portales usa su propia BD)

---

## 14. Configuración

**`next.config.ts`:**
- `poweredByHeader: false`
- `serverExternalPackages: ['sharp']`
- `allowedDevOrigins`: localhost, IPs LAN, ngrok
- Headers de seguridad: `X-Content-Type-Options`, `Referrer-Policy`, CSP `frame-ancestors 'self'`, `Permissions-Policy`, `Cache-Control: no-cache`

**Colores del admin panel (NICHO/Chubis):**
- Dark mode: `#B90F45` (rosa/rojo)
- Light mode: `#96082f`
- Logo: `/logo.png`

---

## 15. Observaciones y riesgos

1. **RLS es decorativa** — `allow_all` policy. La seguridad real depende 100% de tokens HMAC en la capa app
2. **`ADMIN_SECRET` tiene default `'dev-secret'`** — si no se define en producción los tokens son forjables
3. Varios `GET` son públicos por diseño: `orders`, `menu`, `recipes`, `tables`, `inventory`
4. `supabase_setup.sql` está desactualizado (no incluye `restaurant_id` multi-tenant ni `sa_tickets`)
5. `CONTEXT.md` tiene imprecisiones — esta documentación refleja el código real verificado
