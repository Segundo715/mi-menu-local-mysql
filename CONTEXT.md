# Contexto — mi-proyecto (Nicho Restaurant Platform)

## ¿Qué es este proyecto?

Plataforma SaaS multi-rol para restaurantes. El restaurante conectado actualmente es **Nicho Restaurant**. La misma base de código sirve a cuatro tipos de usuario, cada uno con su propia área protegida y flujo de autenticación.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2.6 — App Router |
| UI | React 19.2.4 + TypeScript |
| Estilos | Tailwind CSS 4 + custom CSS variables |
| Base de datos | Supabase (PostgreSQL) con anon key + RLS |
| Email | Nodemailer (solo para reseñas malas, rating ≤ 3) |
| QR | html5-qrcode (leer), react-qr-code (generar) |
| Animaciones | lottie-react |
| Canvas | Konva / react-konva (editor de plano de planta) |
| Auth en middleware | Web Crypto API — Edge Runtime (no Node.js) |
| Auth en API routes | Node.js `crypto` module |
| Deploy | Vercel — URL: `https://mi-proyecto-phi-ecru.vercel.app` |

---

## Usuarios y roles

| Rol | Ruta | Cookie de sesión | Descripción |
|-----|------|-----------------|-------------|
| Admin | `/admin/*` | `admin_session` | Dueño / gerente del restaurante |
| Empleado | `/employee/*` | `employee_session` | Meseros, cajeros, cocina |
| Resta3 | `/resta3/*` | `resta3_session` | Admin económico (TPV, mesas, cocina, inventario) |
| Cliente / Usuario | `/card/*`, `/menu`, `/loyalty`, etc. | Sin cookie — stateless | Clientes del restaurante |

---

## Autenticación

### Token de sesión (Admin y Empleado)
- Formato: `<id>.<hmac_sha256(id, secret)>`
- La firma se verifica en Edge Runtime (middleware) usando Web Crypto API
- La misma lógica se reimplementa en Node.js (`lib/auth.ts`) para las API routes

### Hash de contraseñas
| Tipo | Salt compuesto |
|------|---------------|
| Admin | `${secret}:${name.toLowerCase()}:${password}` |
| Empleado | `emp:${secret}:${name.toLowerCase()}:${password}` |
| Cliente (no se usa, stateless) | `customer:${secret}:${phone}:${pin}` |

### Cookie `admin_name`
Es la única cookie que **no** es HttpOnly. Se usa para mostrar el nombre del admin en la UI sin hacer un fetch adicional.

### Autenticación de cliente
Completamente **stateless**: no hay cookies. El cliente guarda su token en `localStorage`. El endpoint `/api/customer-auth` devuelve un token en el body.

---

## Estructura de archivos

