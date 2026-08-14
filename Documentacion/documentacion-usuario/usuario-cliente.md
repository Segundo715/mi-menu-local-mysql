# Documentación del Usuario Cliente — Plataforma NICHO

> **Documento de referencia técnica y funcional del perfil "Cliente".**
> Describe, con base en el código real de la aplicación, todo lo que puede ver y hacer
> el comensal o público general dentro de la plataforma NICHO.

| Metadato | Valor |
|----------|-------|
| **Perfil documentado** | Cliente (comensal / público general) |
| **Plataforma** | NICHO — SaaS para restaurantes en México |
| **Stack técnico** | Next.js 16 (App Router) · React 19 · TypeScript · Supabase · Tailwind CSS 4 |
| **Repositorio de la app cliente** | `mi-proyecto` (app del restaurante) |
| **Panel de control global** | `mi-superadmindrestaurante` (Super Admin NICHO) |
| **Autenticación del cliente** | SHA-256 (`customer:` namespace), sin cookies (stateless) |
| **Fecha del documento** | 2026-07-08 |
| **Versión** | 2.0 (reescritura detallada con verificación contra código) |
| **Color de marca base** | `#B90F45` (rosa/guinda NICHO) |

---

## Índice

1. [Portada y metadatos](#documentación-del-usuario-cliente--plataforma-nicho)
2. [Índice](#índice)
3. [Visión general del perfil Cliente](#3-visión-general-del-perfil-cliente)
4. [Mapa de rutas del cliente](#4-mapa-de-rutas-del-cliente)
5. [Flujo de registro paso a paso](#5-flujo-de-registro-paso-a-paso)
6. [Máquina de estados y lógica de localStorage](#6-máquina-de-estados-y-lógica-de-localstorage)
7. [La tarjeta de lealtad — frente, reverso, variantes](#7-la-tarjeta-de-lealtad--frente-reverso-variantes)
8. [Códigos QR — los dos flujos](#8-códigos-qr--los-dos-flujos)
9. [Menú digital — catálogo, carrito, pedidos](#9-menú-digital--catálogo-carrito-pedidos)
10. [Seguimiento de pedido en tiempo real](#10-seguimiento-de-pedido-en-tiempo-real)
11. [Asistente de IA — rol customer](#11-asistente-de-ia--rol-customer)
12. [Reseñas — formulario, moderación, publicación](#12-reseñas--formulario-moderación-publicación)
13. [Recetario público](#13-recetario-público)
14. [Club de cumpleaños](#14-club-de-cumpleaños)
15. [Activación por WhatsApp](#15-activación-por-whatsapp)
16. [Likes y engagement](#16-likes-y-engagement)
17. [Cuenta de cliente multi-dispositivo](#17-cuenta-de-cliente-multi-dispositivo)
18. [CustomerNav — barra de navegación](#18-customernav--barra-de-navegación)
19. [Permisos del cliente](#19-permisos-del-cliente)
20. [Personalización visual](#20-personalización-visual)
21. [Seguridad y privacidad](#21-seguridad-y-privacidad)
22. [Tabla de endpoints del cliente](#22-tabla-de-endpoints-del-cliente)
23. [Preguntas frecuentes extendidas](#23-preguntas-frecuentes-extendidas)
24. [Diagrama ASCII del flujo completo](#24-diagrama-ascii-del-flujo-completo)
25. [Glosario de términos](#25-glosario-de-términos)

---

## 3. Visión general del perfil Cliente

La plataforma NICHO es un sistema integral para restaurantes que reúne varios perfiles de
usuario. Cada perfil ve una interfaz distinta y tiene permisos distintos:

| Perfil | Descripción | Sesión (cookie) |
|--------|-------------|-----------------|
| **Admin** | Dueño o gerente del restaurante. Configura todo. | `admin_session` |
| **Empleado** | Personal operativo. Sella tarjetas, gestiona pedidos. | `employee_session` |
| **RESTA3** | Operación avanzada / punto de venta. | `resta3_session` |
| **Cliente** | Comensal o público general. **Es el tema de este documento.** | *(sin cookie de sesión)* |

Este documento describe **únicamente** el perfil **Cliente**: la persona que come en el
restaurante o pide a domicilio, se inscribe al programa de lealtad, deja reseñas e interactúa
con el menú digital.

### 3.1 Principios de diseño del perfil Cliente

El diseño del perfil Cliente responde a cuatro principios que explican casi todas las
decisiones técnicas que verás en este documento:

1. **Sin fricción (registro en segundos).** El objetivo es que un comensal pueda inscribirse
   con el mínimo de datos: nombre, WhatsApp y (opcionalmente) fecha de nacimiento. Cuantos
   menos campos, mayor la tasa de conversión.

2. **Público por defecto.** Menú, reseñas, recetario, likes, cumpleaños y el asistente de IA
   **no piden inicio de sesión**. El único flujo con contraseña es la "Cuenta de cliente"
   opcional (`/card/usuario`), pensada para acceso multi-dispositivo.

3. **Persistencia local (localStorage).** El estado del cliente (qué tarjeta tiene, qué
   pedidos hizo, qué platillos le gustaron) vive en el `localStorage` del navegador. Esto
   permite reconocer al cliente cuando vuelve, **sin cuentas ni cookies**. La contraparte es
   que ese estado se pierde si el cliente cambia de teléfono o borra los datos del navegador.

4. **Personalizable por restaurante.** Colores, logos, textos y qué pestañas ve el cliente se
   leen desde la tabla `settings`. Así cada restaurante ve su propia marca y no una interfaz
   genérica. El **Super Admin de NICHO** puede además activar o desactivar módulos completos.

### 3.2 ¿Cómo llega el cliente a la app?

El cliente **no instala ninguna aplicación**. Accede desde el navegador del teléfono por:

- **Códigos QR** impresos en mesas, mostrador o materiales de marketing.
- **Enlaces de WhatsApp** que envía el restaurante.
- **La barra de navegación inferior** (`CustomerNav`) una vez que está dentro de cualquier
  página del cliente.

### 3.3 Dos sistemas de tarjeta que conviven

Es fundamental entender desde el inicio que en el código **coexisten dos mecanismos de
tarjeta**, con tablas distintas en Supabase:

| Mecanismo | Tabla Supabase | Módulo de datos | Rutas | Clave de localStorage |
|-----------|----------------|-----------------|-------|-----------------------|
| **Tarjeta de sellos** (lealtad clásica) | `loyalty_cards` | `lib/loyaltyDb.ts` | `/registro`, `/loyalty`, `/card`, variantes | `registro_card_id` |
| **Cuenta de cliente** (login con contraseña) | `customers` | `lib/db.ts` | `/card/usuario`, `/activate` | `loyalty_account_id`, `loyalty_pending_id`, `loyalty_id` |

Ambos comparten la idea de "código QR = identificador único del titular", pero son sistemas
separados a nivel de base de datos. A lo largo del documento se aclara cuál aplica en cada
flujo.

---

## 4. Mapa de rutas del cliente

Todas estas rutas se sirven bajo el dominio del restaurante y, salvo donde se indica, son
**públicas** (no requieren sesión).

| Ruta | Archivo | Propósito | Sesión |
|------|---------|-----------|--------|
| `/menu` | `app/menu/page.tsx` | Menú digital + carrito + pedidos + seguimiento + asistente IA | No |
| `/registro` | `app/registro/page.tsx` | Registro al programa de lealtad (formulario completo con edad y términos) | No |
| `/loyalty` | *(alias de registro)* | Registro al programa de lealtad | No |
| `/card` | `app/card/page.tsx` | Tarjeta de lealtad de sellos: frente + reverso con QR personal | No |
| `/card/premium` | `app/card/premium/page.tsx` | Variante de tarjeta: premium | No |
| `/card/2x1` | `app/card/2x1/page.tsx` | Variante de tarjeta: promoción 2x1 | No |
| `/card/descuento` | `app/card/descuento/page.tsx` | Variante de tarjeta: descuento | No |
| `/card/wallet` | `app/card/wallet/page.tsx` | Variante de tarjeta: formato tipo wallet | No |
| `/card/usuario` | `app/card/usuario/page.tsx` | **Cuenta de cliente** (registro/login con contraseña) | Contraseña (SHA-256) |
| `/review` | `app/review/page.tsx` | Feed de reseñas + formulario para dejar reseña | No |
| `/resena` | *(alias de review)* | Igual que `/review` | No |
| `/recetas` | `app/recetas/page.tsx` | **Placeholder "Próximamente"** (alias sin implementar) | No |
| `/resetas` | `app/resetas/page.tsx` | **Recetario público real** con branding completo | No |
| `/activate` | `app/activate/page.tsx` + `ActivateClient.tsx` | Activar cuenta mediante enlace de WhatsApp (`?id=[UUID]`) | No |
| `/cumpleanos` | `app/cumpleanos/page.tsx` | Club de cumpleaños (registro + celebración) | No |

> **Corrección importante respecto a versiones previas de este documento:** `/recetas` y
> `/resetas` **NO** son alias equivalentes. En el código, `app/recetas/page.tsx` es solo un
> placeholder que muestra "Próximamente". El recetario funcional con branding vive en
> `app/resetas/page.tsx`. Comparte siempre el enlace `/resetas` a los clientes.

### 4.1 Sobre los alias en español/inglés

Varias funciones tienen dos nombres de ruta (por ejemplo `/registro` y `/loyalty`, o `/review`
y `/resena`). La intención es que el restaurante comparta el enlace en el idioma que prefiera.
Ambos alias llevan a la misma funcionalidad.

---

## 5. Flujo de registro paso a paso

El corazón del perfil Cliente es el **programa de lealtad por sellos**. Funciona como la
clásica tarjeta de "junta sellos y llévate uno gratis", pero digital. El texto por defecto de
la app es "5 visitas = café gratis ☕".

### 5.1 Registro completo desde `/registro`

La página `/registro` (`app/registro/page.tsx`) implementa el formulario más completo. Pide:

- **Nombre completo** (`name`) — obligatorio.
- **Número de WhatsApp** (`phone`) — obligatorio.
- **Fecha de nacimiento** (`birth`) — obligatorio; se convierte a `age` en años antes de
  enviar (`Math.floor((Date.now() - fecha) / (365.25 * 86400000))`).
- **Aceptación de términos y condiciones** (`terms`) — obligatorio (checkbox).

Validaciones (en `handleSubmit`), en este orden, con mensajes exactos:

| Campo faltante | Mensaje mostrado |
|----------------|------------------|
| Nombre vacío | `Ingresa tu nombre completo` |
| WhatsApp vacío | `Ingresa tu número de WhatsApp` |
| Fecha vacía | `Ingresa tu fecha de nacimiento` |
| Términos sin aceptar | `Debes aceptar los términos y condiciones` |

Al enviar, se hace `POST /api/loyalty` con:

```json
{
  "name": "Juan Pérez García",
  "phone": "443 123 4567",
  "age": 29,
  "cardType": "cafe"
}
```

### 5.2 Pantalla del formulario (ASCII conceptual)

```
┌───────────────────────────────────────┐
│      ▓▓▓ gradiente guinda #B90F45 ▓▓▓  │
│              [ LOGO NICHO ]            │
│        Únete a nuestra comunidad      │
├───────────────────────────────────────┤
│  ┌─────────────────────────────────┐  │
│  │  ¡Bienvenido!                   │  │  ← registro_titulo
│  │  Completa tus datos para        │  │  ← registro_subtitulo
│  │  registrarte...                 │  │
│  └─────────────────────────────────┘  │
│                                       │
│  👤 Nombre Completo *                  │
│  [ Ej: Juan Pérez García           ]  │
│                                       │
│  📱 Número de WhatsApp *               │
│  [ Ej: 443 123 4567                ]  │
│                                       │
│  🎂 Fecha de Nacimiento *              │
│  [ dd / mm / aaaa                  ]  │
│                                       │
│  ☑ He leído y acepto los términos     │
│    y condiciones y la política de     │
│    privacidad *                       │
│                                       │
│  [    ☕ Unirme a NICHO             ]  │
└───────────────────────────────────────┘
```

### 5.3 Respuesta del servidor y qué significa el código HTTP

El endpoint `POST /api/loyalty` (`app/api/loyalty/route.ts`) es **público** (el empleado o el
propio cliente puede crear la tarjeta). Internamente llama a `findOrCreate()` de `loyaltyDb`,
que **busca por teléfono normalizado + tipo de tarjeta**. Devuelve:

| HTTP | Significado | Reacción de la UI de `/registro` |
|------|-------------|----------------------------------|
| `201 Created` | Tarjeta **nueva** creada (`active: true` inmediatamente) | pasa al estado `active` → muestra "¡Tarjeta activada!" y redirige a `/card` en 3 s |
| `200 OK` | Ya **existía** una tarjeta con ese teléfono+tipo | pasa al estado `already` (muestra sellos actuales) |
| `400 Bad Request` | Falta nombre o teléfono (`{ "error": "Nombre y teléfono requeridos" }`) | muestra el error en rojo |

> **Importante:** `findOrCreate()` en `lib/loyaltyDb.ts` siempre crea tarjetas nuevas con
> `active: true`. Los clientes nuevos **nunca** quedan en espera — su tarjeta está lista
> de inmediato. El estado `waiting` solo aparece si un administrador **desactiva manualmente**
> una tarjeta existente desde el panel.

### 5.4 Vigencia de la tarjeta

El endpoint consulta `reward_categories` en `settings` para saber la vigencia
(`validityMonths`) del tipo de tarjeta. Si no está configurada, usa **3 meses** por defecto.
La fecha de expiración (`expires_at`) se **recalcula cada vez que se agrega un sello**, de modo
que un cliente activo nunca ve expirar su tarjeta.

---

## 6. Máquina de estados y lógica de localStorage

El registro y la tarjeta se controlan con **máquinas de estados** cuyo progreso se persiste en
`localStorage`. Esto permite que, si el cliente cierra la página y vuelve, retome donde estaba.

### 6.1 Estados reales de `/registro`

```
checking → form → already
                → active
                → waiting (por polling → active)
```

| Estado | Constante en código | Qué ve el cliente |
|--------|---------------------|-------------------|
| `checking` | `'checking'` | Pantalla "Verificando..." con logo pulsante mientras se revisa el `localStorage`. |
| `form` | `'form'` | El formulario de registro. |
| `already` | `'already'` | "¡Hola, [nombre]! Ya estás registrado" + sellos actuales. |
| `waiting` | `'waiting'` | "¡Registro recibido!" — solo aparece si el admin desactivó la tarjeta manualmente (con polling cada 5 s). Los clientes nuevos **nunca** llegan a este estado. |
| `active` | `'active'` | "¡Tarjeta activada!" + redirige automáticamente a `/card` en 3 segundos. |

> **Nota:** no existe un estado `confirm` intermedio. El formulario se envía directamente sin
> una pantalla de confirmación de datos.

### 6.2 Estados reales de `/card`

```
loading → form → waiting (polling cada 5 s) → card
                → card (si la tarjeta ya viene activa)
```

| Estado | Qué ve el cliente |
|--------|-------------------|
| `loading` | "Verificando..." con logo pulsante. |
| `form` | Mini-formulario (solo nombre + teléfono) para recuperar/crear la tarjeta. |
| `waiting` | "Registro recibido" — solo si la tarjeta fue desactivada manualmente por admin. Los clientes nuevos van directo a `card`. |
| `card` | La tarjeta activada, girable (frente ↔ reverso con QR). |

### 6.3 Clave de localStorage: `registro_card_id`

**A diferencia de lo que decían versiones previas de este documento**, el sistema de sellos usa
una **única clave**: `registro_card_id` (constante `LS_KEY` / `STORAGE_KEY`). No existen las
claves `loyalty_card_id` ni `loyalty_pending_id` en el flujo de sellos.

Lógica de recuperación al cargar (`useEffect` inicial):

```
1. Lee registro_card_id de localStorage.
2. Si existe → GET /api/loyalty/{id}
   ├─ Si responde con card.id  → guarda la tarjeta y muestra 'already' (registro)
   │                              o decide 'card'/'waiting' según card.active (card page)
   └─ Si 404 / null            → borra la clave y muestra 'form'
3. Si no existe → muestra 'form' directamente.
```

### 6.4 Polling de activación

Cuando la tarjeta está en `waiting`, la página consulta `GET /api/loyalty/{id}` **cada 5000 ms**
(`setInterval`) hasta que la respuesta trae `active: true`. En ese momento salta a `card`
(o `active` en `/registro`). El intervalo se limpia al desmontar o cambiar de estado.

### 6.5 Claves de localStorage del ecosistema cliente (referencia completa)

| Clave | Página que la usa | Contenido |
|-------|-------------------|-----------|
| `registro_card_id` | `/registro`, `/card`, variantes | ID de la tarjeta de sellos (`loyalty_cards`). |
| `loyalty_account_id` | `/card/usuario` | ID de la cuenta de cliente con contraseña (`customers`). |
| `loyalty_pending_id` | `/activate`, logout de `CustomerNav` | ID de una tarjeta pendiente de confirmar (sistema `customers`). |
| `loyalty_id` | `/activate` | ID confirmado tras activar por WhatsApp. |
| `cumpleanos_data` | `/cumpleanos` | `{ name, birthdate }` del registro de cumpleaños. |
| `my_order_ids` | `/menu` | Arreglo de IDs de pedidos activos del cliente. |
| `favorites` | `/menu` | Arreglo de IDs de platillos a los que dio "me encanta". |

> **Consecuencia de privacidad/UX:** como todo vive en el navegador, si el cliente cambia de
> teléfono o borra los datos, pierde estas referencias. La **Cuenta de cliente** (sección 17)
> es la única forma de recuperar la tarjeta desde otro dispositivo.

---

## 7. La tarjeta de lealtad — frente, reverso, variantes

La tarjeta digital (`/card`) es una tarjeta de **dos caras que gira en 3D** con un toque
(`transform: rotateY(180deg)`, `transformStyle: preserve-3d`, transición de 700 ms).

### 7.1 Estructura del modelo `LoyaltyCard`

Tal como está definido en `lib/loyaltyDb.ts`, cada tarjeta tiene:

```ts
interface LoyaltyCard {
  id: string            // UUID; ES el valor que codifica el QR
  name: string
  phone: string
  visits: number        // sellos acumulados (0..5)
  active: boolean       // activada por el admin/empleado
  cardType: string      // 'cafe' por defecto
  expiresAt?: string    // ISO; se renueva con cada sello
  registeredAt: string
  stamps: { timestamp: string; visitsAfter: number }[]
}
```

Columnas reales en la tabla `loyalty_cards` de Supabase: `id`, `name`, `phone`, `visits`,
`active`, `card_type`, `expires_at`, `registered_at`, `stamps`, `restaurant_id`.

### 7.2 El frente

El frente muestra:

- Logo del restaurante (arriba a la izquierda) y marca (`brandText` o `brandLogo`).
- Una imagen de fondo (`cfg.image`, p. ej. un platillo) con los **sellos superpuestos**:
  tantos círculos como `goal` (por defecto 5), rellenos según `visits`.
- Oferta de recompensa: "Cada {goal} visitas: {reward}".
- Contador "Sellos · Premios": `{visits}/{goal} · {earned ? '1' : '0'}`.
- Pista "Toca para ver tu código ↻".

```
┌─────────────────────────────────────┐
│ [logo]                        NICHO  │
│ ┌─────────────────────────────────┐ │
│ │   (imagen del platillo)         │ │
│ │   ⬤  ⬤  ⬤  ○  ○   ← sellos      │ │
│ └─────────────────────────────────┘ │
│ ─────────────────────────────────── │
│ OFERTA DE RECOMPENSA   SELLOS·PREMIOS│
│ Cada 5 visitas: Café    3/5 · 0      │
│ gratis ☕                            │
│                                     │
│        Toca para ver tu código ↻    │
└─────────────────────────────────────┘
```

### 7.3 El reverso

Al girar, se ve:

- Logo centrado + una "cinta magnética" negra decorativa.
- **Nombre del titular** en grande.
- Aviso: "Muestra este QR al empleado" (o "🎉 ¡Café gratis! Muéstraselo al cajero" si ya
  alcanzó la meta).
- **El código QR** generado con `react-qr-code`, cuyo valor es `customer.id` (el UUID de la
  tarjeta), tamaño 150 px sobre fondo blanco.

```
┌─────────────────────────────────────┐
│              [logo]                 │
│ ▓▓▓▓▓▓▓▓▓▓▓ (cinta negra) ▓▓▓▓▓▓▓▓▓ │
│ Juan                                │
│                                     │
│      Muestra este QR al empleado    │
│         ┌───────────────┐           │
│         │  ▓▓ ▓  ▓▓▓ ▓   │  ← QR     │
│         │  ▓  ▓▓▓  ▓ ▓   │  = UUID   │
│         │  ▓▓ ▓  ▓ ▓▓▓   │           │
│         └───────────────┘           │
│           ↻ Toca para volver        │
└─────────────────────────────────────┘
```

### 7.4 Configuración de la tarjeta (`reward_categories`)

El aspecto y la mecánica se leen de la clave `reward_categories` en `settings`. Es un arreglo
de categorías; el `/card` busca la de `id: 'cafe'` (o la primera). Estructura y valores por
defecto (`DEFAULT_CAFE`):

```json
[
  {
    "id": "cafe",
    "name": "Tarjeta de Café",
    "reward": "Café gratis",
    "goal": 5,
    "icon": "coffee",
    "color": "#B90F45",
    "iconColor": "#ffffff",
    "logo": "/logo.png",
    "image": "/uploads/menu/SalmonBowl.jpeg",
    "brandText": "NICHO",
    "brandLogo": "",
    "validityMonths": 3
  }
]
```

| Campo | Función | Default |
|-------|---------|---------|
| `goal` | Sellos necesarios para la recompensa | `5` |
| `reward` | Texto de la recompensa | `Café gratis` |
| `icon` | Icono de sello (via `RewardIcon`) | `coffee` |
| `color` | Color base de la tarjeta (gradiente 3D) | `#B90F45` |
| `iconColor` | Color del icono del sello | `#ffffff` |
| `image` | Imagen de fondo del frente | `/uploads/menu/SalmonBowl.jpeg` |
| `validityMonths` | Meses de vigencia | `3` |

> **Nota:** aunque `goal` es configurable en el diseño, la **mecánica de sellado del servidor
> tiene un tope fijo de 5** (ver sección 8.3). Si configuras `goal` mayor a 5, la tarjeta se
> verá con más círculos pero el backend dejará de sellar en 5. Es un punto a corregir si se
> quiere una meta mayor.

### 7.5 Variantes de tarjeta

| Ruta | Variante | Uso típico |
|------|----------|------------|
| `/card` | Estándar (sellos) | Tarjeta de sellos clásica. |
| `/card/premium` | Premium | Nivel superior con beneficios adicionales. |
| `/card/2x1` | 2x1 | Promoción dos por uno. |
| `/card/descuento` | Descuento | Enfocada en descuentos. |
| `/card/wallet` | Wallet | Formato compacto tipo cartera digital. |
| `/card/usuario` | Cuenta de socio | Registro/login con contraseña (sección 17). |

Todas comparten la mecánica de QR (el valor codificado es el UUID del titular), pero cambian el
diseño y el tipo de beneficio.

---

## 8. Códigos QR — los dos flujos

Existen **dos flujos de QR** complementarios. Es crucial no confundirlos.

### 8.1 Flujo A — El negocio muestra un QR, el cliente lo escanea

```
   [ Negocio / mesa / cartel ]           [ Cliente ]
   ┌───────────────────────┐             ┌──────────┐
   │  QR = URL del sitio   │  escanea →  │  cámara  │
   │  (ej. .../registro)   │             │          │
   └───────────────────────┘             └────┬─────┘
                                              │
                                              ▼
                               Se abre /registro o /card
                               → el cliente crea o ve su tarjeta
```

**Uso:** dirigir a un cliente nuevo hacia el registro, o que un cliente existente abra su
tarjeta rápidamente.

### 8.2 Flujo B — El cliente muestra su QR personal, el empleado lo escanea

```
   [ Cliente en /card ]                   [ Empleado ]
   ┌───────────────────────┐             ┌──────────┐
   │  Gira su tarjeta      │  muestra →  │  escáner │
   │  QR = customer.id     │             │  (panel) │
   │  (UUID de loyalty)    │             └────┬─────┘
   └───────────────────────┘                  │
                                              ▼
                          PATCH /api/loyalty/{id} { action:'stamp' }
                                    → +1 sello
```

**Uso:** acumular una visita/compra en cada consumo.

### 8.3 Mecánica de sellado (servidor)

El sellado ocurre en `PATCH /api/loyalty/[id]` con `{ action: 'stamp' }`, que **requiere
sesión de admin** (`admin_session`). La función `addStamp()` de `loyaltyDb`:

```
1. Busca la tarjeta por id.
2. Si !active  → NO sella (devuelve la tarjeta igual).
3. Si visits >= 5 → NO sella (tope alcanzado; hay que canjear).
4. Si no: visits += 1, agrega { timestamp, visitsAfter } a stamps[],
          renueva expires_at (+3 meses).
```

Otras acciones del mismo endpoint (todas requieren admin):

| `action` | Efecto | Función |
|----------|--------|---------|
| `stamp` | +1 sello (con topes) | `addStamp()` |
| `redeem` | Canjea: pone `visits = 0`, renueva vigencia | `redeemCoffee()` |
| `activate` | Activa la tarjeta y renueva vigencia | `activateCard()` |
| `deactivate` | Desactiva la tarjeta | `deactivateCard()` |
| *(DELETE)* | Elimina la tarjeta | `deleteCard()` |

### 8.4 Tabla comparativa

| | Flujo A | Flujo B |
|--|---------|---------|
| ¿Quién muestra el QR? | El negocio | El cliente |
| ¿Qué codifica el QR? | URL del sitio (p. ej. `/registro`) | El UUID personal (`customer.id`) |
| ¿Quién escanea? | El cliente | El empleado |
| Resultado | El cliente ve/crea su tarjeta | Se sella una visita |
| ¿Requiere sesión? | No | Sí (empleado/admin para sellar) |

---

## 9. Menú digital — catálogo, carrito, pedidos

La ruta `/menu` (`app/menu/page.tsx`, ~771 líneas) es la más completa del perfil Cliente.
Combina **catálogo**, **carrito**, **pedidos**, **seguimiento en tiempo real**, **likes** y
**asistente IA**.

### 9.1 El catálogo

- Carga los platillos con `GET /api/menu`. Cada `MenuItem` tiene: `id`, `name`, `description`,
  `price`, `category`, `imageUrl?`, `available`, `likes`.
- Se agrupan por `category` en desplegables (arrancan cerrados).
- Encima puede haber un **carrusel** de banners (`menu_carousel`), con auto-rotación cada
  **4000 ms**.

### 9.2 El carrito

- `addToCart(item)` agrega o incrementa la cantidad.
- `changeQty(itemId, delta)` ajusta cantidades; si llega a 0, elimina el ítem.
- `setItemNotes(itemId, notes)` permite **notas por platillo** (p. ej. "sin cebolla").
- `cartTotal` y `cartCount` se derivan del carrito.

### 9.3 Tipos de pedido y forma de pago

```ts
type OrderType = 'restaurante' | 'domicilio'
type PayMethod = 'stripe' | 'deposito'
```

| Tipo | Campos requeridos |
|------|-------------------|
| **En restaurante** (`restaurante`) | Nombre del cliente + número de mesa (opcional) |
| **A domicilio** (`domicilio`) | Nombre + dirección + forma de pago |

La condición `canSubmit` exige: hay `orderType`, hay `orderName`, y si es a domicilio, además
hay `orderAddress` y `payMethod`.

> **Stripe todavía NO cobra.** En el código, si el pago es `stripe`, el pedido se crea con la
> nota "Stripe (pendiente de cobro)". Hay un `TODO` explícito para integrar el checkout real de
> Stripe antes de crear el pedido. Hoy `deposito` y `stripe` solo se registran como texto.

### 9.4 Cómo se guarda el pedido

La tabla de pedidos no tiene columnas para tipo/domicilio/pago, así que la función
`buildOrderNotes()` **codifica esa información en el campo `notes`**:

```
🛵 A domicilio
Domicilio: Av. Camelinas 123
Pago: Stripe (pendiente de cobro)
```

El envío es `POST /api/orders`:

```json
{
  "customerName": "María González",
  "tableNumber": "5",
  "items": [
    { "menuItemId": "abc123", "name": "Salmón Bowl", "quantity": 2, "price": 180, "notes": "sin aguacate" }
  ],
  "total": 360,
  "notes": "🍽 En restaurante"
}
```

Al recibir el pedido (`res.ok`), la UI:
1. Guarda `order.id` en `my_order_ids` (localStorage).
2. Inicia el polling de seguimiento.
3. Limpia el carrito y muestra "pedido enviado" por 5 s.

### 9.5 Pantalla del menú (ASCII conceptual)

```
┌─────────────────────────────────────┐
│ [logo]                       🛒 (3)  │
│ ╔═════ carrusel de banners ═════╗    │
│ ╚═══════════════════════════════╝    │
│ ▸ Entradas                          │
│ ▾ Platos fuertes                    │
│    ┌──────────────────────────────┐ │
│    │ Salmón Bowl          $180  ❤12│ │
│    │ (foto)  [ descripción ... ]  │ │
│    │ [ notas ]         [ + Añadir ]│ │
│    └──────────────────────────────┘ │
│ ▸ Postres                           │
│                                     │
│                          ✨ (IA)    │  ← botón flotante asistente
│ ┌───── CustomerNav ─────┐           │
│ │  Menú   Reseñas  Tarjeta│         │
│ └─────────────────────────┘         │
└─────────────────────────────────────┘
```

---

## 10. Seguimiento de pedido en tiempo real

Una vez enviado, el cliente ve su pedido actualizándose mediante **polling** (no websockets).

### 10.1 Estados del pedido

```
pending → preparing → ready → delivered
```

Definidos en `STATUS_MSG` (mensajes que ve el cliente):

| Estado | Texto | Subtexto | Emoji |
|--------|-------|----------|-------|
| `pending` | Pedido recibido | En espera de preparación | ⏳ |
| `preparing` | ¡Lo están preparando! | Tu pedido está en cocina | 🍳 |
| `ready` | ¡Tu pedido está listo! | Pasa a recogerlo | (imagen) |
| `delivered` | Pedido entregado | ¡Buen provecho! | 🎉 |

Y una barra de progreso de 4 pasos (`STATUS_STEPS`): Recibido → Preparando → Listo → Entregado.

### 10.2 Mecánica de polling

Constantes reales:

| Constante | Valor | Significado |
|-----------|-------|-------------|
| `ORDER_POLL_MS` | `5000` | Consulta `GET /api/orders` cada 5 segundos. |
| `DELIVERED_VISIBLE_MS` | `30000` | Un pedido entregado permanece visible 30 s y luego se borra. |

Comportamiento clave:

- El polling **se pausa cuando la pestaña está oculta** (`document.hidden` /
  `visibilitychange`), para ahorrar batería y datos.
- `pollMyOrders()` trae todos los pedidos y filtra los del cliente por `my_order_ids`.
- Cuando un pedido llega a `delivered`, se programa su limpieza: tras 30 s se elimina de
  `my_order_ids` y de la vista. Se usa un `Set` (`deliveredCleanupRef`) para no duplicar
  temporizadores.
- Cuando ya no quedan pedidos activos, el polling se detiene automáticamente.

### 10.3 Diagrama del ciclo de seguimiento

```
   submitOrder() OK
        │
        ▼
  guarda id en my_order_ids ──► startOrderPolling()
        │                              │ cada 5 s (si pestaña visible)
        ▼                              ▼
   ⏳ pending ──► 🍳 preparing ──► ✅ ready ──► 🎉 delivered
                                                    │
                                          espera 30 s (DELIVERED_VISIBLE_MS)
                                                    │
                                                    ▼
                                       se borra de my_order_ids y de la vista
                                       (si no quedan activos → stopOrderPolling)
```

---

## 11. Asistente de IA — rol customer

Dentro de `/menu`, el cliente cuenta con un **asistente de IA** (componente `AIChat.tsx`,
botón flotante ✨) que ayuda a decidir qué pedir.

### 11.1 Configuración del rol `customer`

Del objeto `CFG` en `AIChat.tsx`:

| Propiedad | Valor (rol customer) |
|-----------|----------------------|
| Título | `Asistente` |
| Icono | `✨` |
| Color de acento | `#ec4899` |
| Placeholder | `¿Qué se te antoja hoy?` |
| Saludo | "¡Hola! Puedo recomendarte platillos, darte el estado de tu pedido o el tiempo estimado. Toca 🎤 para hablar." |

### 11.2 Qué puede y qué no puede hacer

**Puede:**
- **Recomendar platillos** según lo que el cliente pida (p. ej. "algo picante y económico").
  Máximo **4 platillos** por respuesta, mencionando el nombre **exactamente** como aparece en
  el menú (mismas mayúsculas y tildes).
- **Agregar un platillo al carrito** desde su recomendación: dispara el `CustomEvent`
  `ai-add-to-cart`, que `/menu` escucha y ejecuta `addToCart(item)`.
- Responder preguntas generales sobre el menú.
- Funcionar por **voz** vía `SpeechRecognition` / `webkitSpeechRecognition` (Web Speech API).

**No puede:**
- Consultar la base de datos. Para el rol customer, el servidor **no** hace llamadas a Supabase
  (ni siquiera para el nombre del restaurante), para no exceder el timeout de Vercel.
- Ver pedidos, ventas, inventario o datos de otros clientes (eso es exclusivo de los roles con
  sesión: cook, staff, employee, admin, resta3, recipe).

### 11.3 Detalle técnico del endpoint `/api/ai/chat`

| Aspecto | Valor (customer) | Valor (otros roles) |
|---------|------------------|---------------------|
| Requiere sesión | **No** (público) | Sí (`admin_session`, `employee_session` o `resta3_session`) |
| Modelo (Groq) | `llama-3.1-8b-instant` (rápido) | `llama-3.3-70b-versatile` |
| `max_tokens` | `200` | `600` |
| Timeout de Groq | `25000 ms` | `20000 ms` |
| Fuente de datos | `menuContext` enviado por el cliente | Consultas a Supabase |
| `temperature` | `0.65` | `0.65` |

El cliente envía hasta **40 platillos** en `menuContext` (`menuItems.slice(0, 40)`). El sistema
arma el prompt directamente con ese texto, sin tocar la BD:

```json
{
  "role": "customer",
  "messages": [{ "role": "user", "content": "algo ligero y no muy caro" }],
  "menuContext": [
    { "id": "abc", "name": "Salmón Bowl", "price": 180, "category": "Platos fuertes", "description": "..." }
  ]
}
```

### 11.4 Manejo de errores del asistente

El endpoint responde con `streamText()` (texto plano en streaming) incluso ante fallos, para
que el cliente siempre vea un mensaje legible:

| Situación | Mensaje al cliente |
|-----------|--------------------|
| Falta `GROQ_API_KEY` | "El asistente IA no está configurado en este servidor. Contacta al administrador." |
| Sin sesión (rol no-customer) | "Sesión no válida. Inicia sesión para usar el asistente." |
| Timeout de Groq | "El asistente tardó demasiado. Intenta de nuevo en un momento." |
| HTTP 429 (límite) | "El asistente alcanzó su límite de uso. Intenta en unos minutos." |
| HTTP 401 (clave inválida) | "La clave de IA no es válida. Verifica GROQ_API_KEY en Vercel…" |

> **Nota de seguridad (2026-07-06):** el rol `customer` es el **único** que no exige sesión en
> `/api/ai/chat`. Es público a propósito, para que cualquier comensal lo use sin registrarse.

---

## 12. Reseñas — formulario, moderación, publicación

La ruta `/review` (`app/review/page.tsx`) combina en una sola pantalla el **feed de reseñas
publicadas** y el **formulario** para dejar una nueva.

### 12.1 El formulario

Campos y validaciones (`submitReview`):

| Campo | Validación | Mensaje de error |
|-------|-----------|------------------|
| `rating` (1–5 estrellas) | > 0 | `Selecciona una calificación.` |
| `customerName` | no vacío | `El nombre es obligatorio.` |
| `comment` | no vacío | `El comentario es obligatorio.` |

El selector de estrellas (`StarPicker`) muestra una etiqueta según el valor:

| Estrellas | Etiqueta (`RATING_LABELS`) | Color |
|-----------|----------------------------|-------|
| 1 | Muy malo | rojo |
| 2 | Malo | naranja |
| 3 | Regular | amarillo |
| 4 | Bueno | verde |
| 5 | Excelente | esmeralda |

### 12.2 Lógica de moderación automática

El envío es `POST /api/reviews` (público). En el servidor, `createReview()` marca la reseña
como `bad` según el rating, y:

| Rating | Acción |
|--------|--------|
| **4 – 5 estrellas** | Se **publica automáticamente** (aparece en el feed público). |
| **1 – 3 estrellas** | Se marca **negativa**, **no se publica**, y **dispara un email de alerta** (`sendBadReviewEmail`) de forma asíncrona (no bloquea la respuesta). |

El feed público (`GET /api/reviews`) solo devuelve las **publicadas** (`getPublishedReviews`,
rating ≥ 4). El admin puede ver **todas** con `GET /api/reviews?all=1` (requiere sesión).

### 12.3 Por qué este diseño

Esta lógica **protege la reputación pública** del restaurante (las reseñas negativas no se
muestran) y al mismo tiempo **alerta al negocio de inmediato** para atender en privado una mala
experiencia. Es un patrón de "recuperación de servicio": convertir una queja en oportunidad
antes de que se haga pública en otras plataformas.

### 12.4 Pantalla de reseñas (ASCII)

```
┌─────────────────────────────────────┐
│ [logo]  Reseñas                     │
├─────────────────────────────────────┤
│  4.6   ★★★★★  ·  128 reseñas         │  ← promedio
├─────────────────────────────────────┤
│  Deja tu reseña                     │
│  Calificación: ★ ★ ★ ★ ★  (Excelente)│
│  Tu nombre:  [ María González     ] │
│  Comentario: [ ...                ] │
│  [        ★ Enviar reseña         ] │
├─────────────────────────────────────┤
│  Lo que dicen nuestros clientes     │
│  (M) María G.  ★★★★★   07/07/2026   │
│      "Excelente servicio..."         │
│  (J) Juan P.   ★★★★☆   06/07/2026   │
│      "Muy rico el café."             │
└─────────────────────────────────────┘
```

---

## 13. Recetario público

El recetario funcional vive en `/resetas` (`app/resetas/page.tsx`), con branding completo. La
ruta `/recetas` es solo un **placeholder "Próximamente"**.

| Aspecto | Detalle |
|---------|---------|
| Ruta activa | `/resetas` |
| Ruta placeholder | `/recetas` ("Próximamente") |
| Acceso | Público, sin sesión |
| Personalización | `recetario_logo`, `recetario_color` (ver sección 20) |

**Uso:** compartir recetas caseras, tips o preparaciones representativas del restaurante como
contenido de marketing y fidelización.

---

## 14. Club de cumpleaños

La ruta `/cumpleanos` (`app/cumpleanos/page.tsx`) es una experiencia de registro **celebratoria**
para captar la fecha de cumpleaños del cliente y enviarle promociones en su día.

### 14.1 El formulario

Campos: **nombre** (`name`), **WhatsApp** (`phone`), **fecha de nacimiento** (`birthdate`),
y aceptación de **términos y política de privacidad** (modales con texto legal completo).

Validaciones (`handleSubmit`):

| Situación | Mensaje |
|-----------|---------|
| Campos incompletos | `Por favor completa todos los campos.` |
| Sin aceptar términos | `Debes aceptar los términos y condiciones.` |

Envío: `POST /api/cumpleanos`:

```json
{ "name": "María González", "phone": "55 1234 5678", "birthdate": "1995-07-08" }
```

Respuestas: `201` (registrado), `400` (`{ "error": "Campos requeridos" }`), `500` (error
interno con mensaje). Tras el éxito se guarda `cumpleanos_data` en localStorage, de modo que al
regresar la página muestra directamente la pantalla de éxito.

### 14.2 Detección de cumpleaños "hoy"

La función `isBirthdayToday(birthdate)` compara mes y día con la fecha actual. Según el
resultado, la pantalla de éxito tiene **dos variantes**:

- **Éxito normal:** "¡Ya eres parte del club!" con confeti moderado (120 partículas).
- **Cumpleaños hoy:** despliegue máximo — confeti (220 partículas), fuegos artificiales, globos
  flotantes, destellos, un pastel SVG animado con velas parpadeantes, y **reproduce "Las
  Mañanitas"** sintetizadas con la Web Audio API (`playManianitas`, osciladores tipo `sine`).

```
┌───────────────────────────────────────┐
│   ✦ ¡Hoy es tu día! ✦                 │
│   🎂 F e l i z   C u m p l e a ñ o s   │  ← letras animadas
│              María 🎉                  │
│           🎂 (pastel SVG)              │
│      🎵 Escuchar las Mañanitas         │
│   📲 Reclamar mi regalo por WhatsApp   │
│         ⭐ 🎊 🎁 🎈 🎉                  │
└───────────────────────────────────────┘
   (confeti + fuegos + globos + destellos)
```

### 14.3 Dónde lo consume el restaurante

El admin ve los registros con `GET /api/cumpleanos` (requiere `admin_session`) y los usa para
campañas de cumpleaños vía WhatsApp.

---

## 15. Activación por WhatsApp

Además de la activación presencial por un empleado, existe un flujo de **activación por enlace
de WhatsApp**, que opera sobre el sistema `customers` (no `loyalty_cards`).

### 15.1 Formato del enlace

```
https://wa.me/[BUSINESS_WA]?text=...  → el negocio envía un enlace del tipo:
https://[dominio]/activate?id=[UUID]
```

- `[BUSINESS_WA]` = número de WhatsApp del negocio.
- `[UUID]` = identificador del cliente en la tabla `customers`.

### 15.2 Qué hace `/activate`

El componente `ActivateClient.tsx`:

1. Lee `?id=` de la URL con `useSearchParams()` (envuelto en `<Suspense>`, requisito de
   Next.js 16).
2. Llama `PATCH /api/customers/{id}` con `{ action: 'confirm' }`.
3. Si responde OK: mueve el ID en localStorage de `loyalty_pending_id` a `loyalty_id`, muestra
   "🎉 ¡Tarjeta activada, [nombre]!" y **redirige a `/` tras 3 segundos**.
4. Si falla o no hay `id`: muestra "❌ Link inválido — Este link puede haber expirado o ya fue
   usado."

```
   /activate?id=UUID
        │
        ▼
   PATCH /api/customers/{id} {action:'confirm'}
        │
   ┌────┴─────────────┐
   │ OK               │ Error / sin id
   ▼                  ▼
 ☕ "Activando..."   ❌ "Link inválido"
 🎉 "¡Activada!"
   │ (3 s)
   ▼
   redirige a /
```

---

## 16. Likes y engagement

Cada platillo del menú tiene un botón **"me encanta" (❤)**.

| Aspecto | Detalle |
|---------|---------|
| Dónde | Cada platillo dentro de `/menu` |
| Endpoint | `POST /api/menu/[id]/like` |
| Requiere sesión | No (público) |
| Anti-doble-voto | Un solo voto por platillo por dispositivo (clave `favorites` en localStorage) |
| UX | **Actualización optimista**: el contador sube en pantalla al instante y luego se confirma en el servidor |

Lógica (`likeItem`): si el `item.id` ya está en `favorites`, no hace nada. Si no, lo agrega a
`favorites`, incrementa el contador en pantalla y hace el `POST`. Si el `POST` falla, el error
se ignora silenciosamente (`.catch(() => {})`) para no molestar al cliente.

Los likes sirven al restaurante como **señal de popularidad** de sus platillos.

---

## 17. Cuenta de cliente multi-dispositivo

Como el estado normalmente vive solo en `localStorage`, el cliente puede crear una **Cuenta de
cliente** con contraseña desde `/card/usuario`, para recuperar su tarjeta desde cualquier
dispositivo. Este flujo usa la tabla `customers` (no `loyalty_cards`).

### 17.1 Registro y login

La página tiene un conmutador **Entrar / Crear cuenta** (`Mode = 'login' | 'register'`). El
envío va a `POST /api/customer-auth`:

```json
{ "action": "register", "name": "María González", "password": "secreta", "phone": "55...", "age": 30 }
```

| `action` | Campos | Resultado |
|----------|--------|-----------|
| `register` | nombre + contraseña (+ teléfono, fecha opcional) | Crea la cuenta. `201`. Si el nombre ya existe: `409 { "error": "Ese nombre ya está registrado" }` |
| `login` | nombre + contraseña | Autentica. `200`. Si falla: `401 { "error": "Nombre o contraseña incorrectos" }` |

Validación común: si falta nombre o contraseña → `400 { "error": "Nombre y contraseña requeridos" }`.

Tras éxito, guarda el `customer.id` en `loyalty_account_id` y muestra la tarjeta de socio.

### 17.2 Cómo se cifra la contraseña

En `lib/db.ts`, `hashPassword()` usa:

```
SHA-256( "customer:" + name.toLowerCase() + ":" + password )
```

El prefijo `customer:` separa el espacio de hashes de clientes del de admins/empleados. La
contraseña **nunca** se guarda en texto plano; solo se almacena `password_hash` en la tabla
`customers`. El endpoint es **stateless**: no usa cookies; el cliente conserva su objeto en
`localStorage`.

### 17.3 La tarjeta de socio

A diferencia de la tarjeta de sellos, la tarjeta de socio muestra datos del titular:

- **Frente:** nombre, N.º de socio (primeros 8 caracteres del UUID en mayúsculas), "Miembro
  desde" (mes/año), teléfono, edad, y "Visitas acumuladas".
- **Reverso:** QR con el `customer.id` + "Muestra este QR al empleado para sumar tu visita".

```
┌─────────────────────────────────────┐
│ [logo]                        NICHO  │
│ TARJETA DE SOCIO                    │
│ María González                      │
│ N.º DE SOCIO      MIEMBRO DESDE      │
│ A1B2C3D4          jul 2026           │
│ TELÉFONO          EDAD               │
│ 55 1234 5678      30 años            │
│ ┌─────────────────────────────────┐ │
│ │ VISITAS ACUMULADAS          12  │ │
│ └─────────────────────────────────┘ │
│        Toca para ver tu código ↻    │
└─────────────────────────────────────┘
```

El botón "Cerrar sesión" borra `loyalty_account_id` y vuelve a la pantalla de acceso.

---

## 18. CustomerNav — barra de navegación

El componente `app/components/CustomerNav.tsx` renderiza la **barra inferior fija** por la que
el cliente se mueve entre secciones. Es totalmente configurable por el restaurante.

### 18.1 Configuración JSON (`customer_nav` en `settings`)

```json
{
  "bg": "#0d0d0d",
  "border": "#1a1a1a",
  "accent": "#B90F45",
  "inactive": "#6b7280",
  "radius": 9999,
  "showLogout": false,
  "tabs": [
    { "id": "menu",   "label": "Menú",    "href": "/menu",   "icon": "" },
    { "id": "review", "label": "Reseñas", "href": "/review", "icon": "" },
    { "id": "card",   "label": "Tarjeta", "href": "/card",   "icon": "" }
  ]
}
```

### 18.2 Propiedades

| Propiedad | Tipo | Función | Default (`DEFAULT_NAV`) |
|-----------|------|---------|--------------------------|
| `bg` | color | Fondo de la barra | `#0d0d0d` |
| `border` | color | Borde de la barra | `#1a1a1a` |
| `accent` | color | Pestaña activa / acento | `#B90F45` |
| `inactive` | color | Pestañas inactivas | `#6b7280` |
| `radius` | número | Radio de esquinas (`9999` = píldora) | `9999` |
| `showLogout` | bool | Muestra botón "Salir" | `false` |
| `tabs[]` | arreglo | Pestañas: `id`, `label`, `href`, `icon` | menú/reseñas/tarjeta |

Sobre los iconos: si `icon` está vacío, se usa el **icono integrado** (`BUILTIN_ICONS`) según el
`id` (`menu`, `review`, `card`, `logout`). Si `icon` tiene una URL, se muestra esa imagen.

### 18.3 Migración de configuración antigua

`normalizeNavConfig()` acepta tanto la config nueva (con `tabs`) como la antigua (con `labels`)
y normaliza colores, radio y pestañas sin romper instalaciones existentes. Si algo falta, cae
al `DEFAULT_NAV`.

### 18.4 Logout desde la barra

Si `showLogout` es `true`, aparece "Salir". Al tocarlo:

```
localStorage.removeItem('registro_card_id')
localStorage.removeItem('loyalty_pending_id')
window.location.href = '/registro'
```

### 18.5 Interacción con permisos

Cada pestaña con `id` conocido está atada a un módulo de usuario (`TAB_USER_MODULE`):

| `tab.id` | Módulo requerido |
|----------|------------------|
| `menu` | `usr_menu` |
| `review` | `usr_resenas` |
| `card` | `usr_tarjeta` |

Al montar, `CustomerNav` hace `GET /api/permissions` y lee `d.user`. Si el permiso está en
`false` (`userPerms[module] === false`), la pestaña **no se renderiza** (`return null`). Las
pestañas sin módulo asociado siempre se muestran.

---

## 19. Permisos del cliente

El **Super Admin de NICHO** controla qué secciones ve el cliente mediante los **permisos de
usuario** (`user_permissions`), guardados en la tabla `settings`.

### 19.1 El endpoint `GET /api/permissions`

Devuelve permisos de empleado y de usuario en una sola llamada, con cabeceras anti-caché:

```json
{
  "employee": { "...": "permisos del empleado" },
  "user":     { "usr_menu": true, "usr_resenas": true, "usr_tarjeta": true }
}
```

El perfil Cliente usa la sección `user`.

### 19.2 Lógica de fallback por restaurante

`getPerms(baseKey)` busca primero la clave específica del restaurante y luego la global:

```
keys = [ `${baseKey}_${RESTAURANT_ID}`, baseKey ]
→ usa la primera que exista en settings.
```

Es la misma estrategia que usan los feature flags. Así, un restaurante puede tener permisos
propios sin afectar a los demás.

### 19.3 Permisos disponibles para el cliente

| Permiso | Efecto |
|---------|--------|
| `usr_menu` | Muestra u oculta la pestaña **Menú**. |
| `usr_resenas` | Muestra u oculta la pestaña **Reseñas**. |
| `usr_tarjeta` | Muestra u oculta la pestaña **Tarjeta**. |

Con esto, cada restaurante decide la experiencia: por ejemplo, uno que solo quiere lealtad puede
dejar visible únicamente **Tarjeta**.

---

## 20. Personalización visual

Toda la apariencia del perfil Cliente se lee de la tabla `settings` (endpoint
`GET /api/settings?key=...`). Así el cliente ve la marca del restaurante.

### 20.1 Ajustes del menú (`/menu`)

| Clave | Función | Valor por defecto |
|-------|---------|-------------------|
| `menu_logo` | Logo en el menú | *(vacío → usa `/logo.png`)* |
| `menu_bg_color` | Color de fondo | `#0d0d0d` (base oscura) |
| `menu_btn_color` | Color de botones | `#B90F45` |
| `menu_hover_color` | Color al pasar/oprimir | `#DC5E86` |
| `menu_carousel` | JSON de banners `[{ imageUrl, linkUrl }]` | *(vacío)* |

### 20.2 Ajustes de la tarjeta (`reward_categories`)

Ver sección 7.4 para el JSON completo. Controla `goal`, `reward`, `color`, `icon`, `image`,
`brandText`, `brandLogo`, `validityMonths`.

### 20.3 Ajustes del registro (`/registro`)

| Clave | Función | Valor por defecto |
|-------|---------|-------------------|
| `registro_titulo` | Título de la tarjeta de bienvenida | `¡Bienvenido!` |
| `registro_subtitulo` | Subtítulo | `Completa tus datos para registrarte. La información será guardada de forma segura.` |

### 20.4 Ajustes del recetario (`/resetas`)

| Clave | Función |
|-------|---------|
| `recetario_logo` | Logo del recetario |
| `recetario_color` | Color principal |

### 20.5 Ajuste de la navegación

| Clave | Función |
|-------|---------|
| `customer_nav` | JSON de la barra inferior (sección 18) |

### 20.6 Sobre los colores de marca

- El color base de NICHO es **`#B90F45`** (rosa/guinda). Su hover es `#DC5E86`.
- Los restaurantes de **portales** usan `#E8912A` (naranja). Cada restaurante puede sobrescribir
  colores con los suyos desde `settings`.

---

## 21. Seguridad y privacidad

### 21.1 Qué es público y qué no

| Función | ¿Requiere sesión? |
|---------|-------------------|
| Menú (`/menu`, `GET /api/menu`) | No |
| Crear tarjeta de sellos (`POST /api/loyalty`) | No |
| Sellar/canjear/activar tarjeta (`PATCH /api/loyalty/[id]`) | **Sí** (admin) |
| Ver todas las tarjetas (`GET /api/loyalty`) | **Sí** (admin) |
| Asistente IA rol `customer` (`POST /api/ai/chat`) | **No** (público por diseño) |
| Likes (`POST /api/menu/[id]/like`) | No |
| Enviar reseña (`POST /api/reviews`) | No |
| Ver todas las reseñas (`GET /api/reviews?all=1`) | **Sí** (admin) |
| Recetario (`/resetas`) | No |
| Cumpleaños: registrar (`POST /api/cumpleanos`) | No |
| Cumpleaños: listar (`GET /api/cumpleanos`) | **Sí** (admin) |
| Cuenta de cliente (`POST /api/customer-auth`) | Contraseña (SHA-256) |
| Activar por WhatsApp (`PATCH /api/customers/[id]`) | No (basta el UUID del enlace) |

### 21.2 Puntos clave de seguridad

- **Contraseñas cifradas:** la cuenta de cliente guarda `SHA-256("customer:" + nombre + ":" +
  contraseña)`. Nunca texto plano.
- **Endpoints de escritura de lealtad protegidos:** sellar, canjear, activar, desactivar y
  eliminar tarjetas requieren `admin_session`. El cliente solo puede **crear/buscar** su tarjeta.
- **Asistente IA público a propósito:** el rol `customer` no exige sesión; el resto sí.
- **Voz requiere HTTPS:** la Web Speech API solo funciona sobre conexiones seguras.
- **Datos mínimos:** el registro pide lo indispensable (nombre, WhatsApp, fecha de nacimiento).
- **Consentimiento explícito:** registro y cumpleaños requieren aceptar términos y política de
  privacidad, con el texto legal disponible en modales.

### 21.3 Riesgos y limitaciones conocidas

- **Estado local frágil:** al depender de `localStorage`, la referencia a la tarjeta se pierde
  si el cliente borra datos o cambia de dispositivo. Mitigación: Cuenta de cliente.
- **Activación por UUID sin segundo factor:** cualquiera con el enlace `/activate?id=UUID` puede
  confirmar esa cuenta. El UUID actúa como secreto; conviene no exponerlo públicamente.
- **SHA-256 sin sal por usuario ni "stretching":** la contraseña se hashea con SHA-256 simple
  (namespaced por nombre). Es adecuado para el nivel de riesgo del perfil cliente, pero no es
  bcrypt/argon2; a considerar si el perfil llegara a manejar datos sensibles.

---

## 22. Tabla de endpoints del cliente

| Método | Endpoint | Público | Propósito | Body / Params clave |
|--------|----------|:-------:|-----------|---------------------|
| `POST` | `/api/loyalty` | ✅ | Crear/encontrar tarjeta de sellos | `{ name, phone, cardType }` → `201` nueva / `200` existente |
| `GET` | `/api/loyalty` | ❌ admin | Listar todas las tarjetas | — |
| `GET` | `/api/loyalty/[id]` | ✅ | Consultar una tarjeta (polling de activación) | `id` |
| `PATCH` | `/api/loyalty/[id]` | ❌ admin | `stamp` / `redeem` / `activate` / `deactivate` | `{ action }` |
| `DELETE` | `/api/loyalty/[id]` | ❌ admin | Eliminar tarjeta | `id` |
| `POST` | `/api/customer-auth` | contraseña | Registro/login de cuenta de cliente | `{ action, name, password, phone?, age? }` |
| `PATCH` | `/api/customers/[id]` | ✅ | Confirmar/activar cuenta (WhatsApp) | `{ action: 'confirm' }` |
| `GET` | `/api/menu` | ✅ | Catálogo de platillos | — |
| `POST` | `/api/menu/[id]/like` | ✅ | Dar "me encanta" a un platillo | — |
| `POST` | `/api/orders` | ✅ | Crear un pedido | `{ customerName, tableNumber?, items[], total, notes? }` |
| `GET` | `/api/orders` | ✅ | Listar pedidos (para filtrar los propios por `my_order_ids`) | — |
| `POST` | `/api/reviews` | ✅ | Enviar una reseña | `{ customerName, rating, comment }` |
| `GET` | `/api/reviews` | ✅ | Feed público (publicadas); `?all=1` = todas (admin) | `?all=1` |
| `POST` | `/api/cumpleanos` | ✅ | Registrar cumpleaños | `{ name, phone, birthdate }` |
| `GET` | `/api/cumpleanos` | ❌ admin | Listar cumpleaños | — |
| `POST` | `/api/ai/chat` | ✅ (customer) | Asistente IA | `{ role:'customer', messages[], menuContext[] }` |
| `GET` | `/api/permissions` | ✅ | Permisos de empleado y usuario | — |
| `GET` | `/api/settings?key=...` | ✅ | Leer un ajuste de personalización | `?key=` |

---

## 23. Preguntas frecuentes extendidas

**1. ¿Necesito descargar una app?**
No. Todo funciona desde el navegador del teléfono, mediante enlaces y códigos QR.

**2. ¿Cómo me inscribo al programa de lealtad?**
Entra a `/registro` (o `/loyalty`), llena nombre, WhatsApp, fecha de nacimiento y acepta los
términos. También puedes usar el mini-formulario de `/card` (solo nombre + teléfono).

**3. ¿Cuántos sellos necesito para la recompensa?**
Por defecto **5 visitas = café gratis ☕**. El restaurante puede cambiar la meta (`goal`) y la
recompensa (`reward`) desde su panel, aunque el servidor sella hasta un máximo de 5.

**4. ¿Por qué mi tarjeta dice "Registro recibido / pendiente"?**
Porque un empleado aún no la ha activado. Es una validación de que eres un cliente real. La
página se actualiza sola cada 5 segundos y saltará a tu tarjeta cuando la activen.

**5. ¿Cómo me sellan una visita?**
Abre `/card`, toca la tarjeta para girarla y muestra tu QR personal. El empleado lo escanea y
suma un sello. Cada escaneo válido = +1 sello.

**6. ¿Qué pasa cuando lleno todos los sellos?**
Al llegar a la meta, la tarjeta muestra "🎉 ¡Café gratis!". El empleado canjea (acción
`redeem`) y tu contador vuelve a 0 para empezar de nuevo.

**7. ¿Mi tarjeta expira?**
Tiene una vigencia (por defecto 3 meses), pero **se renueva cada vez que te sellan**. Si vienes
seguido, en la práctica no expira.

**8. Cambié de teléfono y ya no veo mi tarjeta. ¿Qué hago?**
El estado de la tarjeta de sellos vive en tu navegador. Para no perderlo, crea una **Cuenta de
cliente** en `/card/usuario` con nombre y contraseña; así podrás entrar desde cualquier
dispositivo.

**9. ¿Cuál es la diferencia entre `/card` y `/card/usuario`?**
`/card` es la tarjeta de **sellos** (se recupera por este dispositivo). `/card/usuario` es una
**cuenta con contraseña** (tarjeta de socio, recuperable en cualquier dispositivo).

**10. ¿Puedo pedir a domicilio?**
Sí. En `/menu` elige "a domicilio" e ingresa nombre, dirección y forma de pago (Stripe o
depósito).

**11. ¿Ya puedo pagar con tarjeta por Stripe?**
Todavía no se cobra automáticamente. Hoy el pago con Stripe se registra como "pendiente de
cobro"; la integración de cobro real está pendiente.

**12. ¿Puedo agregar notas a un platillo?**
Sí, cada platillo del carrito permite notas (p. ej. "sin cebolla", "término medio").

**13. ¿Cómo sé en qué va mi pedido?**
El estado se actualiza cada 5 segundos: `pending → preparing → ready → delivered`. Cuando se
entrega, permanece 30 segundos y luego desaparece de la vista.

**14. ¿Por qué mi pedido dejó de actualizarse?**
El seguimiento se pausa cuando dejas la pestaña en segundo plano (para ahorrar batería). Al
volver a la pestaña, se reanuda solo.

**15. ¿El asistente de IA necesita que inicie sesión?**
No. Es público. Puedes pedirle recomendaciones (máximo 4 platillos), agregar uno al carrito con
un toque y hablarle por voz (🎤, requiere HTTPS).

**16. ¿El asistente conoce mis pedidos anteriores?**
No. En rol cliente solo conoce el menú que le envía tu pantalla; no consulta la base de datos ni
ve tu historial.

**17. Dejé una reseña de 5 estrellas, ¿se publica?**
Sí. Las reseñas de 4 y 5 estrellas se publican automáticamente. Las de 1 a 3 estrellas no se
publican: en su lugar, alertan al restaurante por correo para atender tu caso.

**18. ¿Puedo dar "me encanta" sin cuenta?**
Sí, el botón ❤ es público. Solo puedes votar una vez por platillo desde el mismo dispositivo.

**19. ¿Puedo registrar mi cumpleaños?**
Sí, en `/cumpleanos`. Si te registras el mismo día de tu cumpleaños, verás pastel, confeti,
globos y hasta "Las Mañanitas". El restaurante te contactará por WhatsApp para tu regalo.

**20. ¿Dónde veo el recetario?**
En `/resetas`. La ruta `/recetas` es solo un aviso "Próximamente".

**21. ¿Qué es el código QR de mi tarjeta exactamente?**
Es tu identificador único (UUID). No contiene tu nombre ni tu teléfono; solo sirve para que el
empleado identifique tu tarjeta al sellar.

**22. ¿Qué pasa si el enlace de activación de WhatsApp dice "Link inválido"?**
Ese enlace pudo expirar o ya fue usado. Pide uno nuevo al negocio.

**23. ¿El restaurante puede ocultar secciones?**
Sí. Desde el Super Admin se controlan `usr_menu`, `usr_resenas` y `usr_tarjeta`. Si un módulo
está apagado, su pestaña no aparece en la barra inferior.

**24. ¿Mis datos están seguros?**
Se piden datos mínimos, la contraseña (si creas cuenta) se guarda cifrada, y aceptas términos y
privacidad antes de registrarte. Aun así, ten en cuenta que el enlace de activación por UUID no
debe compartirse públicamente.

---

## 24. Diagrama ASCII del flujo completo

```
┌───────────────────────────────────────────────────────────────────────┐
│                    FLUJO COMPLETO DEL CLIENTE — NICHO                   │
│                    (Programa de lealtad por sellos)                    │
└───────────────────────────────────────────────────────────────────────┘

   [ Cliente escanea QR del negocio ]  ó  [ abre enlace /registro | /card ]
                          │
                          ▼
                 ┌─────────────────┐    Lee localStorage: registro_card_id
                 │    checking      │
                 │  "Verificando"   │
                 └────────┬─────────┘
                          │
          ¿hay registro_card_id válido? ── Sí ─► GET /api/loyalty/{id}
                          │                          │
                          No                 ┌───────┴────────┐
                          │                  │ card.active?   │
                          ▼                  ▼                ▼
                 ┌─────────────────┐      'card'         'waiting'
                 │      form        │   (ya activa)     (pendiente)
                 │  Nombre          │
                 │  WhatsApp        │
                 │  Fecha nac. *    │
                 │  ☑ Términos *    │
                 └────────┬─────────┘
                          │  POST /api/loyalty { name, phone, age, cardType:'cafe' }
                          ▼
              ┌───────────────────────┐
              │  findOrCreate() por   │
              │  teléfono + cardType  │
              └───────┬───────────────┘
              201 nueva │  200 existente
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
   ┌─────────────┐              ┌─────────────┐
   │   active/   │              │   already   │
   │   waiting   │◄─ polling ─┐ │ (muestra    │
   │ "Pendiente" │   cada 5 s │ │  sellos)    │
   └──────┬──────┘            │ └─────────────┘
          │   El EMPLEADO/ADMIN activa:
          │   PATCH /api/loyalty/{id} {action:'activate'}
          │   (o el cliente usa /activate?id=UUID  → sistema customers)
          ▼
   ┌─────────────┐
   │    card      │  Tarjeta girable (flip 3D)
   └──────┬───────┘
          │
   ┌──────┴───────────────┐
   ▼                      ▼
 [ FRENTE ]         [ REVERSO: QR = customer.id ]
 sellos: visits/goal        │
                            ▼
          EMPLEADO escanea QR ► PATCH {action:'stamp'} ► +1 sello
                            │       (si active y visits < 5)
                            ▼
              ┌───────────────────────────────┐
              │  ¿visits >= goal (5)?          │
              └──────┬──────────────────┬──────┘
                 No  │              Sí  │
                     ▼                  ▼
              sigue acumulando   ┌──────────────┐
                                 │  RECOMPENSA  │
                                 │ {action:     │
                                 │  'redeem'}   │
                                 │ visits → 0   │
                                 └──────────────┘
                                        │
                                        ▼
                              (el ciclo se reinicia)

  ── Opcional en cualquier momento ──────────────────────────────────────
  /card/usuario → Cuenta de cliente (nombre + contraseña, SHA-256)
                  guarda loyalty_account_id → recuperable en otro dispositivo
  /menu         → catálogo, carrito, pedidos (polling 5 s), IA ✨, likes ❤
  /review       → reseña (4–5★ publica; 1–3★ alerta privada)
  /cumpleanos   → club de cumpleaños (🎂 confeti / mañanitas si es hoy)
  /resetas      → recetario público
```

---

## 25. Glosario de términos

| Término | Definición |
|---------|------------|
| **Cliente** | Comensal o público general; perfil documentado aquí. No es personal del restaurante. |
| **Tarjeta de sellos** | Tarjeta de lealtad clásica (`loyalty_cards`). Acumula `visits` hasta la meta. |
| **Cuenta de cliente** | Tarjeta de socio con contraseña (`customers`), recuperable multi-dispositivo. |
| **Sello / visita** | Cada consumo válido; incrementa `visits` en 1 (tope 5 en servidor). |
| **Meta (`goal`)** | Sellos necesarios para la recompensa (default 5). |
| **Canje (`redeem`)** | Acción que otorga la recompensa y reinicia `visits` a 0. |
| **Activación** | Un admin/empleado marca `active: true` una tarjeta pendiente. |
| **UUID** | Identificador único del titular; es lo que codifica el QR. |
| **Flujo A (QR)** | El negocio muestra el QR (URL) y el cliente lo escanea. |
| **Flujo B (QR)** | El cliente muestra su QR personal y el empleado lo escanea para sellar. |
| **Polling** | Consultas periódicas al servidor (cada 5 s) para actualizar estado sin recargar. |
| **localStorage** | Almacenamiento del navegador donde vive el estado del cliente. |
| **`registro_card_id`** | Clave de localStorage con el ID de la tarjeta de sellos. |
| **`my_order_ids`** | Clave de localStorage con los IDs de los pedidos activos. |
| **`favorites`** | Clave de localStorage con los platillos a los que el cliente dio like. |
| **`reward_categories`** | Ajuste (`settings`) que define diseño y mecánica de las tarjetas. |
| **`customer_nav`** | Ajuste (`settings`) con la configuración de la barra inferior. |
| **`user_permissions`** | Permisos de usuario (`usr_menu`, `usr_resenas`, `usr_tarjeta`). |
| **Moderación de reseñas** | Regla: 4–5★ se publican; 1–3★ se ocultan y alertan al negocio. |
| **`sendBadReviewEmail`** | Función que envía el correo de alerta ante una reseña negativa. |
| **CustomerNav** | Componente de la barra de navegación inferior del cliente. |
| **RESTA3** | Perfil de operación avanzada / punto de venta (no es cliente). |
| **Groq / Llama** | Proveedor y modelos de IA del asistente (`llama-3.1-8b-instant` para cliente). |
| **`menuContext`** | Lista de platillos (hasta 40) que el cliente envía al asistente de IA. |
| **Web Speech API** | API del navegador para dictado por voz del asistente (requiere HTTPS). |
| **Stripe (pendiente)** | Método de pago aún sin cobro automático integrado. |
| **NICHO** | La plataforma SaaS; color de marca `#B90F45`. |

---

*Documento generado el 2026-07-08 · Plataforma NICHO · Perfil: Usuario Cliente · Versión 2.0*
*Elaborado con verificación directa contra el código fuente de `mi-proyecto`.*
