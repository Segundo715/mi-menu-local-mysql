# Manual de Usuario — Plataforma NICHO

**Versión:** 2026-06-28
**Dirigido a:** Administradores de restaurante, empleados, personal RESTA3 y clientes
**Lenguaje:** Sin tecnicismos. Cada acción está explicada paso a paso.

---

## 1. Introducción

### ¿Qué es esta plataforma?

Es un sistema completo para administrar un restaurante desde cualquier dispositivo (computadora, tablet o celular). Con una sola plataforma puedes:

- Mostrar tu **menú digital** a los clientes (con fotos, precios y pedidos en línea).
- Recibir y dar seguimiento a **pedidos** en tiempo real.
- Manejar un programa de **tarjetas de lealtad** (sellos y recompensas).
- Administrar tu **caja, mesas, cocina e inventario** (panel RESTA3).
- Leer y publicar **reseñas** de clientes.
- Ver **estadísticas y reportes** de ventas.
- Mostrar contenido en **pantallas de televisión** dentro del local.
- Usar un **Asistente de Inteligencia Artificial** que conoce tus datos en tiempo real.

### ¿Quiénes la usan?

La plataforma tiene **cuatro perfiles** de usuario, cada uno con su propio acceso:

| Perfil | Para quién | Dónde entra |
|--------|-----------|-------------|
| **Administrador** | Dueño o gerente | `/admin/login` |
| **Empleado** | Mesero, cajero, cocinero | `/employee/login` |
| **RESTA3** | Personal de operación (TPV, mesas, cocina) | `/resta3/login` |
| **Cliente** | Comensal (público) | `/menu`, `/registro`, `/card`, `/review` |

> **Importante:** Las opciones que cada usuario ve dependen de los "módulos" que estén activados para tu restaurante. Si una opción no aparece, es porque está desactivada (se gestiona desde un panel central por el equipo de NICHO).

---

## 2. Panel de Administrador

### 2.1 Cómo iniciar sesión

1. Abre la dirección **`/admin/login`** en tu navegador.
2. Verás el logo del restaurante y el título **"Panel de administración"**.
3. Escribe tu **Nombre completo** (ej. "Carlos López").
4. Escribe tu **Contraseña**.
5. Pulsa el botón **"→ Entrar"**.

**Notas útiles:**
- La plataforma recuerda tu nombre para la próxima vez.
- Si te equivocas, verás un mensaje en rojo: *"Nombre o contraseña incorrectos"*.
- Tu sesión dura **24 horas**; después tendrás que volver a entrar.

### 2.2 El menú lateral (navegación)

A la izquierda hay una barra con todas las secciones. En el celular se abre tocando el icono de las tres rayas (☰) arriba a la izquierda.

**Truco:** puedes **arrastrar los enlaces** del menú para reordenarlos a tu gusto. El orden se guarda automáticamente en ese dispositivo.

Las secciones disponibles son:

- **Dashboard** (analíticas)
- **Marketing**
- **CRM** (gestión de clientes)
- **Reservaciones**
- **Ventas**
- **Menú Inteligente**
- **Recetario**
- **Operaciones**
- **Pantallas Digitales** (TV)
- **Fidelización** (tarjetas de lealtad)
- **Sellar visitas**
- **Tarjetas**
- **Reseñas**
- **Automatizaciones IA**
- **Producción** (inventario)
- **Analytics**
- **Reportes**
- **Cumpleaños**
- **Configuración**

Abajo del menú hay dos botones importantes:
- **Reportar problema** — envía un mensaje al equipo de soporte de NICHO.
- **Cerrar sesión**.

### 2.3 Dashboard (métricas principales)

Al entrar verás un resumen rápido del negocio. Las tarjetas de métricas muestran cosas como:

- **Pedidos de hoy** y ventas del día.
- **Pedidos activos** (los que aún no se han entregado).
- **Ventas de los últimos 7 días**.
- **Calificación promedio** de las reseñas.
- **Platillos más populares** (según los "me encanta" de los clientes).

Estos números se actualizan solos cuando recargas la página.

### 2.4 Menú Inteligente (agregar y editar platillos)

Entra a **Menú Inteligente** desde el menú lateral. Aquí gestionas todo lo que el cliente verá.

