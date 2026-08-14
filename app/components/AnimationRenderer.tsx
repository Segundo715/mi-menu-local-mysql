"use client"
// Resuelve un animationId contra el registry y delega en LottiePlayer con los params correctos.
// Algunas animaciones reajustan su layout según la orientación (horizontal/vertical) de la TV.
import React, { useCallback } from "react"
import LottiePlayer from "./LottiePlayer"
import { findAnimation } from "./animations/registry"
import type { AnimationParams, Orientation } from "./animations/types"

type Props = {
  animationId: string
  params?: AnimationParams
  className?: string
  loop?: boolean
  autoplay?: boolean
  onComplete?: () => void
  /** Orientación de la pantalla; algunas animaciones reacomodan su layout. */
  orientation?: Orientation
}

/**
 * Resuelve una animación del registry (por id), mezcla los defaults con los
 * params guardados y la renderiza con su transform y velocidad propios.
 */
export default function AnimationRenderer({ animationId, params, className, loop, autoplay, onComplete, orientation = "horizontal" }: Props) {
  const def = findAnimation(animationId)
  const merged = { ...(def?.defaults ?? {}), ...(params ?? {}) } as AnimationParams
  // `merged` se reconstruye en cada render; lo "clavamos" por su contenido
  // serializado para que `transform` solo cambie cuando cambian los params.
  const mergedKey = JSON.stringify(merged)

  const transform = useCallback(
    (json: object) => (def ? def.applyParams(json, merged, { orientation }) : json),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [def, mergedKey, orientation],
  )

  if (!def) {
    return (
      <div className={`flex items-center justify-center text-xs text-red-400/70 ${className ?? ""}`}>
        Animación &ldquo;{animationId}&rdquo; no registrada.
      </div>
    )
  }

  const speed = typeof (merged as { speed?: number }).speed === "number" ? (merged as { speed?: number }).speed : undefined

  const preserveAspectRatio =
    def.fit === "cover" ? "xMidYMid slice" :
    def.fit === "fill" ? "none" :
    "xMidYMid meet"

  const player = (
    <LottiePlayer
      name={def.jsonName}
      transform={transform}
      speed={speed}
      loop={loop}
      autoplay={autoplay}
      onComplete={onComplete}
      preserveAspectRatio={preserveAspectRatio}
      className={def.backgroundImageField ? "absolute inset-0 w-full h-full" : className}
    />
  )

  // Si la animación usa imagen de fondo, la renderizamos como capa CSS detrás
  // (object-cover: llena cualquier orientación, sin efectos ni distorsión).
  if (def.backgroundImageField) {
    const bgSrc = merged[def.backgroundImageField]
    return (
      <div className={`relative overflow-hidden bg-black ${className ?? ""}`}>
        {typeof bgSrc === "string" && bgSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bgSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {player}
      </div>
    )
  }

  return player
}
