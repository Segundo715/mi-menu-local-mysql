// El sidebar de admin no enlaza a este dashboard (era wireframe/demo de fidelización),
// así que /admin redirige directo a /admin/menu.
import { redirect } from 'next/navigation'

export default function AdminPage() {
  redirect('/admin/menu')
}
