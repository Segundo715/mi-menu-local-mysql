"use client"
import React from "react"
import type { AnimationDef, AnimationParams, AnimationSettingsProps } from "./types"
import { cloneLottie, setLayerFillColor } from "./inject"

type SampleParams = {
  color: string
  speed: number
}

const defaults: SampleParams = {
  color: "#3b82f6",
  speed: 1,
}

function asSampleParams(p: AnimationParams): SampleParams {
  return { ...defaults, ...(p as Partial<SampleParams>) }
}

function applyParams(json: object, raw: AnimationParams): object {
  const params = asSampleParams(raw)
  const clone = cloneLottie(json)
  setLayerFillColor(clone, "circle", params.color)
  return clone
}

const Settings: React.FC<AnimationSettingsProps> = ({ params: raw, onChange }) => {
  const params = asSampleParams(raw)
  const update = (patch: Partial<SampleParams>) => onChange({ ...params, ...patch } as AnimationParams)
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Color del círculo</label>
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

export const sampleDef: AnimationDef = {
  id: "sample",
  name: "Círculo pulsante",
  description: "Animación de ejemplo sin textos. Solo demuestra el cambio de color y velocidad.",
  jsonName: "sample",
  // Esta animación no expone campos de texto/imagen, solo sus controles propios.
  fields: [],
  defaults: defaults as unknown as AnimationParams,
  Settings,
  applyParams,
}
