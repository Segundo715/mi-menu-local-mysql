// Server component: misma estructura que admin/layout pero protege con employee_session cookie.
// Lee settings en servidor para BrandProvider sin parpadeo.
import Script from 'next/script'
import { getSetting } from '@/lib/settingsDb'
import { getFeatureFlags } from '@/lib/features'
import BrandProvider from '@/app/components/BrandProvider'
import FeatureGuard from '@/app/components/FeatureGuard'

export const dynamic = 'force-dynamic'

// Aplica el tema guardado antes de pintar para evitar el "flash" de tema incorrecto.
const THEME_INIT = `try{var t=localStorage.getItem('admin_theme')||'light';document.documentElement.setAttribute('data-admin-theme',t);}catch(e){}`

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  // Se leen en el servidor para que el nombre/logo/color estén presentes desde el primer render.
  const [name, menuLogo, profileLogo, logoColor, logoBg, accent, empAccent, empLogo, features] = await Promise.all([
    getSetting('restaurant_name'),
    getSetting('menu_logo'),
    getSetting('profile_logo'),
    getSetting('menu_logo_color'),
    getSetting('menu_bg_color'),
    getSetting('menu_hover_color'),
    getSetting('employee_accent'),
    getSetting('employee_logo'),
    getFeatureFlags(),
  ])
  const logo = menuLogo || profileLogo
  const finalAccent = empAccent || accent
  const finalLogo   = empLogo   || logo
  // El recoloreado es del logo general — si el empleado tiene su propio logo
  // (empLogo), ese no se toca; solo se recolorea cuando se usa el fallback.
  const finalLogoColor = empLogo ? '' : logoColor

  const scroll = /^#[0-9a-fA-F]{6}$/.test(finalAccent) ? finalAccent : '#B90F45'

  return (
    <>
      <Script id="employee-theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      <style dangerouslySetInnerHTML={{ __html: `:root { --ad-accent: ${scroll}; }` }} />
      <BrandProvider value={{ name, logo: finalLogo, logoColor: finalLogoColor, logoBg, accent: finalAccent, features }}>
        {/* FeatureGuard redirige al inicio si el empleado intenta acceder a un módulo desactivado */}
        <FeatureGuard />
        {children}
      </BrandProvider>
    </>
  )
}
