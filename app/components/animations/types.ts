import type React from "react"

export type AnimationParams = Record<string, unknown>

/**
 * Campos estándar que una animación puede exponer al usuario final.
 * Son los "cambios principales" que el programador conecta al instalar
 * una animación vendida por la agencia: texto, rótulo, precio e imagen.
 */
export type StandardFieldKey = "text" | "label" | "price" | "image"

export type StandardFieldDef = {
  key: StandardFieldKey
  /** Etiqueta visible en el panel de ajustes. Ej: "Texto principal". */
  label: string
  placeholder?: string
  /** Ayuda corta debajo del campo. */
  help?: string
}

export type AnimationSettingsProps = {
  params: AnimationParams
  onChange: (next: AnimationParams) => void
}

export type Orientation = "horizontal" | "vertical"

/** Contexto de render que se pasa a applyParams (orientación de la pantalla, etc.). */
export type AnimationContext = {
  orientation: Orientation
}

export type AnimationDef = {
  id: string
  name: string
  /** Descripción corta para la galería del editor. */
  description?: string
  /** Nombre del .json en /public/animations (sin extensión). */
  jsonName: string
  /**
   * Cómo se ajusta la animación al contenedor:
   *  - "contain" (def.): encaja entera dentro; puede dejar barras (meet).
   *  - "cover": llena toda la pantalla recortando lo que sobra (slice).
   *  - "fill": estira hasta llenar, sin respetar proporción (none).
   */
  fit?: "contain" | "cover" | "fill"
  /**
   * Campos estándar (texto, rótulo, precio, imagen) que ESTA animación
   * conecta. El editor genera los inputs automáticamente a partir de esta
   * lista; cada animación elige cuáles soporta.
   */
  fields?: StandardFieldDef[]
  /**
   * Si se indica, el campo de imagen NO se inyecta dentro del Lottie, sino que
   * se renderiza como fondo a pantalla completa (CSS object-cover) DETRÁS de la
   * animación. Llena cualquier orientación sin distorsión ni efectos.
   */
  backgroundImageField?: StandardFieldKey
  /** Valores por defecto de TODOS los params (estándar + propios). */
  defaults: AnimationParams
  /**
   * Controles propios extra de la animación (color, velocidad, etc.).
   * Opcional: si no se define, el editor solo muestra los campos estándar.
   */
  Settings?: React.FC<AnimationSettingsProps>
  /** Inyecta los params dentro del JSON de Lottie antes de renderizar. */
  applyParams: (json: object, params: AnimationParams, ctx?: AnimationContext) => object
}
