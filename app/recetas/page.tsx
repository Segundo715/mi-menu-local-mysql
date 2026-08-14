// Alias de /resetas aún sin implementar; muestra un placeholder "Próximamente".
// La ruta activa con branding completo es app/resetas/page.tsx.
export default function RecetasPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5" style={{ backgroundColor: '#000' }}>
      <img src="/logo.png" alt="Logo" className="h-16 w-auto mb-4" />
      <h1 className="text-white text-xl font-black">Recetas</h1>
      <p className="text-sm mt-1" style={{ color: '#B90F45' }}>Próximamente</p>
    </div>
  )
}
