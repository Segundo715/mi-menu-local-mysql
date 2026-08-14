"use client"
// Modal para asignar y parametrizar animaciones en slides de TV admin.
// Los campos editables se generan dinámicamente desde StandardFieldDef del registry.
import React, { useEffect, useState } from "react"
import AnimationRenderer from "./AnimationRenderer"
import { ANIMATIONS, findAnimation } from "./animations/registry"
import type { AnimationParams, StandardFieldDef } from "./animations/types"

type Orientation = "horizontal" | "vertical"

type Props = {
  open: boolean
  /** Animación actualmente asignada a la pantalla (o undefined). */
  currentId?: string
  currentParams?: AnimationParams
  orientation?: Orientation
  /** Nombre de la pantalla, solo para mostrar en el encabezado. */
  screenLabel?: string
  onClose: () => void
  /** Se llama al guardar. animationId undefined = quitar animación. */
  onApply: (animationId: string | undefined, params: AnimationParams | undefined) => void
}

/**
 * Editor de animación a pantalla completa.
 * Izquierda: galería de plantillas predefinidas (registry).
 * Derecha: preview en vivo + panel de ajustes (campos estándar + propios).
 */
export default function AnimationEditorModal({
  open,
  currentId,
  currentParams,
  orientation = "horizontal",
  screenLabel,
  onClose,
  onApply,
}: Props) {
  // El modal se monta fresco cada vez que se abre (el padre lo desmonta al
  // cerrar y usa `key={screen.id}`), por eso inicializamos desde props.
  const [selectedId, setSelectedId] = useState<string | undefined>(currentId)
  const [draft, setDraft] = useState<AnimationParams>(
    () => ({ ...(findAnimation(currentId)?.defaults ?? {}), ...(currentParams ?? {}) }),
  )

  // Cerrar con Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const def = findAnimation(selectedId)
  const SettingsCmp = def?.Settings
  const isVertical = orientation === "vertical"

  const selectAnimation = (id: string) => {
    setSelectedId(id)
    const next = findAnimation(id)
    setDraft({ ...(next?.defaults ?? {}) })
  }

  const updateField = (key: string, value: unknown) => {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  const handleImage = (key: string, file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => updateField(key, reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    onApply(selectedId, selectedId ? draft : undefined)
    onClose()
  }

  const handleRemove = () => {
    onApply(undefined, undefined)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-gray-950/95 backdrop-blur-sm animate-in fade-in duration-200">
      {/* ENCABEZADO */}
      <header className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 border-b border-gray-800 shrink-0">
        <div className="min-w-0">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Editor de Animación
          </h2>
          {screenLabel && <p className="text-xs text-gray-500 mt-0.5 truncate">Pantalla: {screenLabel}</p>}
        </div>
        <button
          onClick={onClose}
          title="Cerrar (Esc)"
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      {/* CUERPO */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_1fr] overflow-hidden">

        {/* GALERÍA DE PLANTILLAS */}
        <aside className="border-b lg:border-b-0 lg:border-r border-gray-800 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1 px-1">Plantillas</p>
          {ANIMATIONS.map(a => {
            const active = a.id === selectedId
            return (
              <button
                key={a.id}
                onClick={() => selectAnimation(a.id)}
                className={`w-full text-left p-3 rounded-xl border transition ${active ? "bg-emerald-500/10 border-emerald-500/50" : "bg-gray-900 border-gray-800 hover:border-gray-600"}`}
              >
                <p className={`text-sm font-semibold ${active ? "text-white" : "text-gray-200"}`}>{a.name}</p>
                {a.description && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{a.description}</p>}
                <code className="block text-[10px] text-gray-600 font-mono mt-1.5">{a.jsonName}.json</code>
              </button>
            )
          })}
          <div className="pt-2 mt-2 border-t border-gray-800/80">
            <p className="text-[11px] text-gray-600 leading-relaxed px-1">
              ¿Necesitas una animación a medida? El programador agrega el <code className="text-gray-500">.json</code> en
              <code className="text-gray-500"> /public/animations</code> y lo registra en el código. Aparecerá aquí automáticamente.
            </p>
          </div>
        </aside>

        {/* PREVIEW + AJUSTES */}
        <div className="overflow-y-auto p-5 md:p-8 custom-scrollbar">
          {def ? (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(320px,420px)] gap-8 max-w-6xl mx-auto">
              {/* PREVIEW */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-300">Vista en vivo</p>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">{isVertical ? "Vertical · 9:16" : "Horizontal · 16:9"}</span>
                </div>
                <div className="bg-black border border-gray-800 rounded-2xl p-4 flex items-center justify-center">
                  <div className={`relative bg-black overflow-hidden rounded-lg ${isVertical ? "aspect-[9/16] h-[440px]" : "aspect-video w-full"}`}>
                    <AnimationRenderer
                      key={`${selectedId}-${orientation}-${JSON.stringify(draft)}`}
                      animationId={selectedId!}
                      params={draft}
                      orientation={orientation}
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>
              </div>

              {/* AJUSTES */}
              <div className="space-y-6">
                {/* Campos estándar autogenerados */}
                {def.fields && def.fields.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Contenido</p>
                    {def.fields.map(field => (
                      <FieldInput
                        key={field.key}
                        field={field}
                        value={draft[field.key]}
                        onText={v => updateField(field.key, v)}
                        onImage={f => handleImage(field.key, f)}
                        onClear={() => updateField(field.key, "")}
                      />
                    ))}
                  </div>
                )}

                {/* Controles propios de la animación */}
                {SettingsCmp && (
                  <div className="space-y-3 pt-2 border-t border-gray-800">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Estilo de esta animación</p>
                    <SettingsCmp params={draft} onChange={setDraft} />
                  </div>
                )}

                {(!def.fields || def.fields.length === 0) && !SettingsCmp && (
                  <p className="text-sm text-gray-500">Esta animación no tiene ajustes configurables.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-20">
              <svg className="w-16 h-16 opacity-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-gray-400 font-medium">Elige una plantilla de la izquierda</p>
              <p className="text-sm">para previsualizarla y configurar su contenido.</p>
            </div>
          )}
        </div>
      </div>

      {/* PIE */}
      <footer className="flex items-center justify-between gap-3 px-5 md:px-8 py-4 border-t border-gray-800 shrink-0">
        <button
          onClick={handleRemove}
          disabled={!currentId}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/10 transition disabled:opacity-30 disabled:hover:bg-transparent"
        >
          Quitar animación
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedId}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition disabled:opacity-40 shadow-lg shadow-emerald-900/30"
          >
            Guardar y aplicar
          </button>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #374151; border-radius: 10px; }
      `}} />
    </div>
  )
}

// =========================================================================
// Input de un campo estándar (texto / rótulo / precio / imagen)
// =========================================================================
function FieldInput({
  field,
  value,
  onText,
  onImage,
  onClear,
}: {
  field: StandardFieldDef
  value: unknown
  onText: (v: string) => void
  onImage: (file: File | undefined) => void
  onClear: () => void
}) {
  if (field.key === "image") {
    const src = typeof value === "string" ? value : ""
    return (
      <div>
        <label className="block text-sm font-semibold mb-1.5 text-gray-300">{field.label}</label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl bg-gray-900/50 transition cursor-pointer overflow-hidden">
            {src ? (
              <div className="flex items-center gap-3 p-3">
                <img src={src} alt="" className="h-12 w-12 object-cover rounded-md border border-gray-700" />
                <span className="text-sm text-gray-300">Cambiar imagen</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3.5 text-sm text-gray-400">
                <svg className="w-5 h-5 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span><span className="text-blue-400 font-semibold">Sube una imagen</span> para la animación</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={e => onImage(e.target.files?.[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          {src && (
            <button
              onClick={onClear}
              title="Quitar imagen"
              className="p-2.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        {field.help && <p className="text-xs text-gray-500 mt-1">{field.help}</p>}
      </div>
    )
  }

  // text / label / price → input de texto
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5 text-gray-300">{field.label}</label>
      <input
        type="text"
        value={typeof value === "string" ? value : ""}
        onChange={e => onText(e.target.value)}
        placeholder={field.placeholder}
        className="w-full bg-gray-900 text-white border border-gray-700/80 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
      />
      {field.help && <p className="text-xs text-gray-500 mt-1">{field.help}</p>}
    </div>
  )
}
