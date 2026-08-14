# Documentación Completa del Proyecto
**Nombre:** Chubis / Restaurant SaaS Platform  
**Última actualización:** 2026-06-25  
**Stack:** Next.js 16 · React 19 · Supabase · TypeScript · Tailwind CSS 4 · Vercel  
**Repositorios:**  
- `mi-proyecto` (NICHO) → https://mi-proyecto-phi-ecru.vercel.app  
- `mi-restauranteportales` (Portales) → desplegado por separado en Vercel

---

## Índice

1. [¿Qué es este proyecto?](#1-qué-es-este-proyecto)
2. [Rutas y páginas por rol](#2-rutas-y-páginas-por-rol)
3. [Guía de uso por rol](#3-guía-de-uso-por-rol)
4. [API — Referencia completa](#4-api--referencia-completa)
5. [Base de datos — Esquema actual](#5-base-de-datos--esquema-actual)
6. [Claves de configuración (Settings)](#6-claves-de-configuración-settings)
7. [Variables de entorno](#7-variables-de-entorno)
8. [Comandos de desarrollo](#8-comandos-de-desarrollo)
9. [Funcionalidades recientes](#9-funcionalidades-recientes)
10. [Despliegue en Vercel](#10-despliegue-en-vercel)
11. [Multi-tenancy — NICHO y Portales](#11-multi-tenancy--nicho-y-portales)

---

## 1. ¿Qué es este proyecto?

Plataforma SaaS multi-restaurante. El mismo código corre en dos despliegues independientes de Vercel aislados por `restaurant_id` en Supabase:

- **NICHO** (`mi-proyecto`, `restaurant_id = 'default'`) — restaurante principal
- **Restaurante Portales** (`mi-restauranteportales`, `restaurant_id = 'portales'`) — segundo restaurante, mismo Supabase, datos separados

Un restaurante obtiene:

- **Menú digital** con categorías, imágenes, likes y carrito de pedidos
- **Sistema de lealtad** con tarjeta de sellos digitales
- **Panel de pedidos** en tiempo real para la cocina y meseros
- **Panel de recetas** con asistente de IA integrado
- **Reseñas de clientes** con alerta automática por email al recibir reseña negativa
- **Señalización TV** (digital signage) con slides editables
- **Reservaciones** y plano de mesas interactivo
- **CRM** básico de clientes
- **Panel RESTA3** para gestión de mesas, inventario, cocina y TPV
- **Asistente de IA** por rol (cliente, cocinero, mesero, admin)
- **Notificaciones WhatsApp** automáticas al recibir pedidos nuevos
- **Impresión de tickets** desde el panel de empleados

### Audiencias

| Audiencia | URL de entrada | Descripción |
|---|---|---|
| Clientes | `/menu` | Menú digital, carrito, tarjeta de lealtad, reseñas, recetario |
| Empleados | `/employee/login` | Sellar tarjetas, gestionar pedidos, imprimir tickets |
| RESTA3 | `/resta3/login` | Panel alternativo: mesas, inventario, cocina, TPV |
| Administradores | `/admin/login` | Panel completo: todo lo anterior + analytics, CRM, configuración |

---

## 2. Rutas y páginas por rol

### Clientes (público, sin login)

| Ruta | Descripción |
|---|---|
| `/menu` | Menú digital con categorías, búsqueda, carrito y seguimiento de pedidos |
| `/registro` | Registro en el programa de lealtad |
| `/loyalty` | Alias de registro |
| `/activate` | Activación de tarjeta de lealtad vía link de WhatsApp |
| `/card` | Tarjeta de lealtad del cliente |
| `/card/premium` | Vista premium de tarjeta |
| `/card/2x1` | Tarjeta con promoción 2x1 |
| `/card/descuento` | Tarjeta con descuento |
| `/card/wallet` | Vista wallet de tarjeta |
| `/card/usuario` | Perfil del usuario con tarjeta |
| `/review` | Dejar reseña |
| `/resena` | Alias en español de review |
| `/recetas` | Recetario digital del restaurante |
| `/resetas` | Alias alternativo del recetario |
| `/tv` | Señalización TV (fullscreen, sin controles) |
| `/salon` | Vista del salón / mesas |

### Empleados (`/employee/*`)

> Requieren cookie `employee_session` (login en `/employee/login`)

| Ruta | Descripción |
|---|---|
| `/employee/login` | Login de empleados |
| `/employee` | Dashboard principal: scanner QR + sellar tarjetas |
| `/employee/orders` | Gestión de pedidos activos con impresión de tickets |
| `/employee/menu` | Vista del menú (solo lectura) |
| `/employee/recipes` | Recetario con asistente IA para cocina |
| `/employee/customers` | Lista de clientes de lealtad |
| `/employee/tv` | Vista de señalización TV |

### RESTA3 (`/resta3/*`)

> Requieren cookie `resta3_session` (login en `/resta3/login`). Panel alternativo con branding propio.

| Ruta | Descripción |
|---|---|
| `/resta3/login` | Login de RESTA3 |
| `/resta3` | Dashboard: resumen de mesas, pedidos, inventario |
| `/resta3/mesas` | Gestión de mesas (estado: libre/ocupada/reservada/limpieza) |
| `/resta3/cocina` | Panel de cocina con asistente IA de cocinero |
| `/resta3/inventario` | Control de inventario con alertas de stock mínimo |
| `/resta3/tpv` | Terminal punto de venta |
| `/resta3/domicilios` | Gestión de pedidos a domicilio |
| `/resta3/empleados` | Lista de empleados |
| `/resta3/compras` | Registro de compras/proveedores |
| `/resta3/reportes` | Reportes de RESTA3 |

### Administradores (`/admin/*`)

> Requieren cookie `admin_session` (login en `/admin/login`).

| Ruta | Descripción |
|---|---|
| `/admin/login` | Login de administradores |
| `/admin` | Dashboard principal con métricas y QR del negocio |
| `/admin/menu` | CRUD de platillos: crear, editar, imagen, precio, disponibilidad |
| `/admin/orders` | Gestión de todos los pedidos |
| `/admin/sellar` | Sellar tarjetas de lealtad de clientes |
| `/admin/tarjetas` | Lista y gestión de tarjetas de lealtad |
| `/admin/customers` | CRM de clientes |
| `/admin/crm` | CRM avanzado |
| `/admin/reviews` | Reseñas de clientes (publicar, filtrar) |
| `/admin/recipes` | CRUD de recetas |
| `/admin/tv` | Editor de slides para señalización TV |
| `/admin/tv/pantalla/[id]` | Vista fullscreen de slide específico |
| `/admin/reservaciones` | Plano de mesas + reservaciones + turnos |
| `/admin/analytics` | Analíticas: ventas, pedidos, lealtad |
| `/admin/estadisticas` | Estadísticas detalladas |
| `/admin/ventas` | Reporte de ventas |
| `/admin/reportes` | Reportes generales |
| `/admin/marketing` | Herramientas de marketing |
| `/admin/automatizaciones` | Automatizaciones configurables |
| `/admin/contenido` | Gestión de contenido |
| `/admin/produccion` | Panel de producción de cocina |
| `/admin/operaciones` | Panel de operaciones |
| `/admin/resta3` | Vista del panel RESTA3 desde admin |
| `/admin/navegador` | Editor del menú de navegación del cliente |
| `/admin/configuracion` | Configuración completa: nombre, logo, colores, dirección, teléfono, WhatsApp, etc. |

---

## 3. Guía de uso por rol

### Como cliente

1. **Ver el menú:** Ir a `/menu`. Navegar por categorías, dar likes a platillos.
2. **Hacer un pedido:**
   - Tocar cualquier platillo → se abre el panel del carrito
   - Agregar items, indicar tipo (en restaurante → elegir mesa, para llevar)
   - Escribir nombre y enviar pedido
   - La pantalla muestra el estado en tiempo real: Recibido → Preparando → Listo → Entregado
3. **Registro de lealtad:** Ir a `/registro`, ingresar nombre y teléfono
4. **Ver tarjeta:** Ir a `/card` después de registrarse
5. **Dejar reseña:** Ir a `/review` o `/resena`

### Como empleado

1. **Login:** `/employee/login` → Nombre completo + contraseña (mín. 12 chars con letras y números)
2. **Sellar tarjeta:** En el dashboard principal, escanear QR del cliente o buscar por nombre
3. **Gestionar pedidos:**
   - Ir a `/employee/orders`
   - Ver pedidos ordenados por estado
   - Avanzar estado: **Iniciar preparación** → **Marcar como listo** → **Confirmar entrega**
   - 🖨️ Imprimir ticket del pedido en cualquier momento
4. **Ver recetas:** `/employee/recipes` — incluye asistente IA de cocina

### Como administrador

1. **Login:** `/admin/login` → Nombre completo + contraseña (mín. 12 chars con letras y números)
2. **Configuración inicial:** Ir a `/admin/configuracion`:
   - Nombre del restaurante
   - Dirección y teléfono (se imprimen en tickets)
   - Logo y colores del panel
   - Número de WhatsApp del negocio
3. **Agregar platillos:** `/admin/menu` → botón "+" → llenar nombre, descripción, precio, categoría, imagen
4. **Ver pedidos:** `/admin/orders` — igual que empleado pero con acceso completo
5. **Gestionar clientes:** `/admin/customers` o `/admin/crm`
6. **Ver analíticas:** `/admin/analytics` — ventas del día, semana, meses

### Como RESTA3

1. **Login:** `/resta3/login` → Nombre completo + contraseña
2. **Dashboard:** Resumen de mesas, pedidos activos, alertas de inventario
3. **Mesas:** `/resta3/mesas` → cambiar estado de cada mesa (libre/ocupada/reservada/limpieza)
4. **Cocina:** `/resta3/cocina` → ver pedidos + asistente IA de cocinero con recetas paso a paso
5. **Inventario:** `/resta3/inventario` → registrar productos, stock actual, stock mínimo (alerta automática)

---

## 4. API — Referencia completa

### Autenticación

| Método | Ruta | Descripción | Auth requerida |
|---|---|---|---|
| `POST` | `/api/auth` | Login/registro de admins. `action: 'login' \| 'register'` | No |
| `DELETE` | `/api/auth` | Logout de admin (borra cookie) | No |
| `POST` | `/api/employee/auth` | Login/registro de empleados | No |
| `DELETE` | `/api/employee/auth` | Logout de empleado | No |
| `POST` | `/api/resta3/auth` | Login/registro de RESTA3 | No |
| `DELETE` | `/api/resta3/auth` | Logout de RESTA3 | No |
| `POST` | `/api/customer-auth` | Login de clientes (nombre + password) | No |

### Menú

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/menu` | Lista todos los platillos disponibles | No |
| `POST` | `/api/menu` | Crear platillo | Admin |
| `GET` | `/api/menu/[id]` | Obtener platillo por ID | No |
| `PATCH` | `/api/menu/[id]` | Editar platillo (nombre, precio, disponibilidad, etc.) | Admin |
| `DELETE` | `/api/menu/[id]` | Eliminar platillo | Admin |
| `POST` | `/api/menu/[id]/like` | Incrementar likes (público) | No |
| `POST` | `/api/menu/upload` | Subir imagen de platillo (multipart) | Admin |
| `POST` | `/api/menu/seed` | Poblar menú desde datos iniciales | Admin |

### Pedidos

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/orders` | Lista todos los pedidos | No (empleados/admin) |
| `POST` | `/api/orders` | Crear pedido + enviar notificación WhatsApp al negocio | No |
| `GET` | `/api/orders/[id]` | Obtener pedido por ID | No |
| `PATCH` | `/api/orders/[id]` | Cambiar estado del pedido (`status`: pending→preparing→ready→delivered) | No |
| `DELETE` | `/api/orders/[id]` | Eliminar pedido | Admin |

> Al crear un pedido (`POST /api/orders`) se envía automáticamente un WhatsApp al número del negocio vía CallMeBot con el detalle completo del pedido.

### Recetas

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/recipes` | Lista todas las recetas | No |
| `POST` | `/api/recipes` | Crear receta | Admin |
| `GET` | `/api/recipes/[id]` | Obtener receta | No |
| `PATCH` | `/api/recipes/[id]` | Editar receta | Admin |
| `DELETE` | `/api/recipes/[id]` | Eliminar receta | Admin |
| `POST` | `/api/recipes/seed` | Poblar recetas desde `data/recipes.json` (no sobreescribe) | Admin |
| `POST` | `/api/recipes/upload` | Subir imagen de receta | Admin |

### Clientes de Lealtad

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/customers` | Lista todos los clientes | No |
| `POST` | `/api/customers` | Registrar nuevo cliente | No |
| `GET` | `/api/customers/[id]` | Obtener cliente | No |
| `PATCH` | `/api/customers/[id]` | Acciones: `confirm`, `stamp`, `redeem` | No/Admin |
| `DELETE` | `/api/customers/[id]` | Eliminar cliente | Admin |

### Tarjetas de Lealtad

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/loyalty` | Lista tarjetas | Admin |
| `POST` | `/api/loyalty` | Crear tarjeta | No |
| `GET` | `/api/loyalty/[id]` | Obtener tarjeta | No |
| `PATCH` | `/api/loyalty/[id]` | Acciones: `stamp`, `redeem`, `activate`, `deactivate` | Admin (write) |

### Reseñas

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/reviews` | Lista reseñas publicadas | No |
| `POST` | `/api/reviews` | Crear reseña (rating ≤3 → email de alerta automático) | No |
| `GET` | `/api/reviews/[id]` | Obtener reseña | No |
| `PATCH` | `/api/reviews/[id]` | Editar reseña (publicar/ocultar) | Admin |
| `DELETE` | `/api/reviews/[id]` | Eliminar reseña | Admin |

### TV / Señalización

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/tv` | Lista slides activos | No |
| `POST` | `/api/tv` | Crear slide | Admin |
| `PATCH` | `/api/tv/[id]` | Editar slide (título, imagen, orden, activo) | Admin |
| `DELETE` | `/api/tv/[id]` | Eliminar slide | Admin |
| `POST` | `/api/tv/upload` | Subir imagen de slide | Admin |

### Configuración (Settings)

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/settings?key=KEY` | Obtener valor de configuración por clave | No |
| `POST` | `/api/settings` | Guardar clave-valor de configuración | Admin |
| `POST` | `/api/settings/upload` | Subir imagen de configuración (logo, etc.) | Admin |

### Inventario

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/inventory` | Lista todo el inventario | Admin |
| `GET` | `/api/resta3/inventory` | Lista inventario (acceso RESTA3) | RESTA3 |
| `POST` | `/api/resta3/inventory` | Crear item de inventario | RESTA3 |
| `PATCH` | `/api/resta3/inventory/[id]` | Actualizar stock o datos del item | RESTA3 |
| `DELETE` | `/api/resta3/inventory/[id]` | Eliminar item | RESTA3 |

### Mesas

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/resta3/tables` | Lista todas las mesas | RESTA3 |
| `POST` | `/api/resta3/tables` | Crear mesa | RESTA3 |
| `PATCH` | `/api/resta3/tables/[id]` | Cambiar estado de mesa | RESTA3 |
| `DELETE` | `/api/resta3/tables/[id]` | Eliminar mesa | RESTA3 |

### Administradores

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/admins` | Lista admins | Admin |
| `DELETE` | `/api/admins` | Eliminar admin por nombre | Admin |

### Analíticas y Otros

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/analytics` | Datos de analíticas (ventas, pedidos, clientes) | Admin |
| `GET` | `/api/features` | Lista feature flags | Admin |
| `POST` | `/api/features` | Actualizar feature flags | Admin |
| `GET` | `/api/resta3/features` | Feature flags para RESTA3 | RESTA3 |
| `GET` | `/api/permissions` | Permisos por rol | Admin |
| `POST` | `/api/ai/chat` | Chat IA en streaming (Groq/Llama) por rol | No |

---

## 5. Base de datos — Esquema actual

### Tabla `customers`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador único |
| `name` | TEXT | Nombre del cliente |
| `phone` | TEXT | Teléfono |
| `stamps` | INT | Sellos acumulados |
| `confirmed` | BOOL | Si fue activado |
| `password_hash` | TEXT | SHA-256 de contraseña (para cuenta digital) |
| `created_at` | TIMESTAMPTZ | Fecha de registro |
| `expires_at` | TIMESTAMPTZ | Expiración de la tarjeta |

### Tabla `loyalty_cards`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `name` | TEXT | Nombre del portador |
| `phone_normalized` | TEXT | Teléfono normalizado |
| `stamps` | INT | Sellos actuales |
| `active` | BOOL | Si la tarjeta está activa |
| `expires_at` | TIMESTAMPTZ | Expiración (90 días rotativo) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

### Tabla `menu_items`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `name` | TEXT | Nombre del platillo |
| `description` | TEXT | Descripción |
| `price` | NUMERIC | Precio (IVA incluido) |
| `category` | TEXT | Categoría (Ensaladas, Platillos, etc.) |
| `image_url` | TEXT | URL de imagen en Supabase Storage |
| `available` | BOOL | Si está disponible |
| `likes` | INT | Conteo de likes |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

### Tabla `orders`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `customer_name` | TEXT | Nombre del cliente |
| `table_number` | TEXT | Número de mesa (opcional) |
| `items` | JSONB | Array de `{name, quantity, price}` |
| `total` | NUMERIC | Total del pedido (IVA incluido) |
| `notes` | TEXT | Notas adicionales del cliente |
| `status` | TEXT | `pending` → `preparing` → `ready` → `delivered` |
| `created_at` | TIMESTAMPTZ | Fecha y hora del pedido |

### Tabla `recipes`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `name` | TEXT | Nombre de la receta |
| `description` | TEXT | Descripción breve |
| `category` | TEXT | Categoría |
| `ingredients` | TEXT[] | Lista de ingredientes |
| `steps` | TEXT[] | Pasos de preparación |
| `image_url` | TEXT | Imagen |
| `created_at` | TIMESTAMPTZ | Fecha |

### Tabla `reviews`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `customer_name` | TEXT | Nombre del cliente |
| `rating` | INT | Rating 1-5 |
| `comment` | TEXT | Comentario |
| `bad` | BOOL | `true` si rating ≤ 3 (dispara email de alerta) |
| `published` | BOOL | `true` si rating ≥ 4 |
| `created_at` | TIMESTAMPTZ | Fecha |

### Tabla `tv_slides`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `title` | TEXT | Título del slide |
| `image_url` | TEXT | Imagen |
| `link_url` | TEXT | URL de enlace (opcional) |
| `active` | BOOL | Si está activo |
| `is_offer` | BOOL | Si es una oferta especial |
| `slide_order` | INT | Orden de aparición |
| `created_at` | TIMESTAMPTZ | Fecha |

### Tabla `settings`

Clave-valor genérico. Ver sección 6 para todas las claves conocidas.

| Columna | Tipo |
|---|---|
| `id` | UUID PK |
| `key` | TEXT UNIQUE |
| `value` | TEXT |
| `updated_at` | TIMESTAMPTZ |

### Tabla `admins`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `name` | TEXT | Nombre completo |
| `password_hash` | TEXT | SHA-256(`ADMIN_SECRET:name:password`) |
| `role` | TEXT | Rol: `Administrador \| Gerente \| Supervisor \| Encargado \| Cajero \| Auditor` |
| `restaurant_id` | TEXT | Aislamiento multi-tenant (`'default'` o `'portales'`) |
| `created_at` | TIMESTAMPTZ | Fecha |

### Tabla `employees`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `name` | TEXT | Nombre completo |
| `password_hash` | TEXT | SHA-256(`emp:ADMIN_SECRET:name:password`) |
| `role` | TEXT | Rol: `Mesero \| Capitán \| Hostess \| Bartender \| Barista \| Cocina \| Cajero \| Repartidor` |
| `restaurant_id` | TEXT | Aislamiento multi-tenant |
| `created_at` | TIMESTAMPTZ | Fecha |

### Tabla `birthday_registrations`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `name` | TEXT | Nombre del cliente |
| `phone` | TEXT | Teléfono |
| `birthdate` | DATE | Fecha de cumpleaños |
| `restaurant_id` | TEXT | Aislamiento multi-tenant |
| `created_at` | TIMESTAMPTZ | Fecha |

> **Nota multi-tenant:** todas las tablas (`customers`, `loyalty_cards`, `menu_items`, `orders`, `recipes`, `reviews`, `tv_slides`, `admins`, `employees`, `tables`, `inventory`, `birthday_registrations`) tienen columna `restaurant_id TEXT DEFAULT 'default'`. La tabla `settings` no tiene columna `restaurant_id` — usa prefijo de clave (`portales:restaurant_name`) en lugar de columna.

### Tabla `inventory`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `name` | TEXT | Nombre del producto |
| `stock` | NUMERIC | Cantidad actual |
| `min_stock` | NUMERIC | Stock mínimo (umbral de alerta) |
| `unit` | TEXT | Unidad (kg, L, piezas, etc.) |
| `cost` | NUMERIC | Costo por unidad |
| `created_at` | TIMESTAMPTZ | Fecha |

### Tabla `tables`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `number` | TEXT | Número o nombre de mesa |
| `status` | TEXT | `libre` \| `ocupada` \| `reservada` \| `limpieza` |
| `created_at` | TIMESTAMPTZ | Fecha |

---

## 6. Claves de configuración (Settings)

Todas se guardan en la tabla `settings` y se leen con `GET /api/settings?key=CLAVE`.  
Se editan desde `/admin/configuracion`.

**Multi-tenant:** para restaurantes distintos de NICHO, las claves se almacenan con prefijo: `portales:restaurant_name`, `portales:sidebar_accent`, etc. El código usa `settingsDb.ts` → `scopedKey(key)` que agrega el prefijo automáticamente. Las claves `feature_flags_*` son la excepción — se escriben sin prefijo (ver sección 11).

### Identidad general

| Clave | Descripción |
|---|---|
| `restaurant_name` | Nombre del restaurante (sidebar admin, tickets) |
| `restaurant_address` | Dirección física (se imprime en tickets) |
| `restaurant_phone` | Teléfono del negocio (se imprime en tickets) |
| `admin_subtitle` | Subtítulo bajo el nombre en sidebars de admin/empleado/resta3 |
| `profile_logo` | URL del logo principal (admin y empleados) |
| `sidebar_accent` | Color de acento del panel admin (hex). Default en código: `#B90F45` |

### Panel RESTA3

| Clave | Descripción |
|---|---|
| `resta3_name` | Nombre del panel RESTA3 (si vacío, usa `restaurant_name`) |
| `resta3_logo` | Logo de RESTA3 (si vacío, usa `profile_logo`) |
| `resta3_accent` | Color de acento RESTA3 (si vacío, usa `sidebar_accent`) |
| `corte_turno_inicio` | Timestamp de inicio del turno activo (JSON) |
| `cortes_historial` | Historial de cortes de caja (JSON array, últimos 100) |
| `feature_flags_resta3` | JSON de módulos RESTA3 habilitados (sin prefijo de restaurante) |

### Panel empleados

| Clave | Descripción |
|---|---|
| `employee_accent` | Color de acento del panel de empleados |
| `employee_logo` | Logo del panel de empleados |
| `employee_permissions` | JSON: `emp_fidelizacion`, `emp_pedidos`, `emp_menu_ver`, `emp_recetario`, `emp_clientes_ver` → bool |

### Menú del cliente

| Clave | Descripción |
|---|---|
| `menu_logo` | Logo en la página del menú y `/card` (fallback: `profile_logo`) |
| `menu_bg_color` | Color de fondo del menú (default `#0d0d0d`) |
| `menu_btn_color` | Color de botones del menú (default `#B90F45`) |
| `menu_hover_color` | Color hover de botones del menú (default `#DC5E86`) |
| `business_wa` | Número de WhatsApp del negocio — dígitos sin `+` (ej. `526641234567`) |
| `customer_nav` | JSON `NavConfig`: `bg`, `border`, `accent`, `inactive`, `radius`, `tabs[]`, `showLogout`. Editable en `/admin/navegador` |
| `user_permissions` | JSON: `usr_menu`, `usr_resenas`, `usr_tarjeta` → bool |

### Registro y lealtad

| Clave | Descripción |
|---|---|
| `registro_titulo` | Título de la página `/registro` |
| `registro_subtitulo` | Subtítulo de la página `/registro` |
| `reward_categories` | JSON con niveles de tarjeta de lealtad y sus recompensas |

### Recetario

| Clave | Descripción |
|---|---|
| `recetario_color` | Color de acento del recetario |
| `recetario_logo` | Logo del recetario |

### Feature flags (escritas por el super-admin, sin prefijo de restaurante)

| Clave | Descripción |
|---|---|
| `feature_flags` | JSON de módulos admin habilitados (fallback global) |
| `feature_flags_portales` | JSON de módulos admin para Portales |
| `feature_flags_resta3` | JSON de módulos RESTA3: `r3_tpv`, `r3_mesas`, `r3_cocina`, `r3_inventario`, `r3_compras`, `r3_empleados`, `r3_reportes` |

Módulos admin disponibles: `orders`, `menu`, `reviews`, `tv`, `customers`, `analytics`, `loyaltyCard`, `favorites`, `ventas`, `marketing`, `crm`, `reservaciones`, `operaciones`, `automatizaciones`, `contenido`, `produccion`, `reportes`, `configuracion`, `cumpleanos`

---

## 7. Variables de entorno

### Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Multi-tenant (requerida en Portales, ausente en NICHO)

```env
# Solo en mi-restauranteportales:
NEXT_PUBLIC_RESTAURANT_ID=portales
# En mi-proyecto esta variable NO se define (equivale a 'default')
```

### Recomendadas (sin estas algunas funciones no operan)

```env
# Sesiones y hash de contraseñas (default inseguro: 'dev-secret')
ADMIN_SECRET=min-32-chars-random-string

# Chat de IA con Groq/Llama
GROQ_API_KEY=gsk_...

# Notificaciones WhatsApp automáticas al recibir pedidos (CallMeBot)
CALLMEBOT_API_KEY=xxxxxx
```

### Opcionales

```env
# Alertas por email cuando una reseña tiene rating <= 3
GMAIL_USER=correo@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
REVIEW_EMAIL=destino-alertas@gmail.com

# Permisos elevados para operaciones de cumpleaños (birthdayDb.ts)
SUPABASE_SERVICE_KEY=eyJ...
```

### Configurar en Vercel

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_RESTAURANT_ID production   # solo en portales
vercel env add ADMIN_SECRET production
vercel env add GROQ_API_KEY production
vercel env add CALLMEBOT_API_KEY production
```

> Las variables `NEXT_PUBLIC_*` son públicas (visibles en el navegador). Nunca poner secretos con ese prefijo.

> **BOM:** PowerShell 5.1 agrega el carácter BOM (U+FEFF) al configurar env vars con `vercel env add`. Esto causa error 500 en Supabase. `lib/supabase.ts` y `lib/birthdayDb.ts` ya lo stripean automáticamente con `String.fromCharCode(65279)`. Si agregas nuevos clientes HTTP directos, aplica el mismo strip.

---

## 8. Comandos de desarrollo

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (localhost:3000)
npm run dev

# Build de producción
npm run build

# Linting
npm run lint

# Verificar tipos TypeScript (sin compilar)
npx tsc --noEmit

# Deploy a producción en Vercel
vercel deploy --prod --yes

# Ver logs de la última función en Vercel
vercel logs --prod
```

### Archivos importantes

| Archivo | Descripción |
|---|---|
| `CLAUDE.md` | Instrucciones para el asistente IA de desarrollo |
| `lib/supabase.ts` | Cliente único de Supabase |
| `lib/auth.ts` | Token HMAC para sesiones admin/empleado |
| `lib/whatsappNotify.ts` | Envío de WhatsApp vía CallMeBot |
| `lib/uploadWebp.ts` | Conversión a WebP en el navegador antes de subir |
| `lib/features.ts` | Feature flags (activar/desactivar módulos) |
| `app/components/AIChat.tsx` | Componente de chat IA reutilizable |
| `app/components/EmployeeNav.tsx` | Navegación del panel de empleados |
| `next.config.ts` | Configuración de Next.js y headers de seguridad |

---

## 9. Funcionalidades recientes

### Notificaciones WhatsApp automáticas (junio 2026)

Cuando un cliente hace un pedido desde `/menu`, se envía automáticamente un mensaje WhatsApp al número del negocio (5214471078185) con el detalle completo:

```
🍽️ *Nuevo pedido*
👤 Nombre del cliente
🪑 Mesa X
• 1× Ensalada Tropical Fresh
• 2× Agua mineral

💰 Total: $185.00
```

**Implementación:** `lib/whatsappNotify.ts` + `app/api/orders/route.ts`  
**API usada:** CallMeBot (gratuita, requiere activación previa del número)  
**Variable de entorno:** `CALLMEBOT_API_KEY`

---

### Impresión de tickets (junio 2026)

Desde `/employee/orders`, el botón 🖨️ abre una ventana de impresión con el ticket formateado para impresora térmica de 80mm. El ticket incluye:

- Nombre y logo del restaurante
- Dirección y teléfono (configurables en `/admin/configuracion`)
- Fecha y hora del pedido + folio (#XXXXXXXX)
- Cliente y mesa
- Notas del pedido
- Lista de items: nombre + precio unitario × cantidad = importe
- Desglose: Subtotal sin IVA + IVA 16% + Total
- Casillas de método de pago: Efectivo / Tarjeta / Transferencia

Para que aparezca la dirección y el teléfono en el ticket, configurarlos primero en `/admin/configuracion` → sección "Identidad del restaurante".

---

### Seguridad en logins (junio 2026)

Los tres paneles de login (`/admin/login`, `/employee/login`, `/resta3/login`) ahora requieren:

- **Nombre completo** (mínimo 2 palabras al crear cuenta)
- **Contraseña segura** (mínimo 12 caracteres con letras y números, solo al crear cuenta)
- **Recordarme** — guarda el nombre en `localStorage` para pre-llenarlo la próxima vez

---

## 10. Despliegue en Vercel

### Primera vez

```bash
# Instalar CLI de Vercel
npm i -g vercel

# Login
vercel login

# Asociar proyecto (ejecutar en la raíz del proyecto)
vercel link

# Configurar variables de entorno
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add ADMIN_SECRET production
vercel env add GROQ_API_KEY production
vercel env add CALLMEBOT_API_KEY production

# Deploy
vercel deploy --prod --yes
```

### Deploys posteriores

Cada `git push origin main` hace deploy automático si el repositorio está conectado a Vercel. O manualmente:

```bash
vercel deploy --prod --yes
```

### Rollback

```bash
# Ver deployments anteriores
vercel ls

# Rollback a deployment específico
vercel rollback [deployment-url]
```

### Logs en tiempo real

```bash
vercel logs --prod
```

### URL de producción actual

```
https://mi-proyecto-phi-ecru.vercel.app
```

---

## Notas de arquitectura

- **No usar `react-konva` en Server Components** — siempre con `next/dynamic(..., { ssr: false })`
- **No usar `lib/uploadWebp.ts` en rutas del servidor** — es solo cliente (`'use client'`)
- **El endpoint `/api/ai/chat` debe ser Lambda de Node.js** (`maxDuration = 60`) — Edge Runtime no inyecta `GROQ_API_KEY`
- **Agregar un campo a la DB** → actualizar el mapper `toX(row)`, el payload de inserción/actualización y la `interface` en `lib/*Db.ts`. Si es tabla nueva, incluir `restaurant_id TEXT DEFAULT 'default'` y filtrar por `RID`
- **Multi-tenancy:** nunca hacer `.select('*')` sin `.eq('restaurant_id', RID)` en `lib/*Db.ts`. Excepción: `settings` usa prefijo de clave
- **Tailwind CSS 4**: sin `tailwind.config.js`, los tokens personalizados van en `@theme inline {}` dentro de `globals.css`
- **Color acento por defecto:** `#B90F45` en `globals.css` — aplica cuando no hay `sidebar_accent` en settings
- **BOM:** `lib/supabase.ts` y `lib/birthdayDb.ts` stripean U+FEFF con `String.fromCharCode(65279)`. Aplicar a todo cliente HTTP nuevo
- **`sharp`:** declarado en `serverExternalPackages` para evitar fallo de binarios nativos en Vercel; `imageWebp.ts` es pass-through
- **Permisos de admin en configuracion:** contraseñas generadas con `crypto.getRandomValues` en formato `XXXX-XXXX-XXXX-XXXX`; no son recuperables después de crear la cuenta

---

## 11. Multi-tenancy — NICHO y Portales

### Arquitectura

El mismo Supabase sirve a ambos restaurantes. El aislamiento es por columna `restaurant_id` en cada tabla:

```ts
// En cada lib/*Db.ts:
const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

// Lecturas siempre con:
.eq('restaurant_id', RID)

// Inserts siempre con:
{ ...campos, restaurant_id: RID }
```

La tabla `settings` es la excepción — usa prefijo de clave en lugar de columna:

```ts
function scopedKey(key: string) {
  return RID === 'default' ? key : `${RID}:${key}`
}
// portales busca 'portales:restaurant_name', NICHO busca 'restaurant_name'
```

### NICHO (`mi-proyecto`)

| Campo | Valor |
|---|---|
| `NEXT_PUBLIC_RESTAURANT_ID` | no definida (→ `'default'`) |
| URL Vercel | https://mi-proyecto-phi-ecru.vercel.app |
| `ADMIN_SECRET` | `restaurant-secret-2024` (en `.env.local`) |

### Restaurante Portales (`mi-restauranteportales`)

| Campo | Valor |
|---|---|
| `NEXT_PUBLIC_RESTAURANT_ID` | `portales` |
| `ADMIN_SECRET` | `[redacted]` |
| Admin principal | **Jesus Segundo** / contraseña: **Portales2025** |
| Hash SHA-256 del admin | `414b9b635c22c27ad50dc803e5e8d97a72c861759f96c10c781e149615fbd735` |

### Feature flags — conexión con super-admin

`getFeatureFlags()` en `lib/features.ts` consulta Supabase **directamente** (sin `scopedKey`) buscando `feature_flags_portales` → fallback `feature_flags`. Esto permite que `mi-superadminrestaurante` escriba `feature_flags_portales` y el código de portales lo lea correctamente.

La ruta `POST /api/features` tiene CORS restringido a `https://mi-superadmindrestaurante.vercel.app` para que solo el super-admin pueda escribir flags.

### Componentes de infraestructura (ambos proyectos)

| Componente | Descripción |
|---|---|
| `AdminThemeToggle` | Botón dark/light; lee/escribe `admin_theme` en localStorage, sin estado React para evitar hydration mismatch |
| `RightRail` | Panel lateral fijo 420px solo en RESTA3. Expone `useRightRail()` context con `mount`, `setFilled`, `setTitle`, `open`. Las páginas usan `createPortal` al nodo `mount` |
| `RewardIcon` | Íconos para categorías de lealtad: `coffee`, `cup`, `cake`, `gift`, `star`, `crown`, `tag`, `percent`, `heart`, `bag`, `ticket`, `bolt`, `flame`. Exporta `REWARD_ICON_KEYS` e `isCustomIcon` |
| `Icon` | Sistema de íconos de línea (~50 variantes, tipo `IconName`) |
| `NavegadorEditor` | Editor de `customer_nav` (colores, radio, tabs con iconos custom) en `/admin/navegador` |

### Corte de caja RESTA3

`GET /api/resta3/corte` devuelve el turno activo con conteos de ventas por tipo de pago. El tipo se infiere de etiquetas en el campo `notes` del pedido:

| Tag en `notes` | Tipo de pago |
|---|---|
| `[TARJETA]` | Tarjeta |
| `[TRANSFERENCIA]` | Transferencia |
| `[GOGO]` / `[RAPPI]` / `[UBEREATS]` | Domicilio |
| (ninguno) | Efectivo |

`POST /api/resta3/corte` cierra el turno, guarda en `cortes_historial` (últimos 100) y abre uno nuevo.

---

*Documentación actualizada 2026-06-25. Ver `documentos/arquitectura-saas-2026-06-12-13-20.md` para diseño técnico detallado.*
