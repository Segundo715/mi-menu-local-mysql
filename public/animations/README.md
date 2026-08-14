# Animaciones Lottie (After Effects)

Coloca aquí los archivos `.json` exportados desde After Effects con el plugin **Bodymovin / Lottie**.

- Cada archivo de esta carpeta queda disponible en la app bajo la ruta `/animations/<nombre>.json`.
- Las animaciones se eligen y configuran desde el **Editor de Animación** (botón "Settings"/"Usar animación Lottie" dentro de cada pantalla en el dashboard).
- Formatos soportados: `.json` (Lottie). Los `.lottie` (dotLottie) requieren otra librería.

```
public/animations/
  promo.json
  sample.json
```

## Cómo conecta una animación un programador (flujo agencia → instalación)

La agencia entrega un `.json`. El programador lo conecta en **3 pasos**, sin que el
usuario final toque código: este solo usa la galería y los ajustes del editor.

### 1. Nombrar las capas en After Effects

Las capas que se quieran hacer editables deben tener un **nombre (`nm`)**
identificable. Por convención usamos:

| Campo estándar      | Nombre de capa sugerido | Tipo de capa     |
| ------------------- | ----------------------- | ---------------- |
| Texto principal     | `titulo`                | Texto (`ty: 5`)  |
| Inscripción/rótulo  | `rotulo`                | Texto (`ty: 5`)  |
| Precio              | `precio`                | Texto (`ty: 5`)  |
| Imagen del producto | asset `image_0`         | Imagen (`ty: 2`) |

### 2. Copiar el `.json` a `public/animations/`

Ej.: `public/animations/promo.json`.

### 3. Registrar la animación en código

Crea `app/components/animations/<id>.tsx` exportando un `AnimationDef` y
agrégalo a `app/components/animations/registry.ts`. Toma `promo.tsx` como
plantilla. Lo esencial:

```ts
export const miAnimacionDef: AnimationDef = {
  id: "mi-anim",
  name: "Mi animación",
  jsonName: "mi-anim",            // -> /animations/mi-anim.json
  // Qué campos estándar expone esta animación (el editor genera los inputs):
  fields: [
    { key: "text",  label: "Texto principal" },
    { key: "label", label: "Inscripción / rótulo" },
    { key: "price", label: "Precio" },
    { key: "image", label: "Imagen del producto" },
  ],
  defaults: { text: "...", label: "...", price: "$0", image: "", color: "#f59e0b", speed: 1 },
  Settings,                        // opcional: controles propios (color, velocidad...)
  applyParams,                     // inyecta los datos en el JSON
}
```

En `applyParams` usa los helpers de `app/components/animations/inject.ts`:

```ts
import { cloneLottie, setLayerText, setImageAsset, setLayerTextColor } from "./inject"

function applyParams(json, raw) {
  const p = asMisParams(raw)
  const clone = cloneLottie(json)
  setLayerText(clone, "titulo", p.text)
  setLayerText(clone, "rotulo", p.label)
  setLayerText(clone, "precio", p.price)
  setImageAsset(clone, "image_0", p.image)
  setLayerTextColor(clone, "titulo", p.color)
  return clone
}
```

Una vez registrada, la animación aparece **sola** en la galería del editor.
```
