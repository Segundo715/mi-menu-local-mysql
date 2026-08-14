"use client"
import React from "react"
import type { AnimationContext, AnimationDef, AnimationParams, AnimationSettingsProps } from "./types"
import { cloneLottie, setLayerText, setLayerTextColor } from "./inject"

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Animación "Pantalla completa": imagen de fondo a pantalla completa (vía CSS
 * object-cover, sin efectos) con un texto principal (azul) y un texto
 * secundario / descripción (rosa) encima.
 *
 * - La imagen NO va dentro del Lottie (ver `backgroundImageField`): así llena
 *   cualquier orientación sin distorsión ni opacidad.
 * - El Lottie solo contiene los textos (fondo transparente). En vertical se
 *   reacomodan posición y tamaño.
 *
 * Capas en destacado.json (por nombre `nm`):
 *  - "titulo"     → texto principal (ty:5)
 *  - "secundario" → texto secundario / descripción (ty:5)
 */

type DestacadoParams = {
  text: string
  label: string
  image: string
  colorMain: string
  colorSecondary: string
  /** Multiplicadores de tamaño (1 = tamaño base). */
  sizeMain: number
  sizeSecondary: number
  /** Familia tipográfica (CSS) aplicada a ambos textos. */
  font: string
  /** Multiplicador de la distancia entre el título y el texto secundario. */
  gap: number
  speed: number
}

const defaults: DestacadoParams = {
  text: "Tu Título",
  label: "Descripción del producto o promoción",
  image: "",
  colorMain: "#3b82f6",      // azul
  colorSecondary: "#ec4899", // rosa
  sizeMain: 1,
  sizeSecondary: 1,
  font: "Arial",
  gap: 1,
  speed: 1,
}

// Variantes de tipografía (fuentes web-safe, no requieren cargar nada).
const FONTS: { label: string; value: string }[] = [
  { label: "Moderna (Sans)", value: "Arial" },
  { label: "Elegante (Serif)", value: "Georgia" },
  { label: "Clásica", value: "Times New Roman" },
  { label: "Impacto", value: "Impact" },
  { label: "Máquina (Mono)", value: "Courier New" },
  { label: "Redonda", value: "Trebuchet MS" },
]

// Tamaños base de fuente según orientación (sobre los que se aplica el multiplicador).
const BASE_SIZE = {
  horizontal: { titulo: 150, secundario: 62 },
  vertical: { titulo: 104, secundario: 46 },
}

// Layout base por orientación: posición del título y separación base al secundario.
const LAYOUT = {
  horizontal: { x: 960, tituloY: 730, baseGap: 140 },
  vertical: { x: 540, tituloY: 1240, baseGap: 190 },
}

function asParams(p: AnimationParams): DestacadoParams {
  return { ...defaults, ...(p as Partial<DestacadoParams>) }
}

/** Ajusta el tamaño de fuente (y su interlineado) de una capa de texto. */
function setFontSize(clone: any, name: string, size: number): void {
  const layer = (clone?.layers as any[] | undefined)?.find(l => l?.nm === name)
  const doc = layer?.t?.d?.k?.[0]?.s
  if (doc) {
    doc.s = size
    doc.lh = Math.round(size * 1.08)
  }
}

/** Reposiciona una capa de texto conservando su deslizamiento de entrada. */
function setPosition(clone: any, name: string, x: number, yEnd: number, slide = 30): void {
  const layer = (clone?.layers as any[] | undefined)?.find(l => l?.nm === name)
  const kf = layer?.ks?.p?.k
  if (Array.isArray(kf) && kf.length >= 2) {
    kf[0].s = [x, yEnd + slide, 0]
    kf[kf.length - 1].s = [x, yEnd, 0]
  }
}

/** Aplica la familia tipográfica (CSS) a las fuentes del JSON. */
function setFontFamily(clone: any, family: string): void {
  const list = clone?.fonts?.list as any[] | undefined
  if (Array.isArray(list)) list.forEach(f => { f.fFamily = family })
}

