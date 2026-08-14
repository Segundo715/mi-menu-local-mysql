'use client'

import { useState, useEffect, useRef } from 'react'

const TERMINOS = `Al registrarte aceptas que usemos tu nombre, número de WhatsApp y fecha de nacimiento únicamente para enviarte una felicitación o promoción especial en tu cumpleaños. No compartiremos tus datos con terceros. Puedes solicitar la eliminación de tus datos en cualquier momento contactándonos directamente.`
const PRIVACIDAD = `Tu información personal (nombre, teléfono y fecha de nacimiento) se almacena de forma segura y se usa exclusivamente para el programa de cumpleaños. No realizamos publicidad no solicitada ni vendemos datos personales. En cumplimiento de la legislación aplicable puedes ejercer tus derechos de acceso, rectificación y cancelación contactando al restaurante.`

function isBirthdayToday(birthdate: string): boolean {
  const [, m, d] = birthdate.split('-').map(Number)
  const now = new Date()
  return m === now.getMonth() + 1 && d === now.getDate()
}

function playManianitas() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const notes: [number, number][] = [
      [329.63,0.32],[329.63,0.32],[440,0.38],[440,0.38],[493.88,0.44],[440,0.55],[0,0.18],
      [392,0.32],[369.99,0.28],[329.63,0.32],[293.66,0.32],[329.63,0.44],[220,0.65],[0,0.18],
      [329.63,0.32],[329.63,0.32],[440,0.38],[440,0.38],[493.88,0.44],[440,0.55],[0,0.18],
      [392,0.32],[369.99,0.28],[329.63,0.32],[293.66,0.32],[329.63,0.75],
    ]
    let t = ctx.currentTime + 0.1
    for (const [freq, dur] of notes) {
      if (freq > 0) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.3, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.88)
        osc.start(t); osc.stop(t + dur)
      }
      t += dur + 0.05
    }
  } catch { /* no disponible */ }
}

/* ─── Confetti mejorado (rectángulos + círculos + triángulos) ─── */
function Confetti({ count = 160 }: { count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const colors = ['#f59e0b','#ef4444','#8b5cf6','#06b6d4','#10b981','#f97316','#ec4899','#facc15','#a3e635']
    type Shape = 'rect' | 'circle' | 'tri'
    const shapes: Shape[] = ['rect','rect','circle','tri']
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: -30 - Math.random() * 400,
      vx: (Math.random() - 0.5) * 4,
      vy: 2.5 + Math.random() * 3.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 5 + Math.random() * 9,
      angle: Math.random() * Math.PI * 2,
      va: (Math.random() - 0.5) * 0.12,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      opacity: 0.7 + Math.random() * 0.3,
    }))
    let id: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.angle += p.va; p.vy += 0.04
        if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; p.vy = 2.5 + Math.random() * 3.5 }
        ctx.save(); ctx.globalAlpha = p.opacity; ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.fillStyle = p.color
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else if (p.shape === 'circle') {
          ctx.beginPath(); ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2); ctx.fill()
        } else {
          ctx.beginPath(); ctx.moveTo(0, -p.size / 2); ctx.lineTo(p.size / 2, p.size / 2); ctx.lineTo(-p.size / 2, p.size / 2); ctx.closePath(); ctx.fill()
        }
        ctx.restore()
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [count])
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-10" />
}

/* ─── Fuegos artificiales canvas ─── */
function Fireworks() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    type Particle = { x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number; size: number }
    const particles: Particle[] = []
    const colors = ['#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#facc15','#a3e635','#fff']
    function explode(x: number, y: number) {
      const c = colors[Math.floor(Math.random() * colors.length)]
      for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2
        const speed = 2 + Math.random() * 5
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color: c, life: 1, maxLife: 0.6 + Math.random() * 0.4, size: 2 + Math.random() * 3 })
      }
    }
    let id: number; let frame = 0
    const draw = () => {
      frame++
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      if (frame % 55 === 0) explode(Math.random() * canvas.width * 0.8 + canvas.width * 0.1, Math.random() * canvas.height * 0.5 + 80)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.018
        if (p.life <= 0) { particles.splice(i, 1); continue }
        ctx.globalAlpha = p.life / p.maxLife
        ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      id = requestAnimationFrame(draw)
    }
    explode(canvas.width * 0.3, canvas.height * 0.3)
    explode(canvas.width * 0.7, canvas.height * 0.25)
    draw()
    return () => cancelAnimationFrame(id)
  }, [])
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-10" />
}

