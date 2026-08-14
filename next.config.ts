import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['sharp'],
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.1.4',
    '192.168.1.8',
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
    '*.ngrok.io',
  ],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy',  value: "frame-ancestors 'self'" },
          { key: 'Permissions-Policy',       value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
      {
        // Assets estáticos de Next.js — también necesitan el header de seguridad
        source: '/_next/static/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        // Páginas HTML dinámicas — sin caché para que siempre sean frescas
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
    ]
  },
};

export default nextConfig;