function applyParams(json: object, raw: AnimationParams, ctx?: AnimationContext): object {
  const params = asParams(raw)
  const clone = cloneLottie(json) as any
  const vertical = ctx?.orientation === "vertical"

  setLayerText(clone, "titulo", params.text)
  setLayerText(clone, "secundario", params.label)
  setLayerTextColor(clone, "titulo", params.colorMain)
  setLayerTextColor(clone, "secundario", params.colorSecondary)
  setFontFamily(clone, params.font)

  const base = vertical ? BASE_SIZE.vertical : BASE_SIZE.horizontal
  setFontSize(clone, "titulo", Math.round(base.titulo * params.sizeMain))
  setFontSize(clone, "secundario", Math.round(base.secundario * params.sizeSecondary))

  // En vertical (9:16) la composición pasa a retrato.
  if (vertical) {
    clone.w = 1080
    clone.h = 1920
  }

  // Posiciona ambos textos: el secundario se separa del título según el gap.
  const layout = vertical ? LAYOUT.vertical : LAYOUT.horizontal
  setPosition(clone, "titulo", layout.x, layout.tituloY)
  setPosition(clone, "secundario", layout.x, layout.tituloY + Math.round(layout.baseGap * params.gap))

  return clone
}

const Settings: React.FC<AnimationSettingsProps> = ({ params: raw, onChange }) => {
  const params = asParams(raw)
  const update = (patch: Partial<DestacadoParams>) => onChange({ ...params, ...patch } as AnimationParams)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Color texto principal</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={params.colorMain}
              onChange={e => update({ colorMain: e.target.value })}
              className="h-10 w-12 rounded-lg border border-gray-700 bg-gray-900 cursor-pointer"
            />
            <code className="text-xs text-gray-400 font-mono">{params.colorMain}</code>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Color texto secundario</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={params.colorSecondary}
              onChange={e => update({ colorSecondary: e.target.value })}
              className="h-10 w-12 rounded-lg border border-gray-700 bg-gray-900 cursor-pointer"
            />
            <code className="text-xs text-gray-400 font-mono">{params.colorSecondary}</code>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Tipografía</label>
        <select
          value={params.font}
          onChange={e => update({ font: e.target.value })}
          className="w-full bg-gray-900 text-white border border-gray-700/80 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
          style={{ fontFamily: params.font }}
        >
          {FONTS.map(f => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
          Distancia entre textos <span className="text-gray-300 font-normal normal-case">— {Math.round(params.gap * 100)}%</span>
        </label>
        <input
          type="range"
          min={0.3}
          max={2.5}
          step={0.05}
          value={params.gap}
          onChange={e => update({ gap: parseFloat(e.target.value) })}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>Junto</span><span>Normal</span><span>Separado</span>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
          Tamaño texto principal <span className="text-gray-300 font-normal normal-case">— {Math.round(params.sizeMain * 100)}%</span>
        </label>
        <input
          type="range"
          min={0.4}
          max={2}
          step={0.05}
          value={params.sizeMain}
          onChange={e => update({ sizeMain: parseFloat(e.target.value) })}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>40%</span><span>100%</span><span>200%</span>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
          Tamaño texto secundario <span className="text-gray-300 font-normal normal-case">— {Math.round(params.sizeSecondary * 100)}%</span>
        </label>
        <input
          type="range"
          min={0.4}
          max={2}
          step={0.05}
          value={params.sizeSecondary}
          onChange={e => update({ sizeSecondary: parseFloat(e.target.value) })}
          className="w-full accent-pink-500"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>40%</span><span>100%</span><span>200%</span>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
          Velocidad <span className="text-gray-300 font-normal normal-case">— {params.speed.toFixed(2)}x</span>
        </label>
        <input
          type="range"
          min={0.25}
          max={3}
          step={0.25}
          value={params.speed}
          onChange={e => update({ speed: parseFloat(e.target.value) })}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>0.25x</span><span>1x</span><span>3x</span>
        </div>
      </div>
    </div>
  )
}

export const destacadoDef: AnimationDef = {
  id: "destacado",
  name: "Pantalla completa (texto + imagen)",
  description: "Imagen de fondo a pantalla completa (sin efectos) con título azul y descripción rosa encima. Funciona en horizontal y vertical.",
  jsonName: "destacado",
  // La imagen se renderiza como fondo CSS (cover), no dentro del Lottie.
  backgroundImageField: "image",
  fields: [
    { key: "text", label: "Texto principal (azul)", placeholder: "Ej. Hamburguesa Doble" },
    { key: "label", label: "Texto secundario / descripción (rosa)", placeholder: "Ej. Doble carne con queso" },
    { key: "image", label: "Imagen de fondo", help: "Cubre toda la pantalla sin efectos, en horizontal y vertical." },
  ],
  defaults: defaults as unknown as AnimationParams,
  Settings,
  applyParams,
}
