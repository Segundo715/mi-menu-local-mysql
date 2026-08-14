/**
 * Utilidades para inyectar datos del usuario dentro del JSON de Lottie.
 *
 * Pensadas para usarse DENTRO del `applyParams` de cada animación. El
 * programador que instala una animación de la agencia usa estos helpers para
 * conectar los campos estándar (texto, rótulo, precio, imagen) y los propios
 * (colores, etc.) a las capas reales del archivo .json.
 *
 * Convención: las capas que se quieran "conectar" deben tener un nombre (`nm`)
 * identificable en After Effects. Ej: una capa de texto llamada `titulo`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Copia profunda del JSON para no mutar el original cacheado. */
export function cloneLottie<T>(json: T): T {
  return JSON.parse(JSON.stringify(json))
}

/** Convierte "#rrggbb" a color Lottie [r,g,b,a] (0..1). */
export function hexToLottieColor(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return [r, g, b, 1]
}

function findLayer(json: any, layerName: string): any | undefined {
  return (json?.layers as any[] | undefined)?.find(l => l?.nm === layerName)
}

/** Cambia el texto de una capa de texto (ty:5) buscándola por nombre (nm). */
export function setLayerText(json: any, layerName: string, text: string | undefined): void {
  if (text == null) return
  const layer = findLayer(json, layerName)
  const doc = layer?.t?.d?.k?.[0]?.s
  if (doc) doc.t = text
}

/** Cambia el color del texto (fc) de una capa de texto (ty:5) por nombre. */
export function setLayerTextColor(json: any, layerName: string, hex: string | undefined): void {
  if (!hex) return
  const layer = findLayer(json, layerName)
  const doc = layer?.t?.d?.k?.[0]?.s
  if (doc) {
    const [r, g, b] = hexToLottieColor(hex)
    doc.fc = [r, g, b]
  }
}

/** Cambia el color de relleno (fl) de la primera forma de una capa por nombre. */
export function setLayerFillColor(json: any, layerName: string, hex: string | undefined): void {
  if (!hex) return
  const layer = findLayer(json, layerName)
  const groups = (layer?.shapes as any[] | undefined) ?? []
  for (const g of groups) {
    const fill = g?.it?.find((x: any) => x?.ty === "fl")
    if (fill?.c) {
      fill.c.k = hexToLottieColor(hex)
      return
    }
  }
}

/**
 * Inyecta una imagen (dataURL o ruta) en un asset por id.
 * Sirve para reemplazar la foto del producto/logo dentro de la animación.
 */
export function setImageAsset(json: any, assetId: string, src: string | undefined): void {
  if (!src) return
  const asset = (json?.assets as any[] | undefined)?.find(a => a?.id === assetId)
  if (!asset) return
  asset.p = src
  asset.u = ""
  asset.e = src.startsWith("data:") ? 1 : 0
}
