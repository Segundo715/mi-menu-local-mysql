'use client'

// Pantalla de destino cuando FeatureGuard detecta que el módulo está deshabilitado en lib/features.ts.
export default function Bloqueado() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', textAlign: 'center', padding: '24px', background: '#0a0a0a' }}>
      <div style={{ fontSize: '56px', marginBottom: '20px' }}>🔒</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
        Función no disponible
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '280px' }}>
        Esta sección no está habilitada en este restaurante.
      </p>
    </div>
  )
}
