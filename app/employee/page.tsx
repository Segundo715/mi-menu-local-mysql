// El sidebar de empleado solo enlaza a /employee/menu, así que /employee redirige ahí directamente.
import { redirect } from 'next/navigation'

export default function EmployeePage() {
  redirect('/employee/menu')
}