**Para agregar un platillo:**
1. Pulsa el botón de **agregar** (normalmente "+ Nuevo platillo").
2. Llena los campos:
   - **Nombre** del platillo.
   - **Descripción** (ingredientes, detalles).
   - **Precio**.
   - **Categoría** (ej. Entradas, Bebidas, Postres).
3. **Subir foto:** pulsa el área de imagen y elige una foto desde tu dispositivo. La foto se optimiza automáticamente para cargar rápido.
4. Marca si está **disponible** o no.
5. Guarda.

**Para editar un platillo:** pulsa sobre él, cambia lo que necesites y guarda.

**Para eliminar:** usa el botón de eliminar (icono de basura) en el platillo.

**Marcar como agotado:** desactiva la opción "disponible". El platillo aparecerá en gris con la etiqueta **(Agotado)** en el menú del cliente.

**Personalización del menú del cliente:** dentro de esta sección hay dos apartados extra:
- **Personalización del menú:** cambia el logo, color de fondo, color de los botones y un carrusel de imágenes promocionales.
- **Navegador del cliente:** configura los botones inferiores que ve el cliente (Menú, Reseñas, Tarjeta).

### 2.5 Recetario (crear recetas)

Entra a **Recetario**. Aquí guardas las recetas que usará la cocina y el Asistente IA.

**Para crear una receta:**
1. Pulsa **agregar receta**.
2. Escribe el **Nombre** y una **Descripción** breve.
3. Elige una **Categoría**.
4. Agrega los **Ingredientes** uno por uno.
5. Agrega los **Pasos** de preparación en orden.
6. Opcional: sube una **foto** de la receta.
7. Guarda.

> Las recetas alimentan al "Chef Asistente" de IA. Si las llenas bien, el asistente puede dictar los pasos a la cocina en voz alta.

### 2.6 Pedidos (ver y cambiar estados)

Cada pedido pasa por **cuatro etapas**:

1. **Pendiente** (recién recibido)
2. **Preparando** (en cocina)
3. **Listo** (para entregar/recoger)
4. **Entregado** (finalizado)

**Para cambiar el estado:** abre el pedido y avánzalo a la siguiente etapa. El cliente verá el cambio en tiempo real en su pantalla.

En la sección de pedidos también hay un apartado **"Lo más consumido"** que muestra los platillos que más se piden.

### 2.7 Clientes y Fidelización (tarjetas de lealtad)

El programa de lealtad funciona así: el cliente acumula **sellos por visita** y al llegar a **5 sellos** obtiene una recompensa (por ejemplo, un café gratis).

**Secciones relacionadas:**

- **Fidelización** (`/admin`): vista general de clientes y tarjetas.
- **Sellar visitas** (`/admin/sellar`): aquí registras visitas y activas tarjetas.
- **Tarjetas** (`/admin/tarjetas`): personalizas el diseño de la tarjeta (nombre, recompensa, número de sellos, colores, logo, imagen).

**Para sellar la visita de un cliente:**
1. Entra a **Sellar visitas**.
2. Puedes mostrar el **QR del negocio** para que el cliente lo escanee, o escanear el **QR del cliente**.
3. Al confirmar, se suma un sello a su tarjeta.

**Para activar una tarjeta nueva:**
- Cuando un cliente se registra, su tarjeta queda **pendiente de activación**.
- En **Sellar visitas** verás la lista **"Tarjetas por activar"**.
- Pulsa **activar**. El cliente verá su tarjeta activarse automáticamente en su celular.

**Reglas importantes:**
- Solo las tarjetas **activas** acumulan sellos.
- El máximo son **5 sellos**; al canjear la recompensa, vuelve a cero.

### 2.8 Reseñas (ver y moderar)

Entra a **Reseñas**. Aquí ves todas las calificaciones que dejan los clientes.

- Las reseñas con **4 o 5 estrellas** se publican automáticamente en la página pública.
- Las reseñas **bajas (3 estrellas o menos)** se marcan como negativas para que las revises.

Desde aquí puedes ver el detalle de cada opinión y la calificación promedio del restaurante.

### 2.9 Analytics y Reportes

- **Analytics / Dashboard:** gráficas de ventas, tendencias de los últimos 7 días y comparativas.
- **Reportes:** información más detallada para descargar o analizar (ventas, productos, periodos).

Estos números te ayudan a entender qué días vendes más, qué platillos son los favoritos y cómo evoluciona el negocio.

### 2.10 Pantallas Digitales (TV / señalización)

