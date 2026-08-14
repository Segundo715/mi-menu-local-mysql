// El sidebar de RESTA3 solo enlaza a /resta3/menu, así que /resta3 redirige ahí directamente.
import { redirect } from 'next/navigation'

export default function Resta3Page() {
  redirect('/resta3/menu')
}