```
mi-proyecto/
├── app/
│   ├── layout.tsx                  # Root layout — BrandProvider (nombre, logo, accent, flags)
│   ├── page.tsx                    # Redirect a /menu (o página principal)
│   ├── components/
│   │   ├── BrandProvider.tsx       # Context: nombre, logo, accentColor, featureFlags
│   │   ├── FeatureGuard.tsx        # Redirección si un módulo está deshabilitado
│   │   ├── AdminNav.tsx            # Sidebar del admin
│   │   ├── EmployeeNav.tsx         # Nav del empleado
│   │   ├── CustomerNav.tsx         # Nav del cliente
│   │   ├── Resta3Nav.tsx           # Nav de Resta3
│   │   ├── QRScanner.tsx           # Lector de QR (html5-qrcode)
│   │   ├── LottiePlayer.tsx        # Reproductor de animaciones Lottie
│   │   ├── AnimationEditorModal.tsx # Editor de animaciones para slides de TV
│   │   ├── AdminThemeToggle.tsx    # Toggle claro/oscuro para el admin
│   │   └── animations/            # Animaciones codificadas (destacado, promo, sample)
│   │
│   ├── admin/                      # Panel del administrador (protegido por middleware)
│   │   ├── layout.tsx              # Carga settings, flags y datos del admin desde Supabase
│   │   ├── page.tsx                # Dashboard principal
│   │   ├── login/page.tsx          # Login del admin
│   │   ├── analytics/page.tsx      # Analytics avanzado
│   │   ├── automatizaciones/page.tsx
│   │   ├── configuracion/page.tsx  # Usuarios, sucursales, integraciones
│   │   ├── contenido/page.tsx      # Multimedia y fotos del restaurante
│   │   ├── crm/page.tsx            # Historial de clientes, segmentos
│   │   ├── customers/page.tsx      # Perfiles y visitas de clientes
│   │   ├── estadisticas/page.tsx
│   │   ├── marketing/page.tsx      # Campañas Meta Ads, TikTok, Google
│   │   ├── menu/page.tsx           # Gestión del menú (crear, editar, toggle disponibilidad)
│   │   ├── operaciones/page.tsx    # Mesas y pedidos en tiempo real
│   │   ├── orders/page.tsx         # Lista de pedidos activos
│   │   ├── produccion/page.tsx     # Inventario y stock
│   │   ├── recipes/page.tsx        # Recetario — recetas, costos
│   │   ├── reportes/page.tsx       # Export PDF/Excel/CSV
│   │   ├── reservaciones/page.tsx  # Reservas de mesas
│   │   ├── reviews/page.tsx        # Reseñas buenas y malas
│   │   ├── sellar/page.tsx         # Sellar visita del cliente (QR o teléfono)
│   │   ├── tarjetas/page.tsx       # Tarjetas de fidelización
│   │   ├── tv/page.tsx             # Gestión de slides para pantalla digital
│   │   ├── tv/pantalla/[id]/page.tsx # Vista de pantalla TV (pública, sin auth)
│   │   ├── ventas/page.tsx         # Transacciones y cierres de caja
│   │   └── navegador/page.tsx
│   │
│   ├── employee/                   # Panel del empleado (protegido por middleware)
│   │   ├── layout.tsx              # Server component — carga datos, FeatureGuard
│   │   ├── page.tsx                # Dashboard del empleado
│   │   ├── login/page.tsx
│   │   ├── customers/page.tsx      # Ver/buscar clientes
│   │   ├── menu/page.tsx           # Consultar menú
│   │   ├── orders/page.tsx         # Gestionar pedidos activos
│   │   ├── recipes/page.tsx        # Ver recetas
│   │   └── tv/page.tsx             # Controlar pantalla TV
│   │
│   ├── resta3/                     # Módulo Resta3 — admin económico
│   │   ├── login/page.tsx
│   │   └── (panel)/
│   │       ├── layout.tsx          # Carga flags de Resta3
│   │       ├── page.tsx            # Dashboard Resta3
│   │       ├── tpv/page.tsx        # Terminal punto de venta
│   │       ├── mesas/page.tsx      # Gestión de mesas y salón
│   │       ├── cocina/page.tsx     # Pantalla de cocina (KDS)
│   │       ├── inventario/page.tsx # Stock, productos, insumos
│   │       ├── compras/page.tsx    # Órdenes de compra a proveedores
│   │       ├── empleados/page.tsx  # Gestión de empleados y turnos
│   │       └── reportes/page.tsx   # Reportes de ventas
│   │
│   ├── api/                        # API Routes (Next.js App Router)
│   │   ├── auth/route.ts           # POST login/register admin (action field)
│   │   ├── admins/route.ts         # GET/POST/DELETE admins (no auto-eliminar)
│   │   ├── analytics/route.ts      # GET estadísticas y histogramas de 7 días
│   │   ├── customer-auth/route.ts  # POST login/register cliente (stateless)
│   │   ├── customers/route.ts      # GET/POST clientes
│   │   ├── customers/[id]/route.ts # PATCH multi-acción: confirm/stamp/redeem/checkin
│   │   ├── employee/auth/route.ts  # POST login empleado → employee_session cookie
│   │   ├── features/route.ts       # GET feature flags (solo acepta origen del superadmin)
│   │   ├── loyalty/route.ts        # GET (admin) / POST (público) tarjetas de fidelización
│   │   ├── loyalty/[id]/route.ts   # GET/PATCH/DELETE tarjeta individual
│   │   ├── menu/route.ts           # GET público / POST admin
│   │   ├── menu/[id]/route.ts      # PATCH/DELETE ítem del menú
│   │   ├── menu/[id]/like/route.ts # POST sin auth — cualquiera puede dar like
│   │   ├── menu/upload/route.ts    # POST subir imagen de plato
│   │   ├── orders/route.ts         # GET sin auth / POST
│   │   ├── orders/[id]/route.ts    # PATCH solo status (KDS sin auth)
│   │   ├── permissions/route.ts    # GET permisos de empleado/usuario
│   │   ├── recipes/route.ts        # GET/POST recetas
│   │   ├── recipes/[id]/route.ts   # PATCH/DELETE receta
│   │   ├── recipes/seed/route.ts   # POST sembrar recetas de prueba
│   │   ├── recipes/upload/route.ts # POST subir imagen de receta
│   │   ├── resta3/auth/route.ts    # POST login Resta3 → resta3_session cookie (24h)
│   │   ├── resta3/features/route.ts # GET flags de Resta3 (r3_ prefix)
│   │   ├── resta3/inventory/route.ts # GET/POST inventario
│   │   ├── resta3/inventory/[id]/route.ts # PATCH stockDelta (relativo) / DELETE
│   │   ├── resta3/tables/route.ts  # GET sin auth / POST con resta3_session
│   │   ├── resta3/tables/[id]/route.ts # PATCH/DELETE mesa
│   │   ├── reviews/route.ts        # GET dual (?all=1 admin) / POST público + email async
│   │   ├── reviews/[id]/route.ts   # PATCH/DELETE reseña
│   │   ├── settings/route.ts       # GET público / POST admin-only
│   │   ├── settings/upload/route.ts # POST subir logo del restaurante
│   │   ├── tv/route.ts             # GET (activas para TV, todas para admin) / POST slide
│   │   ├── tv/[id]/route.ts        # PATCH/DELETE slide
│   │   └── tv/upload/route.ts      # POST subir imagen de slide
│   │
│   ├── card/                       # Vistas de tarjeta de fidelización del cliente
│   │   ├── page.tsx                # Tarjeta principal
│   │   ├── 2x1/page.tsx            # Promo 2x1
│   │   ├── descuento/page.tsx      # Descuento disponible
│   │   ├── premium/page.tsx        # Tarjeta premium
│   │   ├── usuario/page.tsx        # Vista de perfil del usuario
│   │   └── wallet/page.tsx         # Wallet / saldo
│   │
│   ├── menu/page.tsx               # Menú público del restaurante
│   ├── loyalty/page.tsx            # Registro en programa de fidelización
│   ├── registro/page.tsx           # Registro de cliente nuevo
│   ├── review/page.tsx             # Formulario de reseña (cliente)
│   ├── resena/page.tsx             # Vista de reseñas del restaurante
│   ├── salon/page.tsx              # Plano del salón (mesas en tiempo real)
│   ├── tv/page.tsx                 # Pantalla TV pública (slides activos)
│   ├── activate/page.tsx           # Activación de cuenta
│   ├── bloqueado/page.tsx          # Página de acceso bloqueado
│   ├── recetas/page.tsx            # Recetario público
│   └── resetas/page.tsx
│
├── lib/                            # Capa de acceso a datos (todos usan Supabase)
│   ├── supabase.ts                 # Cliente singleton con anon key + RLS
│   ├── auth.ts                     # verifySession (Node.js crypto, para API routes)
│   ├── features.ts                 # Catálogo FEATURES, fallback por restaurante, default true
│   ├── adminDb.ts                  # CRUD admins — salt compuesto, ilike, no duplicados
│   ├── employeeDb.ts               # CRUD empleados — prefijo "emp:" en hash
│   ├── db.ts                       # CRUD clientes — prefijo "customer:", addStamp (max 5)
│   ├── loyaltyDb.ts                # Tarjetas de fidelización, 90 días expiración
│   ├── menuDb.ts                   # CRUD menú — patch dinámico sin sobrescribir campos
│   ├── ordersDb.ts                 # CRUD pedidos — flujo: pending→preparing→ready→delivered
│   ├── recipeDb.ts                 # CRUD recetas — ingredients/steps como JSON arrays
│   ├── reviewDb.ts                 # Auto-publish (≥4 estrellas), auto-bad (≤3 → email)
│   ├── tablesDb.ts                 # CRUD mesas — siempre actualiza updated_at
│   ├── inventoryDb.ts              # CRUD inventario — campo minStock para alertas
│   ├── tvDb.ts                     # CRUD slides — slide_order auto-asignado, getActive/getAll
│   ├── settingsDb.ts               # Key-value genérico — upsert por clave
│   └── email.ts                    # Nodemailer, solo para reseñas malas, fire-and-forget
│
├── components/                     # Componentes de UI complejos (no-page)
│   ├── floor-plan/                 # Editor visual de plano de planta (Konva)
│   ├── guests/GuestProfiles.tsx
│   ├── service/                    # Panel de servicio a mesas
│   ├── shifts/ShiftPlanner.tsx     # Planificador de turnos
│   ├── spend/SpendAlerts.tsx       # Alertas de gasto
│   └── timeline/TimelineView.tsx
│
├── middleware.ts                   # Edge Runtime — protege /admin/* y /employee/*
├── supabase_setup.sql              # Script SQL para crear las tablas en Supabase
└── next.config.ts                  # Config de Next.js
```

