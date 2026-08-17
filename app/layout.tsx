// translate="no" y data-gramm* en <html>/<body> evitan que extensiones de traducción y Grammarly
// muten el DOM fuera de React, lo que provocaba errores removeChild en producción.
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import FeatureGuard from "@/app/components/FeatureGuard";
import BrandProvider from "@/app/components/BrandProvider";
import { getSetting } from "@/lib/settingsDb";
import { getFeatureFlags } from "@/lib/features";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chubis",
  description: "Tarjeta de fidelización Chubis — acumula 5 visitas y gana un café gratis",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Revalida cada 60s las páginas estáticas (menu, recetas, card, etc.) para
// que el --ad-accent global (ver abajo) refleje cambios de color recientes
// sin forzar renderizado dinámico en todo el sitio (admin/employee/resta3 ya
// declaran su propio `dynamic = 'force-dynamic'` y no se ven afectados).
export const revalidate = 60;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fallback global de --ad-accent para páginas fuera de /admin, /employee y
  // /resta3 (que ya inyectan su propio override): /menu, /card, /review,
  // /recetas, /registro, /tv, etc. Sin esto, cualquier CSS que use
  // var(--ad-accent, #B90F45) — como el scrollbar de globals.css — cae al
  // guinda fijo en vez del acento configurado en "Identidad del restaurante".
  // También se prefetchan nombre/logo/colores para pasarlos a BrandProvider:
  // /menu, /review y /card* los usan como valor inicial (en vez de un string
  // vacío o '/logo.png' hardcodeado) para no mostrar la marca anterior un
  // instante mientras su propio fetch client-side todavía no resuelve.
  const [menuHover, sidebarAccent, name, menuLogo, profileLogo, logoColor, logoBg, features] = await Promise.all([
    getSetting('menu_hover_color'),
    getSetting('sidebar_accent'),
    getSetting('restaurant_name'),
    getSetting('menu_logo'),
    getSetting('profile_logo'),
    getSetting('menu_logo_color'),
    getSetting('menu_bg_color'),
    getFeatureFlags(),
  ])
  const accent = menuHover || sidebarAccent || '#B90F45'
  const accentCss = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#B90F45'
  const logo = menuLogo || profileLogo

  return (
    <html
      lang="es"
      translate="no"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // admin/employee/resta3 layouts setean data-admin-theme en este <html> vía script
      // antes de hidratar, para evitar el flash de tema — eso difiere del render del
      // servidor a propósito, así que se suprime la advertencia de hidratación aquí.
      suppressHydrationWarning
    >
      <head>
        <meta name="google" content="notranslate" />
        <style dangerouslySetInnerHTML={{ __html: `:root { --ad-accent: ${accentCss}; }` }} />
      </head>
      <body
        className="min-h-full flex flex-col"
        suppressHydrationWarning
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        spellCheck="false"
      >
        <FeatureGuard />
        <BrandProvider value={{ name, logo, logoColor, logoBg, accent, features }}>
          {children}
        </BrandProvider>
      </body>
    </html>
  );
}