Entra a **Pantallas Digitales**. Sirve para mostrar promociones e información en televisiones dentro del local.

**Para programar contenido:**
1. Elige la **sucursal** y la **TV** que quieres configurar.
2. Pulsa **"Añade pantallas a la programación"**.
3. Sube las imágenes o slides que quieras mostrar.
4. Ordena los slides y marca cuáles son ofertas.

**Vista de pantalla completa:** cada TV tiene su propia dirección (`/admin/tv/pantalla/[id]`) que se abre a pantalla completa en el televisor. Si no hay contenido, muestra el mensaje *"No hay contenido programado"*.

### 2.11 Reservaciones y plano de mesas

Entra a **Reservaciones**.

**Para crear una reservación:**
1. Pulsa **"Nueva reservación"**.
2. Llena los datos del cliente, fecha, hora y número de personas.
3. Guarda.

El plano de mesas y su estado (libre, ocupada, reservada, limpieza) también se gestionan desde el panel RESTA3 (ver sección 4).

### 2.12 Cumpleaños

Entra a **Club de Cumpleaños**. Aquí ves los clientes que registraron su fecha de nacimiento, para enviarles promociones en su cumpleaños.

### 2.13 Configuración

Entra a **Configuración**. Es donde defines la identidad de tu restaurante.

**Identidad del restaurante:**
- **Nombre del restaurante** (aparece en el menú lateral del panel).
- **Dirección** y **Teléfono** (se imprimen en los tickets de pedido).
- **Subtítulo del panel** (ej. "Dirección General").
- **Logo de perfil** (súbelo desde tu dispositivo).
- **Color de acento** del panel (el color principal).

**Menú del cliente:**
- Logo que se muestra en el menú público.
- Color de fondo, color del botón principal y color de acento.
- **WhatsApp** del negocio (para contacto).

**Recetario público:** logo y color del recetario.

**Administración de perfiles:** desde aquí creas y eliminas:
- **Administradores** (otros gerentes con acceso al panel).
- **Empleados** (con su rol: Mesero, Cajero, etc.).
- **Usuarios RESTA3**.

**Para crear un perfil nuevo:** escribe el nombre de usuario, elige el rol y guarda. Para eliminar, usa el botón de eliminar junto al perfil.

---

## 3. Panel de Empleado

### 3.1 Cómo iniciar sesión

1. Abre **`/employee/login`**.
2. Verás el título **"Panel de empleados"**.
3. Escribe tu **Nombre completo** y tu **Contraseña**.
4. Pulsa **"→ Entrar"**.

### 3.2 Qué puede hacer un empleado

El empleado tiene una versión simplificada del panel. Según los permisos que le haya dado el administrador, puede acceder a:

- **Pedidos** (`/employee/orders`): ver pedidos y cambiar su estado.
- **Menú** (`/employee/menu`): consultar el menú.
- **Recetario** (`/employee/recipes`): ver las recetas paso a paso.
- **Clientes** (`/employee/customers`): consultar y sellar tarjetas de lealtad.
- **Pantalla TV** (`/employee/tv`): gestionar señalización.
- **Fidelización**: sellar visitas de clientes.

> Si una opción no aparece, es porque el administrador no le dio permiso a ese módulo. En ese caso el sistema te redirige automáticamente a una sección disponible.

---

## 4. Panel RESTA3 (operación del restaurante)

Es el panel de operación diaria: caja, mesas, cocina, domicilios e inventario. Tiene su propia marca (logo, color y nombre).

### 4.1 Cómo iniciar sesión

1. Abre **`/resta3/login`**.
2. Escribe tu **Usuario** y tu **Contraseña** (puedes pulsar el ojo 👁 para ver lo que escribes).
3. Pulsa **"→ Entrar"**.

### 4.2 Dashboard RESTA3

Al entrar ves tarjetas con el estado del día: clientes activos, ventas, pedidos. A la derecha hay un **panel fijo** con un reloj y accesos rápidos a TPV, Cocina y Mesas.

### 4.3 TPV / Caja (cobrar)

Entra a **TPV** (`/resta3/tpv`). Es la caja registradora digital.