/* ─── Globos flotantes ─── */
function Balloons() {
  const balloonColors = ['#ef4444','#f59e0b','#8b5cf6','#06b6d4','#10b981','#ec4899']
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-5">
      {balloonColors.map((color, i) => (
        <div key={i} className="absolute" style={{
          left: `${8 + i * 15}%`,
          bottom: '-120px',
          animation: `balloonRise ${6 + i * 1.2}s ease-in-out infinite`,
          animationDelay: `${i * 0.9}s`,
        }}>
          <svg width="40" height="55" viewBox="0 0 40 55">
            <ellipse cx="20" cy="18" rx="16" ry="18" fill={color} opacity="0.85" />
            <ellipse cx="14" cy="12" rx="5" ry="4" fill="rgba(255,255,255,0.25)" />
            <path d="M20 36 Q22 42 20 48 Q18 42 20 36" stroke={color} strokeWidth="1.5" fill="none" opacity="0.7" />
            <path d="M20 48 Q25 52 30 50" stroke="#94a3b8" strokeWidth="1" fill="none" opacity="0.5" />
          </svg>
        </div>
      ))}
    </div>
  )
}

/* ─── Estrellas/destellos ─── */
function Sparkles() {
  // Posiciones calculadas una sola vez (estado con inicializador perezoso) en vez de
  // llamar Math.random() directo en el render, que React marca como impuro.
  const [sparks] = useState(() =>
    Array.from({ length: 20 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      fontSize: 10 + Math.random() * 16,
      duration: 1.5 + Math.random() * 2,
      delay: Math.random() * 3,
    }))
  )
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-5">
      {sparks.map((s, i) => (
        <div key={i} className="absolute text-yellow-300" style={{
          left: `${s.left}%`,
          top: `${s.top}%`,
          fontSize: `${s.fontSize}px`,
          animation: `sparkle ${s.duration}s ease-in-out infinite`,
          animationDelay: `${s.delay}s`,
        }}>✦</div>
      ))}
    </div>
  )
}