---

## Tablas en Supabase

| Tabla | Descripción |
|-------|-------------|
| `admins` | Usuarios administradores del restaurante |
| `employees` | Empleados del restaurante |
| `customers` | Clientes registrados |
| `loyalty_cards` | Tarjetas de fidelización (max 5 sellos, 90 días expiración) |
| `menu_items` | Platillos del menú |
| `orders` | Pedidos en tiempo real |
| `recipes` | Recetas con ingredients/steps como JSON |
| `reviews` | Reseñas — auto-publish si rating ≥ 4, bad=true si ≤ 3 |
| `tables` | Mesas del salón (Resta3) |
| `inventory` | Inventario con campo minStock |
| `tv_slides` | Slides de pantalla digital |
| `settings` | Key-value genérico (logos, colores, feature_flags, permissions) |

### Claves importantes en `settings`
| key | Contenido |
|-----|-----------|
| `feature_flags` | Flags de módulos Nicho (admin principal) |
| `feature_flags_resta3` | Flags de módulos Resta3 (r3_ prefix) |
| `employee_permissions` | Permisos de módulos por empleado |
| `user_permissions` | Permisos de módulos por cliente |

---

## Feature Flags

Gestionados desde el **Super Admin** (mi-superadmindrestaurante) y leídos aquí.

