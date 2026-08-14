// Único propósito: redirigir / → /menu en el servidor (sin flash de cliente).
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/menu')
}
