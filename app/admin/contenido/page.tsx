'use client'

// Programador de posts para redes sociales (Instagram, TikTok, Facebook, WhatsApp).
// Estado solo en memoria; no conecta a APIs de publicación real.
import { useState } from 'react'
import AdminNav from '@/app/components/AdminNav'
import { Icon, type IconName } from '@/app/components/Icon'

const S = {
  bg:     'var(--ad-bg)',
  card:   'var(--ad-card)',
  accent: 'var(--ad-accent)',
  text:   'var(--ad-text)',
  sub:    'var(--ad-sub)',
  border: 'var(--ad-border)',
  input:  '#0a0e1c',
}

const inputStyle = { backgroundColor: S.input, color: S.text, border: `1px solid rgba(0,230,118,0.25)` }
const INPUT_CLS = 'w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors'

interface Post {
  id: number; platform: string; caption: string; scheduledAt: string; status: 'scheduled' | 'published' | 'draft'
}

const PLATFORMS: { name: string; color: string; icon: IconName }[] = [
  { name: 'Instagram', color: '#c084fc', icon: 'camera' },
  { name: 'TikTok',    color: '#f87171', icon: 'music' },
  { name: 'Facebook',  color: '#60a5fa', icon: 'thumbsUp' },
  { name: 'WhatsApp',  color: S.accent,  icon: 'message' },
]

const INITIAL_POSTS: Post[] = [
  { id: 1, platform: 'Instagram', caption: '☕ ¡Empieza tu día con nuestro café de especialidad! Granos 100% de origen, tostados a la perfección. #CafeMañana', scheduledAt: '2026-05-22 09:00', status: 'scheduled' },
  { id: 2, platform: 'TikTok',    caption: '¿Ya conoces nuestra bebida del mes? El Matcha Latte que todos están probando 🍵✨', scheduledAt: '2026-05-22 15:00', status: 'scheduled' },
  { id: 3, platform: 'Facebook',  caption: 'Reserva tu mesa para el fin de semana y disfruta de nuestro brunch especial. ¡Cupo limitado!', scheduledAt: '2026-05-23 10:00', status: 'draft' },
  { id: 4, platform: 'Instagram', caption: 'Un momento de calidad merece un café de calidad. Visítanos hoy ☕', scheduledAt: '2026-05-21 12:00', status: 'published' },
  { id: 5, platform: 'WhatsApp',  caption: '¡Hola! Tienes un café gratis esperándote 🎉 Ya completaste tus 5 sellos. Ven a canjearlo esta semana.', scheduledAt: '2026-05-22 11:00', status: 'scheduled' },
]

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  scheduled: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Programado' },
  published: { bg: 'rgba(34,197,94,0.15)',  color: '#4ade80', label: 'Publicado'  },
  draft:     { bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc', label: 'Borrador'   },
}

export default function AdminContenidoPage() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ platform: 'Instagram', caption: '', scheduledAt: '' })

  const scheduled = posts.filter(p => p.status === 'scheduled').length
  const published = posts.filter(p => p.status === 'published').length

  function addPost() {
    if (!form.caption.trim()) return
    setPosts(prev => [...prev, {
      id: Date.now(), platform: form.platform, caption: form.caption.trim(),
      scheduledAt: form.scheduledAt || 'Sin fecha', status: form.scheduledAt ? 'scheduled' : 'draft',
    }])
    setForm({ platform: 'Instagram', caption: '', scheduledAt: '' })
    setShowForm(false)
  }

  function deletePost(id: number) {
    if (!confirm('¿Eliminar este post?')) return
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  function publish(id: number) {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'published' as const } : p))
  }

  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16" style={{ backgroundColor: S.bg }}>
      <AdminNav />

      <div className="max-w-3xl mx-auto p-4 space-y-5">
        <div className="flex items-center justify-between pt-1">
          <h1 className="text-xl font-black" style={{ color: S.text }}>Contenido</h1>
          <button onClick={() => setShowForm(p => !p)}
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ backgroundColor: S.accent, color: '#000' }}>
            + Nuevo post
          </button>
        </div>

        {/* Platform stats */}
        <div className="grid grid-cols-4 gap-2">
          {PLATFORMS.map(p => {
            const count = posts.filter(post => post.platform === p.name).length
            return (
              <div key={p.name} className="rounded-2xl p-3 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                <p className="flex justify-center mb-0.5" style={{ color: p.color }}><Icon name={p.icon} size={18} /></p>
                <p className="font-black text-lg" style={{ color: p.color }}>{count}</p>
                <p className="text-[10px] font-medium" style={{ color: S.sub }}>{p.name}</p>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Programados', value: scheduled, color: '#fbbf24' },
            { label: 'Publicados', value: published, color: '#4ade80' },
            { label: 'Borradores', value: posts.filter(p => p.status === 'draft').length, color: '#a5b4fc' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-center" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: S.sub }}>{s.label}</p>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            <h2 className="font-bold" style={{ color: S.accent }}>Nuevo post</h2>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Plataforma</label>
              <select value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}
                className={INPUT_CLS} style={inputStyle}>
                {PLATFORMS.map(pl => <option key={pl.name} value={pl.name}>{pl.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Contenido *</label>
              <textarea value={form.caption} onChange={e => setForm(p => ({ ...p, caption: e.target.value }))}
                placeholder="Escribe el texto del post..." rows={3}
                className={INPUT_CLS + ' resize-none'} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: S.sub }}>Fecha y hora (opcional)</label>
              <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
                className={INPUT_CLS} style={inputStyle} />
            </div>
            <div className="flex gap-2">
              <button onClick={addPost}
                className="flex-1 font-bold py-2.5 rounded-xl text-sm"
                style={{ backgroundColor: S.accent, color: '#000' }}>
                Guardar
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 font-bold py-2.5 rounded-xl text-sm"
                style={{ border: `1px solid ${S.border}`, color: S.sub, backgroundColor: 'transparent' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Posts list */}
        <div className="space-y-3">
          {posts.map(post => {
            const pl = PLATFORMS.find(p => p.name === post.platform)
            const st = STATUS_STYLE[post.status]
            return (
              <div key={post.id} className="rounded-2xl p-4"
                style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {pl && <span style={{ color: pl.color }}><Icon name={pl.icon} size={16} /></span>}
                    <span className="text-sm font-bold" style={{ color: pl?.color }}>{post.platform}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <span className="text-xs" style={{ color: S.sub }}>{post.scheduledAt}</span>
                </div>
                <p className="text-sm" style={{ color: S.text }}>{post.caption}</p>
                <div className="flex gap-2 mt-3">
                  {post.status === 'draft' && (
                    <button onClick={() => publish(post.id)}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold"
                      style={{ backgroundColor: S.accent, color: '#000' }}>
                      Publicar ahora
                    </button>
                  )}
                  <button onClick={() => deletePost(post.id)}
                    className="flex-1 py-1.5 rounded-xl text-xs font-medium"
                    style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', backgroundColor: 'transparent' }}>
                    Eliminar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
