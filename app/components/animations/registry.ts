import { sampleDef } from "./sample"
import { promoDef } from "./promo"
import { destacadoDef } from "./destacado"
import type { AnimationDef } from "./types"

export const ANIMATIONS: AnimationDef[] = [destacadoDef, promoDef, sampleDef]

export function findAnimation(id: string | undefined | null): AnimationDef | null {
  if (!id) return null
  return ANIMATIONS.find(a => a.id === id) ?? null
}