**Para hacer una venta:**
1. Pulsa la pestaña **"Nueva"**.
2. **Busca el platillo** en el buscador y agrégalo a la cuenta.
3. Indica el **nombre del cliente** y la **mesa** (si aplica).
4. Si es a **domicilio**, llena nombre de quien recibe, dirección y referencias.
5. Aplica **descuento o impuesto** si corresponde.
6. Elige la **forma de pago**: Efectivo, Tarjeta o Transferencia.
7. Si pagan en efectivo, escribe con cuánto pagan para calcular el cambio.
8. Confirma. Se puede **imprimir el ticket** con los datos del restaurante.

La pestaña **"Historial"** muestra las ventas anteriores.

### 4.4 Mesas y Reservaciones

Entra a **Mesas** (`/resta3/mesas`). Tiene tres pestañas:

- **Mesas:** ves todas las mesas y su estado (libre, ocupada, reservada, limpieza). Puedes cambiar el estado, asignar cliente y crear mesas nuevas.
- **Plano:** vista visual del salón con las mesas distribuidas.
- **Reservas:** lista de reservaciones.

### 4.5 Cocina

Entra a **Cocina** (`/resta3/cocina`). Muestra los pedidos activos en orden, para que el personal de cocina sepa qué preparar. Aquí también está disponible el **"Chef Asistente"** de IA que dicta recetas.

### 4.6 Domicilios

Entra a **Domicilios** (`/resta3/domicilios`). Lista los pedidos a domicilio con su dirección y estado de entrega.

### 4.7 Inventario y Compras

- **Inventario** (`/resta3/inventario`): lista de productos con su stock. Cuando un producto baja del mínimo, aparece una **alerta de stock bajo**. Para agregar un producto pulsa **"Nuevo producto"** y llena nombre, categoría, stock, mínimo, unidad y costo.
- **Compras y Proveedores** (`/resta3/compras`): registra órdenes de compra a proveedores.

### 4.8 Corte de Caja

Entra a **Corte de Caja** (`/resta3/corte`). Sirve para cerrar el turno y contar el dinero.

**La pantalla muestra el total del turno separado por:**
- **Efectivo** (verde)
- **Tarjeta** (azul)
- **Transferencia** (morado)
- **Domicilio** (naranja)

**Para hacer el corte:**
1. En **"Ejecutar corte y cambio de turno"** escribe el nombre de **quién entrega**.
2. Escribe quién **recibe** el siguiente turno (opcional).
3. Confirma. El sistema guarda el corte en el historial y empieza un turno nuevo.

El historial muestra los últimos cortes con sus totales.

### 4.9 Empleados y Menú (RESTA3)

- **Empleados** (`/resta3/empleados`): da de alta y administra al personal de operación.
- **Menú** (`/resta3/menu`): añade o ajusta productos disponibles para vender en la caja.

---

## 5. Portal del Cliente (público)

Es lo que ve el comensal. No necesita contraseña para el menú ni las reseñas.

### 5.1 Menú digital y pedidos

Abre **`/menu`**.

**Para hacer un pedido:**
1. Toca una **categoría** para desplegar sus platillos.
2. Toca un platillo para ver su **foto, precio y descripción**.
3. Pulsa **"Agregar al Pedido"**. Puedes ajustar la cantidad con los botones **−** y **+**.
4. Puedes dar **"me encanta"** (❤) a tus platillos favoritos.
5. Cuando termines, pulsa el botón flotante **"Realizar pedido"** abajo.
6. En el resumen, agrega **notas por platillo** si quieres (ej. "sin cebolla").
7. Elige el tipo de pedido:
   - **En restaurante:** escribe tu nombre y, opcionalmente, tu mesa.
   - **A domicilio:** escribe tu nombre, dirección y forma de pago (Stripe o Depósito).
8. Pulsa **"Confirmar pedido"**.

**Seguimiento en tiempo real:** después de pedir, verás una barra de progreso con las etapas: **Recibido → Preparando → Listo → Entregado**. Se actualiza sola. Los pedidos entregados desaparecen 30 segundos después.

### 5.2 Registro en el programa de lealtad

Abre **`/registro`**.

1. Llena tu **Nombre completo**, **Número de WhatsApp** y **Fecha de nacimiento**.
2. Acepta los **términos y condiciones**.
3. Pulsa **"Unirme"**.
4. Verás un mensaje de **"Registro recibido"**. Tu tarjeta queda esperando que el restaurante la active.
5. La página se actualiza sola; en cuanto el restaurante active tu tarjeta, verás **"¡Tarjeta activada!"**.

> Si ya estabas registrado en ese dispositivo, te saluda por tu nombre y te muestra tus sellos acumulados.

