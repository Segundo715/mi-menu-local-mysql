"use client"
// Wrapper de lottie-react: carga el JSON desde /public/animations/<name>.json en cliente.
// El prop transform permite inyectar colores o textos dinámicos antes de pasarlo a Lottie.
import React, { useEffect, useMemo, useRef, useState } from "react"
import Lottie, { type LottieRefCurrentProps } from "lottie-react"

type LottiePlayerProps = {
  /** Nombre del archivo en /public/animations (sin extensión). Ej: "promo" -> /animations/promo.json */
  name: string
  className?: string
  loop?: boolean
  autoplay?: boolean
  /** Se llama cuando termina la animación (solo si loop = false). */
  onComplete?: () => void
  /** Transforma el JSON antes de pasarlo a Lottie (para inyectar colores, textos, etc.). */
  transform?: (data: object) => object
  /** Multiplicador de velocidad de reproducción. */
  speed?: number
  /** preserveAspectRatio del SVG: "xMidYMid meet" (contain), "xMidYMid slice" (cover), "none" (fill). */
  preserveAspectRatio?: string
}

/**
 * Carga y reproduce una animación Lottie (.json exportada de After Effects)
 * desde la carpeta pública /animations. Permite transformar el JSON e
 * inyectar parámetros (color, textos, etc.) antes de renderizarlo.
 */
export default function LottiePlayer({
  name,
  className,
  loop = true,
  autoplay = true,
  onComplete,
  transform,
  speed,
  preserveAspectRatio,
}: LottiePlayerProps) {
  const [raw, setRaw] = useState<object | null>(null)
  const [error, setError] = useState(false)
  const lottieRef = useRef<LottieRefCurrentProps>(null)

  useEffect(() => {
    if (!name) return
    let cancelled = false
    // Reset al cambiar de animación para no mostrar la anterior mientras carga
    // la nueva; es el comportamiento deseado, no un render en cascada accidental.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setRaw(null)
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setError(false)

    fetch(`/animations/${name}.json`)
      .then(res => {
        if (!res.ok) throw new Error("not found")
        return res.json()
      })
      .then(json => {
        if (!cancelled) setRaw(json)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [name])

  const data = useMemo(() => {
    if (!raw) return null
    return transform ? transform(raw) : raw
  }, [raw, transform])

  useEffect(() => {
    if (lottieRef.current && typeof speed === "number") {
      lottieRef.current.setSpeed(speed)
    }
  }, [speed, data])

  if (error) {
    return (
      <div className={`flex items-center justify-center text-xs text-red-400/70 ${className ?? ""}`}>
        No se encontró /animations/{name}.json
      </div>
    )
  }

  if (!data) {
    return (
      <div className={`flex items-center justify-center text-xs text-gray-600 animate-pulse ${className ?? ""}`}>
        Cargando animación…
      </div>
    )
  }

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={data}
      loop={loop}
      autoplay={autoplay}
      onComplete={onComplete}
      className={className}
      rendererSettings={preserveAspectRatio ? { preserveAspectRatio } : undefined}
    />
  )
}
