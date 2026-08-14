'use client'

// Recetario de solo lectura para el empleado: mismos datos que admin/recipes pero sin edición.
import { useState, useEffect } from 'react'
import EmployeeNav from '@/app/components/EmployeeNav'
import { Icon } from '@/app/components/Icon'

const S = {
  bg: '#0a0a0a', card: '#111', accent: '#B90F45',
  text: '#f5f5f5', sub: '#777', border: 'rgba(255,255,255,0.08)',
}

interface Recipe {
  id: string
  name: string
  description: string
  category: string
  ingredients: string[]
  steps: string[]
  imageUrl?: string
  createdAt: string
}

export default function EmployeeRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Recipe | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todas')

  useEffect(() => {
    fetch('/api/recipes')
      .then(r => r.json())
      .then(d => { setRecipes(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const categories = ['Todas', ...Array.from(new Set(recipes.map(r => r.category))).sort()]

  const filtered = recipes.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'Todas' || r.category === activeCategory
    return matchSearch && matchCat
  })

  return (
    <div className="min-h-screen md:ml-[240px] pb-24" style={{ backgroundColor: S.bg }}>
      <EmployeeNav />
      <div className="max-w-[900px] mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="pt-2">
          <h1 className="text-xl font-black flex items-center gap-2" style={{ color: S.text }}><Icon name="book" size={20} /> Recetario</h1>
          <p className="text-xs mt-0.5" style={{ color: S.sub }}>
            {loading ? 'Cargando...' : `${recipes.length} receta${recipes.length !== 1 ? 's' : ''} disponibles`}
          </p>
        </div>

        {/* Buscar */}
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar receta..."
          className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
          style={{ backgroundColor: S.card, color: S.text, border: `1px solid ${S.border}` }}
        />

        {/* Filtros de categoría */}
        {!loading && categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0"
                style={activeCategory === cat
                  ? { backgroundColor: S.accent, color: '#fff' }
                  : { backgroundColor: S.card, color: S.sub, border: `1px solid ${S.border}` }}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="text-center py-16 text-sm" style={{ color: S.sub }}>Cargando recetas...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-2xl text-sm"
            style={{ color: S.sub, backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            No hay recetas{search ? ' con ese nombre' : ''}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(recipe => (
              <button key={recipe.id} onClick={() => setSelected(recipe)}
                className="text-left rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
                style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                {recipe.imageUrl
                  ? <img src={recipe.imageUrl} alt={recipe.name} className="w-full object-cover" style={{ height: '170px' }} />
                  : <div className="w-full flex items-center justify-center" style={{ height: '100px', backgroundColor: '#1a1a1a', color: S.sub }}><Icon name="book" size={40} /></div>
                }
                <div className="p-4">
                  <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${S.accent}22`, color: S.accent }}>{recipe.category}</span>
                  <p className="font-black text-base mt-2" style={{ color: S.text }}>{recipe.name}</p>
                  {recipe.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: S.sub }}>{recipe.description}</p>
                  )}
                  <p className="text-xs mt-2 font-medium" style={{ color: S.sub }}>
                    {recipe.ingredients.length} ingredientes · {recipe.steps.length} pasos
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
          onClick={() => setSelected(null)}>
          <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
            style={{ backgroundColor: '#111', border: `1px solid ${S.border}` }}
            onClick={e => e.stopPropagation()}>

            {selected.imageUrl
              ? <img src={selected.imageUrl} alt={selected.name}
                  className="w-full object-cover rounded-t-3xl" style={{ height: '230px' }} />
              : <div className="w-full flex items-center justify-center rounded-t-3xl"
                  style={{ height: '130px', backgroundColor: '#1a1a1a', color: S.sub }}><Icon name="book" size={48} /></div>
            }

            <div className="p-5 space-y-5">
              {/* Encabezado */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${S.accent}22`, color: S.accent }}>{selected.category}</span>
                  <h2 className="text-2xl font-black mt-1" style={{ color: S.text }}>{selected.name}</h2>
                  {selected.description && <p className="text-sm mt-1" style={{ color: S.sub }}>{selected.description}</p>}
                </div>
                <button onClick={() => setSelected(null)} aria-label="Cerrar" className="shrink-0 mt-1 inline-flex items-center" style={{ color: S.sub }}><Icon name="x" size={20} /></button>
              </div>

              {/* Ingredientes */}
              <div className="rounded-2xl p-4 space-y-2" style={{ backgroundColor: '#1a1a1a' }}>
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: S.accent }}>
                  Ingredientes ({selected.ingredients.length})
                </p>
                <ul className="space-y-1.5">
                  {selected.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm" style={{ color: S.text }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: S.accent }} />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pasos */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: S.accent }}>
                  Preparación ({selected.steps.length} pasos)
                </p>
                <ol className="space-y-3">
                  {selected.steps.map((step, i) => (
                    <li key={i} className="flex gap-3" style={{ color: S.text }}>
                      <span className="font-black shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs"
                        style={{ backgroundColor: S.accent, color: '#fff' }}>{i + 1}</span>
                      <span className="text-sm pt-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
