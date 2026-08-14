import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getSetting } from '@/lib/settingsDb'

export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

// Se regenera en cada request (getSetting pega a Supabase) para reflejar
// el logo/color que se configuren en /admin/configuracion sin rebuild.
export default async function Icon() {
  const [menuLogo, menuAccent, profileLogo, sidebarAccent] = await Promise.all([
    getSetting('menu_logo', ''),
    getSetting('menu_hover_color', ''),
    getSetting('profile_logo', ''),
    getSetting('sidebar_accent', ''),
  ])
  const accent = menuAccent || sidebarAccent || '#B90F45'

  let logoSrc = menuLogo || profileLogo
  if (!logoSrc) {
    const buf = await readFile(path.join(process.cwd(), 'public', 'logo.png'))
    logoSrc = `data:image/png;base64,${buf.toString('base64')}`
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: accent,
          borderRadius: 12,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={44} height={44} style={{ objectFit: 'contain' }} alt="" />
      </div>
    ),
    { ...size }
  )
}
