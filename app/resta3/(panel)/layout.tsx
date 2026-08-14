// BrandProvider para que Resta3Nav pueda leer logo/nombre/acento del admin.
// mi-menu: sin auth guard — Resta3 (igual que Empleado) queda abierto sin login,
// solo Admin requiere sesión.
import { getSetting } from '@/lib/settingsDb'
import { getFeatureFlags } from '@/lib/features'
import BrandProvider from '@/app/components/BrandProvider'
import RightRail from '@/app/components/RightRail'

export const dynamic = 'force-dynamic'

const THEME_INIT = `try{var t=localStorage.getItem('admin_theme')||'light';document.documentElement.setAttribute('data-admin-theme',t);}catch(e){}`

export default async function Resta3Layout({ children }: { children: React.ReactNode }) {
  const [name, menuLogo, profileLogo, logoColor, logoBg, accent, r3Name, r3Logo, r3Accent, features] = await Promise.all([
    getSetting('restaurant_name'),
    getSetting('menu_logo'),
    getSetting('profile_logo'),
    getSetting('menu_logo_color'),
    getSetting('menu_bg_color'),
    getSetting('menu_hover_color'),
    getSetting('resta3_name'),
    getSetting('resta3_logo'),
    getSetting('resta3_accent'),
    getFeatureFlags(),
  ])
  const logo = menuLogo || profileLogo

  const finalAccent = r3Accent || accent
  const accentCss = /^#[0-9a-fA-F]{6}$/.test(finalAccent) ? finalAccent : '#B90F45'

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      <style dangerouslySetInnerHTML={{ __html: `:root { --ad-accent: ${accentCss}; }` }} />
      <BrandProvider value={{
        name:      r3Name   || name,
        logo:      r3Logo   || logo,
        // El resta3_logo propio no se recolorea; solo el fallback al general.
        logoColor: r3Logo   ? '' : logoColor,
        logoBg,
        accent:    finalAccent,
        features,
      }}>
        <RightRail>
          {children}
        </RightRail>
      </BrandProvider>
    </>
  )
}
