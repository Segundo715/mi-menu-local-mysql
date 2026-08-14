"use client"
import React from "react"
import type { AnimationDef, AnimationParams, AnimationSettingsProps } from "./types"
import { cloneLottie, setImageAsset, setLayerText, setLayerTextColor } from "./inject"

/**
 * Animación "Promo con texto": ejemplo de una animación vendida por la agencia
 * que el programador conecta a los campos estándar.
 *
 * Capas conectadas en promo.json (por nombre `nm`):
 *  - "titulo"  → texto principal (ty:5)
 *  - "rotulo"  → inscripción / leyenda (ty:5)
 *  - "precio"  → precio (ty:5)
 *  - asset "image_0" → imagen del producto (ty:2)
 */

type PromoParams = {
  text: string
  label: string
  price: string
  image: string
  color: string
  speed: number
}

const defaults: PromoParams = {
  text: "Tu Producto",
  label: "PROMOCIÓN",
  price: "$99",
  image: "",
  color: "#f59e0b",
  speed: 1,
}

function asPromoParams(p: AnimationParams): PromoParams {
  return { ...defaults, ...(p as Partial<PromoParams>) }
}

function applyParams(json: object, raw: AnimationParams): object {
  const params = asPromoParams(raw)
  const clone = cloneLottie(json)
  setLayerText(clone, "titulo", params.text)
  setLayerText(clone, "rotulo", params.label)
  setLayerText(clone, "precio", params.price)
  setLayerTextColor(clone, "titulo", params.color)
  setImageAsset(clone, "image_0", params.image)
  return clone
}

const Settings: React.FC<AnimationSettingsProps> = ({ params: raw, onChange }) => {
  const params = asPromoParams(raw)
  const update = (patch: Partial<PromoParams>) => onChange({ ...params, ...patch } as AnimationParams)
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Color del título</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={params.color}
            onChange={e => update({ color: e.target.value })}
            className="h-10 w-14 rounded-lg border border-gray-700 bg-gray-900 cursor-pointer"
          />
          <code className="text-xs text-gray-400 font-mono">{params.color}</code>
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

export const promoDef: AnimationDef = {
  id: "promo",
  name: "Promo con texto",
  description: "Plantilla con título, rótulo, precio e imagen. Ideal para promociones de producto.",
  jsonName: "promo",
  fields: [
    { key: "text", label: "Texto principal", placeholder: "Ej. Hamburguesa Doble" },
    { key: "label", label: "Inscripción / rótulo", placeholder: "Ej. PROMOCIÓN", help: "Texto secundario que aparece arriba." },
    { key: "price", label: "Precio", placeholder: "$99" },
    { key: "image", label: "Imagen del producto", help: "Se inyecta dentro de la animación." },
  ],
  defaults: defaults as unknown as AnimationParams,
  Settings,
  applyParams,
}
