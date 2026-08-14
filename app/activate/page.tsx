// Suspense wrapper obligatorio: ActivateClient usa useSearchParams(), que lanza en SSR sin él (Next.js 16 App Router).
import { Suspense } from 'react'
import ActivateClient from './ActivateClient'

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center">
          <span className="text-5xl animate-pulse">☕</span>
        </div>
      }
    >
      <ActivateClient />
    </Suspense>
  )
}