/* ─── Pastel SVG mejorado ─── */
function AnimatedCake({ size = 220 }: { size?: number }) {
  const scale = size / 220
  return (
    <div className="flex justify-center my-2">
      <svg width={size} height={size} viewBox="0 0 220 220" style={{ filter: 'drop-shadow(0 8px 32px rgba(245,158,11,0.35))' }}>
        <defs>
          <linearGradient id="layer1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fce7f3" /><stop offset="100%" stopColor="#fbcfe8" />
          </linearGradient>
          <linearGradient id="layer2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ede9fe" /><stop offset="100%" stopColor="#ddd6fe" />
          </linearGradient>
          <linearGradient id="layer3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef9c3" /><stop offset="100%" stopColor="#fde68a" />
          </linearGradient>
          <linearGradient id="frost1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f9a8d4" /><stop offset="50%" stopColor="#e879f9" /><stop offset="100%" stopColor="#f9a8d4" />
          </linearGradient>
          <linearGradient id="frost2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a78bfa" /><stop offset="50%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="frost3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" /><stop offset="50%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>

        {/* Velas */}
        {[38, 58, 78, 98, 118, 138, 158].map((x, i) => {
          const candleColors = ['#ef4444','#f59e0b','#8b5cf6','#06b6d4','#10b981','#f97316','#ec4899']
          const h = i % 2 === 0 ? 30 : 22
          return (
            <g key={i}>
              <rect x={x - 4} y={65 - h} width={8} height={h} fill={candleColors[i]} rx="3" />
              {/* glow de la llama */}
              <ellipse cx={x} cy={63 - h} rx="8" ry="8" fill={candleColors[i]} opacity="0.2">
                <animate attributeName="r" values="8;12;8" dur={`${0.5 + i * 0.06}s`} repeatCount="indefinite" />
              </ellipse>
              {/* llama exterior */}
              <ellipse cx={x} cy={62 - h} rx="5" ry="9" fill="#fbbf24">
                <animate attributeName="ry" values="9;6;9" dur={`${0.4 + i * 0.07}s`} repeatCount="indefinite" />
                <animate attributeName="cy" values={`${62-h};${60-h};${62-h}`} dur={`${0.4 + i * 0.07}s`} repeatCount="indefinite" />
              </ellipse>
              {/* llama interior */}
              <ellipse cx={x} cy={62 - h} rx="3" ry="5.5" fill="#fff7ed" opacity="0.9">
                <animate attributeName="ry" values="5.5;3.5;5.5" dur={`${0.4 + i * 0.07}s`} repeatCount="indefinite" />
              </ellipse>
              {/* pabilo */}
              <line x1={x} y1={65-h} x2={x} y2={63-h} stroke="#1e293b" strokeWidth="1.5" />
            </g>
          )
        })}

        {/* Capa superior */}
        <rect x="38" y="65" width="144" height="42" fill="url(#layer1)" rx="10" />
        <rect x="38" y="65" width="144" height="13" fill="url(#frost1)" rx="6" />
        {/* zigzag frosting */}
        <path d="M38,78 L50,68 L62,78 L74,68 L86,78 L98,68 L110,78 L122,68 L134,78 L146,68 L158,78 L170,68 L182,78" stroke="white" strokeWidth="2" fill="none" opacity="0.5" />
        {/* drips capa 1 */}
        {[55,80,105,130,155].map((x,i) => (
          <path key={i} d={`M${x},65 Q${x+5},80 ${x+2},90`} stroke="#f9a8d4" strokeWidth="4" fill="none" strokeLinecap="round" />
        ))}
        {/* decoraciones capa 1 */}
        {[58,82,106,130,155].map((x,i) => (
          <g key={i}>
            <circle cx={x} cy={91} r="5.5" fill={['#ef4444','#8b5cf6','#f59e0b','#06b6d4','#10b981'][i]} />
            <circle cx={x} cy={91} r="2.5" fill="white" opacity="0.6" />
          </g>
        ))}

        {/* Capa media */}
        <rect x="22" y="107" width="176" height="48" fill="url(#layer2)" rx="10" />
        <rect x="22" y="107" width="176" height="13" fill="url(#frost2)" rx="6" />
        <path d="M22,120 L36,110 L50,120 L64,110 L78,120 L92,110 L106,120 L120,110 L134,120 L148,110 L162,120 L176,110 L198,120" stroke="white" strokeWidth="2" fill="none" opacity="0.4" />
        {[42,72,102,132,162].map((x,i) => (
          <path key={i} d={`M${x},107 Q${x+5},121 ${x+2},128`} stroke="#a78bfa" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        ))}
        {[52,82,110,138,168].map((x,i) => (
          <text key={i} x={x} y={137} fontSize="10" textAnchor="middle" opacity="0.8">{'⭐🌸💎🎀✨'[i]}</text>
        ))}

        {/* Capa inferior */}
        <rect x="6" y="155" width="208" height="44" fill="url(#layer3)" rx="10" />
        <rect x="6" y="155" width="208" height="13" fill="url(#frost3)" rx="6" />
        <path d="M6,168 L22,158 L38,168 L54,158 L70,168 L86,158 L102,168 L118,158 L134,168 L150,158 L166,168 L182,158 L198,168 L214,158" stroke="white" strokeWidth="2" fill="none" opacity="0.4" />
        {[26,58,90,122,154,186].map((x,i) => (
          <path key={i} d={`M${x},155 Q${x+6},169 ${x+2},176`} stroke="#fbbf24" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        ))}

        {/* Plato */}
        <ellipse cx="110" cy="202" rx="105" ry="9" fill="rgba(148,163,184,0.3)" />
        <ellipse cx="110" cy="200" rx="100" ry="6" fill="rgba(226,232,240,0.5)" />
      </svg>
    </div>
  )
}

/* ─── Orbes de fondo animados ─── */
function BgOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {[
        { color:'#7c3aed', size:500, left:'10%', top:'20%', dur:'18s' },
        { color:'#be185d', size:400, left:'70%', top:'60%', dur:'22s' },
        { color:'#1d4ed8', size:350, left:'50%', top:'10%', dur:'16s' },
        { color:'#0f766e', size:300, left:'20%', top:'70%', dur:'20s' },
      ].map((o, i) => (
        <div key={i} className="absolute rounded-full" style={{
          width: o.size, height: o.size,
          left: o.left, top: o.top,
          background: o.color,
          filter: 'blur(120px)',
          opacity: 0.18,
          animation: `orbFloat ${o.dur} ease-in-out infinite alternate`,
          animationDelay: `${i * 2}s`,
          transform: 'translate(-50%,-50%)',
        }} />
      ))}
    </div>
  )
}

