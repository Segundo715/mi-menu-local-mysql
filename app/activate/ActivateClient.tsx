'use client'

// Lee ?id= de la URL, llama PATCH /api/customers/:id {action:'confirm'}, mueve el ID de
// loyalty_pending_id → loyalty_id en localStorage y redirige a / tras 3 s.
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

type Status = 'loading' | 'done' | 'error'

export default function ActivateClient() {
  const params = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')
  const [customerName, setCustomerName] = useState('')

  useEffect(() => {
    const id = params.get('id')
    if (!id) { queueMicrotask(() => setStatus('error')); return }

    fetch(`/api/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm' }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) {
          setCustomerName(data.name)
          localStorage.removeItem('loyalty_pending_id')
          localStorage.setItem('loyalty_id', id)
          setStatus('done')
          setTimeout(() => router.replace('/'), 3000)
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [params, router])

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center">
        <div className="text-center text-zinc-100 space-y-3">
          <span className="text-6xl animate-pulse">☕</span>
          <p className="font-semibold text-lg">Activando tu tarjeta...</p>
        </div>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center p-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center w-full max-w-sm shadow-2xl">
          <p className="text-6xl mb-4">🎉</p>
          <h1 className="text-2xl font-bold text-amber-400 mb-2">
            ¡Tarjeta activada, {customerName}!
          </h1>
          <p className="text-zinc-400 text-sm">
            Redirigiendo a tu tarjeta en unos segundos...
          </p>
          <div className="mt-4">
            <button
              onClick={() => router.replace('/')}
              className="text-amber-400 underline text-sm"
            >
              Ir ahora
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center w-full max-w-sm shadow-2xl">
        <p className="text-5xl mb-4">❌</p>
        <h1 className="text-xl font-bold text-zinc-100 mb-2">Link inválido</h1>
        <p className="text-zinc-400 text-sm">
          Este link puede haber expirado o ya fue usado. Pide uno nuevo al negocio.
        </p>
      </div>
    </div>
  )
}