- `lib/features.ts` exporta el catálogo `FEATURES` y una función `getFlag(id, restaurantFlags)` que retorna `true` por defecto si el flag no existe en Supabase.
- El componente `FeatureGuard` en `app/components/FeatureGuard.tsx` redirige si el módulo está deshabilitado.
- El contexto `BrandProvider` inyecta los flags a todos los client components desde el layout del servidor.

### Prefijos de flags
- Sin prefijo (`ventas`, `crm`, etc.) → módulos del admin principal (Nicho)
- `r3_` (`r3_tpv`, `r3_mesas`, etc.) → módulos de Resta3

---

## Variables de entorno necesarias

```
NEXT_PUBLIC_SUPABASE_URL=       # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Clave anónima (pública, RLS protege los datos)
ADMIN_SECRET=                   # Secret para HMAC-SHA256 de tokens de sesión
EMAIL_FROM=                     # Dirección remitente para reseñas malas
EMAIL_PASS=                     # Contraseña SMTP del remitente
EMAIL_TO=                       # Dirección donde llegan alertas de reseñas malas
```

---

## Reglas de negocio importantes

### Tarjeta de fidelización
- Máximo **5 sellos** por tarjeta (6° sello = canjeo automático)
- Expiración **90 días** desde la última actividad
- Se renueva la expiración en cada sello o canjeo

### Reseñas
- Rating **≥ 4** → `published = true` (visible al público automáticamente)
- Rating **≤ 3** → `bad = true` → dispara email al dueño (async, no bloquea la respuesta)

### Pedidos
- Flujo de estados: `pending` → `preparing` → `ready` → `delivered`
- `GET /api/orders` es público (empleados y KDS lo leen sin sesión)
- `PATCH /api/orders/[id]` solo cambia `status` (KDS sin auth)

### Inventario (Resta3)
- `PATCH /api/resta3/inventory/[id]` acepta `stockDelta` (cambio relativo, ej. `-2`)
- `Math.max(0, stock + delta)` previene stock negativo

### Admins
- No se puede eliminar el propio perfil
- Debe haber al menos un admin activo en todo momento

---

## Middleware (Edge Runtime)

Protege `/admin/*` y `/employee/*`. Verifica la firma HMAC del token en la cookie antes de dejar pasar la petición. Si falla, redirige al login correspondiente.

```
/admin/* (salvo /admin/login)   → verifica cookie admin_session
/employee/* (salvo /employee/login) → verifica cookie employee_session
/resta3/* → sin middleware; la verificación se hace en cada API route
```

---

## CORS en `/api/features`

Solo acepta el origen `https://mi-superadmindrestaurante.vercel.app`. Esto permite que el Super Admin lea los flags actuales sin exponer el endpoint a cualquier dominio.