type Step = 'form' | 'success'

export default function CumpleanosPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<'terminos' | 'privacidad' | null>(null)
  const [isToday, setIsToday] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showFireworks, setShowFireworks] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cumpleanos_data')
      if (!saved) return
      const { name: n, birthdate: b } = JSON.parse(saved) as { name: string; birthdate: string }
      if (!n || !b) return
      const today = isBirthdayToday(b)
      queueMicrotask(() => {
        setName(n); setBirthdate(b)
        setIsToday(today)
        setShowConfetti(true)
        if (today) setShowFireworks(true)
        setStep('success')
      })
    } catch {}
  }, [])

  async function handleSubmit() {
    if (!name.trim() || !phone.trim() || !birthdate) { setError('Por favor completa todos los campos.'); return }
    if (!accepted) { setError('Debes aceptar los términos y condiciones.'); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/cumpleanos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), birthdate }),
      })
      if (!res.ok) {
        const d = await res.json(); setError(d.error ?? 'Error al registrar.')
      } else {
        const today = isBirthdayToday(birthdate)
        setIsToday(today)
        setShowConfetti(true)
        if (today) { setShowFireworks(true); setTimeout(playManianitas, 800) }
        setStep('success')
        localStorage.setItem('cumpleanos_data', JSON.stringify({ name: name.trim(), birthdate }))
      }
    } catch { setError('Error de conexión. Intenta de nuevo.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#08081a' }}>

      <style>{`
        @keyframes orbFloat { from { transform: translate(-50%,-50%) scale(1); } to { transform: translate(-50%,-50%) scale(1.3) translate(30px,20px); } }
        @keyframes balloonRise { 0%,100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-110vh) rotate(5deg); } }
        @keyframes sparkle { 0%,100% { opacity:0; transform: scale(0) rotate(0deg); } 50% { opacity:1; transform: scale(1) rotate(180deg); } }
        @keyframes float { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-14px) rotate(3deg); } }
        @keyframes popIn { 0% { opacity:0; transform: scale(0.4) rotate(-8deg); } 65% { transform: scale(1.06) rotate(2deg); } 100% { opacity:1; transform: scale(1) rotate(0); } }
        @keyframes fadeUp { from { opacity:0; transform: translateY(24px); } to { opacity:1; transform: translateY(0); } }
        @keyframes gradientShift { 0% { background-position:0% 50%; } 50% { background-position:100% 50%; } 100% { background-position:0% 50%; } }
        @keyframes letterDance { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes borderGlow { 0%,100% { box-shadow: 0 0 20px rgba(139,92,246,0.3), 0 0 40px rgba(139,92,246,0.1); } 50% { box-shadow: 0 0 40px rgba(236,72,153,0.5), 0 0 80px rgba(139,92,246,0.2); } }
        @keyframes starPop { 0% { transform: scale(0) rotate(0deg); opacity:0; } 50% { transform: scale(1.3) rotate(180deg); opacity:1; } 100% { transform: scale(1) rotate(360deg); opacity:0.8; } }
        .pop-in { animation: popIn 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .fade-up { animation: fadeUp 0.5s ease forwards; }
        .float { animation: float 3s ease-in-out infinite; }
        .border-glow { animation: borderGlow 3s ease-in-out infinite; }
        input:focus { outline: none; box-shadow: 0 0 0 2px rgba(139,92,246,0.5), 0 0 12px rgba(139,92,246,0.2); }
      `}</style>

      <BgOrbs />
      {showConfetti && <Confetti count={isToday ? 220 : 120} />}
      {showFireworks && <Fireworks />}
      {isToday && step === 'success' && <Balloons />}
      {isToday && step === 'success' && <Sparkles />}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-white">
              {modal === 'terminos' ? 'Términos y Condiciones' : 'Política de Privacidad'}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
              {modal === 'terminos' ? TERMINOS : PRIVACIDAD}
            </p>
            <button onClick={() => setModal(null)} className="w-full py-3 rounded-xl font-bold text-sm"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>
              Entendido
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md relative z-20">

        {/* ═══════════════ FORMULARIO ═══════════════ */}
        {step === 'form' && (
          <div className="rounded-3xl overflow-hidden shadow-2xl fade-up border-glow"
            style={{ backgroundColor: 'rgba(8,8,26,0.88)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.35)' }}>

            {/* Header con gradiente animado */}
            <div className="relative overflow-hidden text-center p-8 pb-6"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed,#a21caf,#be185d)', backgroundSize: '300% 300%', animation: 'gradientShift 5s ease infinite' }}>
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 25% 75%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(255,255,255,0.06) 0%, transparent 50%)' }} />
              <div className="relative">
                <div className="text-6xl mb-3 float inline-block">🎂</div>
                <h1 className="text-3xl font-black text-white drop-shadow-lg">Club de Cumpleaños</h1>
                <p className="text-sm mt-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.82)' }}>
                  Regístrate y recibe una sorpresa especial en tu día 🎁
                </p>
              </div>
              {/* estrellas decorativas */}
              {['⭐','✨','💫','🌟'].map((s,i) => (
                <span key={i} className="absolute text-lg" style={{ left: `${15+i*22}%`, top: `${10+i*18}%`, opacity: 0.5, animation: `sparkle ${2+i*0.5}s ease-in-out infinite`, animationDelay: `${i*0.4}s` }}>{s}</span>
              ))}
            </div>

            {/* Campos */}
            <div className="p-6 space-y-4">
              {error && (
                <div className="rounded-xl px-4 py-3 text-sm fade-up flex items-center gap-2"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5' }}>
                  ⚠️ {error}
                </div>
              )}

              {[
                { label: '👤 Nombre completo', type: 'text', value: name, onChange: setName, placeholder: 'Tu nombre completo' },
                { label: '📱 WhatsApp', type: 'tel', value: phone, onChange: setPhone, placeholder: '10 dígitos' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: '#a78bfa' }}>{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder}
                    className="w-full rounded-xl px-4 py-3.5 text-sm transition-all"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#f1f5f9', border: '1px solid rgba(139,92,246,0.3)' }} />
                </div>
              ))}

              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: '#a78bfa' }}>🎂 Fecha de nacimiento</label>
                <input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)}
                  className="w-full rounded-xl px-4 py-3.5 text-sm transition-all"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#f1f5f9', border: '1px solid rgba(139,92,246,0.3)', colorScheme: 'dark' }} />
              </div>

              <div className="flex items-start gap-3 pt-1">
                <input type="checkbox" id="terms" checked={accepted} onChange={e => setAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0" style={{ accentColor: '#a78bfa' }} />
                <label htmlFor="terms" className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                  Acepto los{' '}
                  <button type="button" onClick={() => setModal('terminos')} className="underline font-bold" style={{ color: '#c4b5fd' }}>Términos y Condiciones</button>
                  {' '}y la{' '}
                  <button type="button" onClick={() => setModal('privacidad')} className="underline font-bold" style={{ color: '#c4b5fd' }}>Política de Privacidad</button>
                </label>
              </div>

              <button type="button" onClick={handleSubmit} disabled={loading}
                className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-60 transition-all hover:scale-[1.02] active:scale-95 mt-2"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7,#ec4899)', backgroundSize: '300%', animation: 'gradientShift 4s ease infinite', color: '#fff', boxShadow: '0 6px 32px rgba(139,92,246,0.5)' }}>
                {loading ? '✨ Registrando...' : '🎉 ¡Registrarme!'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ ÉXITO NORMAL ═══════════════ */}
        {step === 'success' && !isToday && (
          <div className="rounded-3xl overflow-hidden shadow-2xl pop-in"
            style={{ backgroundColor: 'rgba(8,8,26,0.95)', border: '1px solid rgba(139,92,246,0.3)', backdropFilter: 'blur(20px)' }}>
            <div className="p-10 text-center relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed,#a21caf)', backgroundSize: '300%', animation: 'gradientShift 5s ease infinite' }}>
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(236,72,153,0.3) 0%, transparent 60%)' }} />
              <div className="text-7xl mb-4 float relative">🎊</div>
              <h2 className="text-3xl font-black text-white relative drop-shadow-lg">¡Ya eres parte del club!</h2>
              <p className="text-sm mt-2 relative" style={{ color: 'rgba(255,255,255,0.8)' }}>Tu lugar está reservado 🎁</p>
            </div>
            <div className="p-8 text-center space-y-3">
              <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <p className="text-base leading-relaxed" style={{ color: '#e2e8f0' }}>
                  Hola <strong style={{ color: '#c4b5fd', fontSize: '1.1em' }}>{name}</strong>, te enviaremos un mensaje de WhatsApp con una sorpresa especial cuando llegue tu cumpleaños. 🎂
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-1 text-2xl">
                {'🎈🎀🎁🎊🎉'.split('').map((e,i) => (
                  <span key={i} style={{ animation: `letterDance ${1+i*0.15}s ease-in-out infinite`, animationDelay: `${i*0.1}s`, display: 'inline-block' }}>{e}</span>
                ))}
              </div>
              <p className="text-xs" style={{ color: '#475569' }}>Puedes cerrar esta página.</p>
            </div>
          </div>
        )}

        {/* ═══════════════ CUMPLEAÑOS HOY ═══════════════ */}
        {step === 'success' && isToday && (
          <div className="pop-in space-y-4">
            {/* Card principal */}
            <div className="rounded-3xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'rgba(8,8,26,0.92)', border: '2px solid rgba(245,158,11,0.5)', backdropFilter: 'blur(20px)', boxShadow: '0 0 60px rgba(245,158,11,0.2), 0 20px 60px rgba(0,0,0,0.6)' }}>

              {/* Header dorado */}
              <div className="relative overflow-hidden p-6 text-center"
                style={{ background: 'linear-gradient(135deg,#451a03,#78350f,#92400e,#b45309,#d97706)', backgroundSize: '400%', animation: 'gradientShift 4s ease infinite' }}>
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
                <p className="text-xs font-black uppercase tracking-[0.3em] mb-2 relative" style={{ color: '#fde68a' }}>
                  ✦ ¡Hoy es tu día! ✦
                </p>
                {/* Texto animado letra por letra */}
                <div className="relative flex flex-wrap justify-center items-center gap-0">
                  {'🎂 Feliz Cumpleaños'.split('').map((ch, i) => (
                    <span key={i} className="text-3xl sm:text-4xl font-black text-white"
                      style={{ display:'inline-block', animation: `letterDance ${0.8+i*0.08}s ease-in-out infinite`, animationDelay: `${i*0.06}s`, textShadow: '0 0 20px rgba(245,158,11,0.8)', whiteSpace: ch === ' ' ? 'pre' : 'normal' }}>
                      {ch === ' ' ? ' ' : ch}
                    </span>
                  ))}
                </div>
                <p className="text-xl font-black mt-2 relative" style={{ color: '#fde68a', textShadow: '0 0 10px rgba(245,158,11,0.5)' }}>
                  {name} 🎉
                </p>
              </div>

              {/* Pastel */}
              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                <AnimatedCake size={220} />
              </div>

              {/* Acciones */}
              <div className="p-6 space-y-3">
                <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: '#e2e8f0' }}>
                    ¡Qué coincidencia tan especial! 🥳 Hoy es tu cumpleaños y acabas de unirte a nuestro club. Comunícate con nosotros para reclamar tu regalo.
                  </p>
                </div>

                <button onClick={playManianitas}
                  className="w-full py-4 rounded-2xl font-black text-base transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b,#fbbf24)', color: '#000', boxShadow: '0 4px 24px rgba(245,158,11,0.4)' }}>
                  🎵 Escuchar las Mañanitas
                </button>

                <button onClick={playManianitas}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(34,197,94,0.08))', color: '#4ade80', border: '1px solid rgba(34,197,94,0.35)' }}>
                  📲 Reclamar mi regalo por WhatsApp
                </button>
              </div>
            </div>

            {/* Estrellas decorativas alrededor */}
            <div className="flex justify-center gap-4 text-3xl">
              {'⭐🎊🎁🎈🎉'.split('').map((e,i) => (
                <span key={i} style={{ animation: `letterDance ${1+i*0.2}s ease-in-out infinite`, animationDelay: `${i*0.15}s`, display: 'inline-block' }}>{e}</span>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
