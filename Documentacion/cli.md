# CLI — Comandos de mi-proyecto

> Todos los comandos se ejecutan desde la raíz de `mi-proyecto` con `npm run <comando>`.

---

## Desarrollo

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo en `localhost:3000` |
| `npm run build` | Compila el proyecto para producción |
| `npm run start` | Inicia el servidor de producción (requiere `build` previo) |
| `npm run lint` | Revisa el código con ESLint |

---

## Seeds — Poblar la base de datos

Insertan datos de prueba en Supabase. Requieren `.env.local` con las variables de entorno.

| Comando | Qué inserta |
|---------|-------------|
| `npm run seed` (sin args) | Muestra la ayuda con este mismo resumen |
| `npm run seed:1` | Fase cliente 1 — el teléfono del cliente solo ve tab Menú |
| `npm run seed:2` | Fase cliente 2 — Menú + Tarjeta de lealtad |
| `npm run seed:3` | Fase cliente 3 — Menú + Tarjeta + Reseñas (todo) |
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

Las fases (1/2/3) controlan qué tabs ve el cliente en `CustomerNav`, pensadas
para ir avanzando durante una demo en vivo: `seed:1 → seed:2 → seed:3`.
Todos los comandos son idempotentes — no duplican datos existentes.

---

## Variables de entorno requeridas

Archivo `.env.local` en la raíz del proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_RESTAURANT_ID=
ADMIN_SECRET=
GROQ_API_KEY=
```

> `GROQ_API_KEY` es la clave de la IA (Llama vía Groq). Se obtiene en https://console.groq.com/keys
>
> `ADMIN_SECRET` firma las cookies de sesión (`admin_session`, `employee_session`,
> `resta3_session`) y los hashes de contraseña. Si no está definida, cae al
> valor inseguro `'dev-secret'` — solo aceptable en desarrollo local.
