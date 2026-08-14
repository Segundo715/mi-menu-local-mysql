"use client"
// Reproducción a pantalla completa para una TV física. Lee la pantalla por [id] desde
// localStorage (misma clave que el dashboard TV); solo funciona en el mismo navegador donde fue creada.
import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import AnimationRenderer from "@/app/components/AnimationRenderer"
import type { AnimationParams } from "@/app/components/animations/types"

// --- TYPES (mismas que el Dashboard) ---
type ScreenData = { title: string; description: string; price: string; image: string; animation?: string; animationParams?: AnimationParams }
type Orientation = 'horizontal' | 'vertical'
type Screen = {
  id: string
  deviceId: string
  templateId: string
  order: number
  schedule: { start: string; end: string }
  orientation?: Orientation
  data: ScreenData
}

const STORAGE_KEY = "pantalla_dashboard_v1"

export default function PantallaPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [screen, setScreen] = useState<Screen | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Hidratación desde localStorage: solo es posible tras montar en el cliente
    // (en SSR no existe localStorage). La regla set-state-in-effect es un falso
    // positivo para esta carga única.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const found = Array.isArray(parsed.screens)
          ? parsed.screens.find((s: Screen) => s.id === id)
          : null
        if (found) setScreen(found)
      }
    } catch {
      // ignore
    }
    setLoaded(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [id])

  // Estado de carga
  if (!loaded) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-gray-600">
        <p className="animate-pulse text-lg">Cargando pantalla…</p>
      </div>
    )
  }

  // Pantalla no encontrada
  if (!screen) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white p-6 text-center">
        <svg className="w-24 h-24 text-gray-800 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <h1 className="text-3xl font-bold mb-3">Pantalla no encontrada</h1>
        <p className="text-gray-400 text-lg max-w-lg">
          No existe ninguna pantalla con el id <code className="font-mono text-gray-300">{id}</code> en este navegador.
        </p>
        <p className="text-gray-600 text-sm mt-4 max-w-md">
          Recuerda que las pantallas se guardan localmente: la URL solo funciona en el mismo navegador donde fue creada.
        </p>
      </div>
    )
  }

  // Si la pantalla tiene animación Lottie, ocupa todo el viewport y reemplaza el resto.
  if (screen.data.animation) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
        <AnimationRenderer animationId={screen.data.animation} params={screen.data.animationParams} orientation={screen.orientation ?? 'horizontal'} className="w-full h-full" />
      </div>
    )
  }

  // Render de la pantalla a pantalla completa
  return (
    <div className="fixed inset-0 bg-black flex flex-col text-white overflow-hidden">
      <div className="w-full h-full relative flex items-center justify-center">

        {/* Imagen de fondo a pantalla completa */}
        {screen.data.image ? (
          <div className="absolute inset-0 z-0 bg-black">
            <img src={screen.data.image} alt="bg" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20"></div>
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-[#0c1015] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 to-black"></div>
        )}

        {/* Contenido superpuesto */}
        <div className={`z-10 flex flex-col gap-6 w-[90%] max-w-7xl
          ${screen.data.image ? 'self-end items-start text-left mb-16 md:mb-24' : 'items-center text-center'}`}>
          <div className={`px-4 py-1.5 rounded-full inline-block border bg-black/40 backdrop-blur w-max font-bold text-xs uppercase tracking-[0.2em] shadow-lg
            ${screen.templateId === "template-menu" ? "text-amber-400 border-amber-500/30" : "text-emerald-400 border-emerald-500/30"}
          `}>
            {screen.templateId === "template-menu" ? "Menú Especial" : "Promoción"}
          </div>

          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-tight bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
            {screen.data.title || "Contenido"}
          </h1>

          <p className="text-2xl md:text-3xl lg:text-4xl text-gray-100 font-light leading-relaxed max-w-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {screen.data.description}
          </p>

          {(screen.data.price && screen.data.price !== "$0" && screen.data.price.trim() !== "") && (
            <div className="mt-4">
              <div className="inline-block bg-gradient-to-r from-green-500 to-emerald-700 text-white text-5xl md:text-7xl font-black px-12 py-6 rounded-3xl shadow-[0_20px_50px_-12px_rgba(16,185,129,0.5)] transform -rotate-2">
                {screen.data.price.startsWith('$') ? screen.data.price : `$${screen.data.price}`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