### 5.3 Tu tarjeta de lealtad

Abre **`/card`**.

1. Si es la primera vez, escribe tu **nombre y teléfono** para acceder a tu tarjeta.
2. Verás tu tarjeta digital con los **sellos acumulados** sobre una imagen.
3. **Toca la tarjeta** para girarla y ver tu **código QR**. Muéstraselo al empleado para que selle tu visita.
4. Cuando completes los sellos, la tarjeta te avisa que tienes tu recompensa lista.

Existen variantes de tarjeta según la promoción: estándar, premium, 2x1, descuento y wallet.

### 5.4 Reseñas

Abre **`/review`**.

1. Selecciona una **calificación** tocando las estrellas (de 1 a 5).
2. Escribe tu **nombre** y un **comentario**.
3. Pulsa **"Enviar reseña"**.

Abajo verás las reseñas publicadas de otros clientes y la **calificación promedio** del restaurante.

---

## 6. Asistente de Inteligencia Artificial

En casi todas las pantallas hay un **botón flotante redondo** (abajo a la derecha) que abre el Asistente IA. El asistente cambia según quién lo use:

| Quién lo usa | Qué hace el asistente |
|--------------|----------------------|
| **Cliente** (en el menú) | Recomienda platillos y te dice el estado de tu pedido. |
| **Cocinero** | Dicta recetas paso a paso y conoce los pedidos activos. |
| **Mesero / Empleado** | Informa pedidos, mesas, tiempos y tarjetas de lealtad. |
| **RESTA3** | Da el estado en vivo de mesas, inventario y ventas del día. |
| **Administrador** | Analiza ventas, tendencias, reseñas y datos del negocio. |

**Cómo usarlo:**
1. Pulsa el botón flotante para abrirlo.
2. Escribe tu pregunta o toca una de las **acciones rápidas** sugeridas.
3. También puedes **hablar**: pulsa el micrófono 🎤 y dicta tu pregunta.
4. Puedes activar la **voz** (🔊) para que te lea las respuestas.
5. El icono **↺** reinicia la conversación.

**Ejemplos de preguntas:**
- Cliente: *"¿Qué me recomiendas que no sea muy picante?"*
- Cocinero: *"Dame los pasos del Salmon Bowl"* (luego di *"siguiente"* para avanzar).
- Admin: *"¿Cómo van las ventas de hoy comparadas con la semana?"*

> El asistente conoce tus datos **en tiempo real**, pero no puede hacer cambios por ti; solo informa y recomienda. Las recomendaciones de platillos al cliente se pueden agregar al carrito con un toque.

---

## 7. Preguntas frecuentes

**No puedo iniciar sesión.**
Verifica que tu nombre y contraseña sean correctos (no importan mayúsculas en el nombre). Si sigue fallando, pide al administrador que revise tu perfil en **Configuración → Administración de perfiles**.

**No veo una sección que antes sí aparecía.**
Es probable que ese módulo se haya desactivado para tu restaurante. Avisa al administrador o al equipo de NICHO.

**Subí una foto pero tarda o no aparece.**
Espera unos segundos a que se procese. Usa fotos en formato JPG o PNG; el sistema las convierte automáticamente para que carguen rápido.

**El menú del cliente no muestra mis platillos.**
Revisa que los platillos estén marcados como **disponibles** en **Menú Inteligente**.

**Un cliente registró su tarjeta pero no acumula sellos.**
La tarjeta debe estar **activada**. Ve a **Sellar visitas → Tarjetas por activar** y actívala.

**El Asistente IA responde que "no está configurado".**
La clave del servicio de IA no está cargada en el servidor. Contacta al equipo técnico de NICHO.

**El Asistente IA dice que "alcanzó su límite de uso".**
El servicio de IA tiene un límite por minuto. Espera unos minutos e intenta de nuevo.

**¿Cómo cierro sesión?**
Usa el botón **"Cerrar sesión"** al final del menú lateral (admin/empleado) o **"Salir"** en la barra inferior (cliente).

**¿Cuánto dura mi sesión?**
Las sesiones de personal duran 24 horas. Después tendrás que volver a entrar.

**¿Cómo reporto un problema?**
En el panel de administrador, usa el botón **"Reportar problema"** al final del menú lateral. Tu mensaje llega directamente al soporte de NICHO.

---

*Fin del Manual de Usuario — NICHO · 2026-06-28*
