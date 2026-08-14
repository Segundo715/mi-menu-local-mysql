"use client"
// Dashboard de pantallas TV: sucursal → dispositivo → slides. El estado se persiste en
// localStorage (pantalla_dashboard_v1); no usa Supabase. Con animación Lottie activa,
// imagen/título/precio se ignoran en la reproducción.
import React, { useState, useEffect, DragEvent } from "react"
import AdminNav from "@/app/components/AdminNav"
import AnimationRenderer from "@/app/components/AnimationRenderer"
import AnimationEditorModal from "@/app/components/AnimationEditorModal"
import { findAnimation } from "@/app/components/animations/registry"
import type { AnimationParams } from "@/app/components/animations/types"

// Tokens del tema del admin (conmutan claro/oscuro vía data-admin-theme).
const S = {
  bg: 'var(--ad-bg)',
  card: 'var(--ad-card)',
  elevated: 'var(--ad-elevated)',
  accent: 'var(--ad-accent)',
  text: 'var(--ad-text)',
  sub: 'var(--ad-sub)',
  border: 'var(--ad-border)',
}
// Estilos reutilizables que respetan el tema.
const surface = { backgroundColor: S.card, borderColor: S.border } as const
const field = { backgroundColor: S.elevated, color: S.text, borderColor: S.border } as const

// --- TYPES ---
type Client = { id: string; name: string }
type Device = { id: string; clientId: string; name: string }
type ScreenData = { title: string; description: string; price: string; image: string; animation?: string; animationParams?: AnimationParams }
type Orientation = 'horizontal' | 'vertical'
type Screen = {
  id: string
  deviceId: string
  templateId: string
  order: number
  schedule: { start: string; end: string }
  duration: number // segundos que se muestra en el loop
  orientation?: Orientation
  data: ScreenData
}

const DEFAULT_DURATION = 5 // segundos por defecto si la pantalla no trae tiempo

const TEMPLATES = [
  { id: "template-promo", name: "Promoción Especial" },
  { id: "template-menu", name: "Menú Clásico" }
]

const STORAGE_KEY = "pantalla_dashboard_v1"

const generateId = (prefix: string) => prefix + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

export default function AdminTVPage() {
  // --- STATE (MVP sin backend API) ---
  const [clients, setClients] = useState<Client[]>([
    { id: "c1", name: "Sucursal Central" },
    { id: "c2", name: "Sucursal Norte" }
  ])
  const [devices, setDevices] = useState<Device[]>([
    { id: "d1", clientId: "c1", name: "TV Entrada Principal" },
    { id: "d2", clientId: "c1", name: "TV Caja" }
  ])
  const [screens, setScreens] = useState<Screen[]>([
    {
      id: "s1",
      deviceId: "d1",
      templateId: "template-promo",
      order: 0,
      schedule: { start: "00:00", end: "23:59" },
      duration: DEFAULT_DURATION,
      data: { title: "Hamburguesa Doble", description: "Carne 100% res con doble queso, tocino y papas a la francesa.", price: "$150", image: "" }
    }
  ])

  // UI State
  const [selectedClientId, setSelectedClientId] = useState<string>("c1")
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<boolean>(false)
  const [newScreenTemplate, setNewScreenTemplate] = useState<string>(TEMPLATES[0].id)

  // Drag State
  const [draggedScreenId, setDraggedScreenId] = useState<string | null>(null)

  // Editor de animación (modal a pantalla completa) abierto para qué screenId
  const [animEditorOpenFor, setAnimEditorOpenFor] = useState<string | null>(null)

  // Persistencia local
  const [loaded, setLoaded] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [origin, setOrigin] = useState("")

  // Cargar desde localStorage al montar
  useEffect(() => {
    // Hidratación desde localStorage: solo es posible tras montar en el cliente
    // (en SSR no existe `window`/`localStorage`). Por eso el setState va aquí; la
    // regla set-state-in-effect es un falso positivo para este caso de carga única.
    /* eslint-disable react-hooks/set-state-in-effect */
    setOrigin(window.location.origin)
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed.clients)) setClients(parsed.clients)
        if (Array.isArray(parsed.devices)) setDevices(parsed.devices)
        if (Array.isArray(parsed.screens)) setScreens(parsed.screens)
      }
    } catch {
      // ignore
    }
    setLoaded(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // Guardar en localStorage al cambiar (tras la carga inicial)
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ clients, devices, screens }))
    } catch {
      // ignore
    }
  }, [clients, devices, screens, loaded])

  const handleCopyUrl = (screenId: string) => {
    const url = `${window.location.origin}/admin/tv/pantalla/${screenId}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedId(screenId)
      setTimeout(() => setCopiedId(null), 1500)
    }).catch(() => {})
  }

  // --- DERIVED STATE ---
  const filteredDevices = devices.filter(d => d.clientId === selectedClientId)
  const currentDevice = devices.find(d => d.id === selectedDeviceId)
  const currentDeviceScreens = screens.filter(s => s.deviceId === selectedDeviceId).sort((a,b) => a.order - b.order)
  const selectedScreen = screens.find(s => s.id === selectedScreenId)

  // --- HANDLERS: CLIENTS (SUCURSALES) ---
  const handleAddClient = () => {
    const newClient: Client = {
      id: generateId("c"),
      name: "Nueva Sucursal"
    }
    setClients([...clients, newClient])
    setSelectedClientId(newClient.id)
    setSelectedDeviceId(null)
    setSelectedScreenId(null)
  }

  const handleDeleteClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    const deviceIds = devices.filter(d => d.clientId === clientId).map(d => d.id)
    const msg = `¿Eliminar la sucursal "${client?.name ?? clientId}"?` +
      (deviceIds.length ? ` Se borrarán también sus ${deviceIds.length} TV(s) y todas sus pantallas.` : "")
    if (!window.confirm(msg)) return

    setScreens(screens.filter(s => !deviceIds.includes(s.deviceId)))
    setDevices(devices.filter(d => d.clientId !== clientId))
    const remaining = clients.filter(c => c.id !== clientId)
    setClients(remaining)
    if (selectedClientId === clientId) {
      setSelectedClientId(remaining[0]?.id ?? "")
      setSelectedDeviceId(null)
      setSelectedScreenId(null)
    }
  }

  // --- HANDLERS: DEVICES ---
  const handleAddDevice = () => {
    if (!selectedClientId) return
    const newDevice: Device = {
      id: generateId("d"),
      clientId: selectedClientId,
      name: "Nueva TV"
    }
    setDevices([...devices, newDevice])
    setSelectedDeviceId(newDevice.id)
    setSelectedScreenId(null)
  }

  const handleUpdateDeviceName = (name: string) => {
    if (!currentDevice) return
    setDevices(devices.map(d => d.id === currentDevice.id ? { ...d, name } : d))
  }

  const handleDeleteDevice = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId)
    const screenCount = screens.filter(s => s.deviceId === deviceId).length
    const msg = `¿Eliminar la TV "${device?.name ?? deviceId}"?` +
      (screenCount ? ` Se borrarán también sus ${screenCount} pantalla(s).` : "")
    if (!window.confirm(msg)) return

    setScreens(screens.filter(s => s.deviceId !== deviceId))
    setDevices(devices.filter(d => d.id !== deviceId))
    if (selectedDeviceId === deviceId) {
      setSelectedDeviceId(null)
      setSelectedScreenId(null)
    }
  }

  // --- HANDLERS: SCREENS ---
  const handleAddScreen = (templateId: string) => {
    if (!currentDevice) return
    const newScreen: Screen = {
      id: generateId("s"),
      deviceId: currentDevice.id,
      templateId,
      order: currentDeviceScreens.length,
      schedule: { start: "00:00", end: "23:59" },
      duration: DEFAULT_DURATION,
      orientation: 'horizontal',
      data: { title: "Nuevo Título", description: "Añade una descripción...", price: "$0", image: "" }
    }
    setScreens([...screens, newScreen])
    setSelectedScreenId(newScreen.id)
  }

  const handleDeleteScreen = (screenId: string) => {
    const remaining = screens
      .filter(s => s.id !== screenId)
      .map(s => {
        // Recalcular el orden de las pantallas del mismo dispositivo
        if (s.deviceId === selectedDeviceId) {
          const newOrder = currentDeviceScreens
            .filter(cs => cs.id !== screenId)
            .findIndex(cs => cs.id === s.id)
          if (newOrder !== -1) return { ...s, order: newOrder }
        }
        return s
      })
    setScreens(remaining)
    if (selectedScreenId === screenId) setSelectedScreenId(null)
  }

  const handleUpdateScreen = (updates: Partial<Screen>) => {
    if (!selectedScreen) return
    setScreens(screens.map(s => s.id === selectedScreen.id ? { ...s, ...updates } : s))
  }

  const handleUpdateScreenData = (dataUpdates: Partial<ScreenData>) => {
    if (!selectedScreen) return
    handleUpdateScreen({ data: { ...selectedScreen.data, ...dataUpdates } })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        handleUpdateScreenData({ image: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  // --- DRAG & DROP HTML5 ---
  const onDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
    setDraggedScreenId(id)
    e.dataTransfer.effectAllowed = "move"
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const onDrop = (e: DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault()
    if (!draggedScreenId || draggedScreenId === targetId) return

    // Obtener ids de pantallas del dispositivo actual ordenados
    const deviceScreensIds = currentDeviceScreens.map(s => s.id)
    const oldIndex = deviceScreensIds.indexOf(draggedScreenId)
    const newIndex = deviceScreensIds.indexOf(targetId)

    // Reordenar en el array temporal
    const item = deviceScreensIds.splice(oldIndex, 1)[0]
    deviceScreensIds.splice(newIndex, 0, item)

    // Aplicar los nuevos order a todos los screens relevantes
    setScreens(screens.map(s => {
      if (s.deviceId === selectedDeviceId) {
        const orderIndex = deviceScreensIds.indexOf(s.id)
        if (orderIndex !== -1) return { ...s, order: orderIndex }
      }
      return s
    }))
    setDraggedScreenId(null)
  }

  // --- INLINE EDITOR (se renderiza dentro de cada row expandido) ---
  const renderEditorContent = (screen: Screen) => {
    const isVertical = screen.orientation === 'vertical'

    const previewBlock = (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold" style={{ color: S.text }}>Muestra en vivo</label>
          <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: S.sub }}>{isVertical ? 'Vertical · 9:16' : 'Horizontal · 16:9'}</span>
        </div>
        <div className="rounded-xl p-4 flex items-center justify-center border" style={surface}>
          <ScreenPreview screen={screen} />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: S.sub }}>Orientación</label>
          <div className="grid grid-cols-2 gap-2 border rounded-lg p-1" style={field}>
            {(['horizontal','vertical'] as const).map(o => {
              const active = (screen.orientation ?? 'horizontal') === o
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => handleUpdateScreen({ orientation: o })}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${active ? 'bg-blue-600 text-white shadow' : 'hover:brightness-125'}`}
                  style={active ? undefined : { color: S.sub }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {o === 'horizontal'
                      ? <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2" />
                      : <rect x="6" y="3" width="12" height="18" rx="2" strokeWidth="2" />}
                  </svg>
                  {o === 'horizontal' ? 'Horizontal' : 'Vertical'}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )

    const inputsBlock = (
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: S.text }}>Título Principal</label>
          <input
            type="text"
            value={screen.data.title}
            onChange={e => handleUpdateScreenData({ title: e.target.value })}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
            style={field}
            placeholder="Ej. Hamburguesa Doble"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: S.text }}>Descripción Larga</label>
          <textarea
            value={screen.data.description}
            onChange={e => handleUpdateScreenData({ description: e.target.value })}
            className="w-full border rounded-lg p-3 h-28 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition resize-none custom-scrollbar"
            style={field}
            placeholder="Ingresa la descripción, menú o anuncio..."
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: S.text }}>Precio / Subtexto</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-bold" style={{ color: S.sub }}>$</span>
              <input
                type="text"
                value={screen.data.price}
                onChange={e => handleUpdateScreenData({ price: e.target.value })}
                className="w-full border rounded-lg py-3 pl-8 pr-3 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                style={field}
                placeholder="150"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold" style={{ color: S.text }}>Horario de Reproducción</label>
            <div className="flex border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-600 transition" style={field}>
              <input
                type="time"
                value={screen.schedule.start}
                onChange={e => handleUpdateScreen({ schedule: { ...screen.schedule, start: e.target.value } })}
                className="w-1/2 bg-transparent p-2.5 outline-none text-center border-r"
                style={{ color: S.text, borderColor: S.border }}
              />
              <input
                type="time"
                value={screen.schedule.end}
                onChange={e => handleUpdateScreen({ schedule: { ...screen.schedule, end: e.target.value } })}
                className="w-1/2 bg-transparent p-2.5 outline-none text-center"
                style={{ color: S.text }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: S.text }}>Tiempo de exposición</label>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={screen.duration ?? DEFAULT_DURATION}
                onChange={e => {
                  const val = parseInt(e.target.value, 10)
                  handleUpdateScreen({ duration: isNaN(val) || val < 1 ? 1 : val })
                }}
                className="w-full border rounded-lg py-3 pl-3 pr-16 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                style={field}
                placeholder={`${DEFAULT_DURATION}`}
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm font-medium" style={{ color: S.sub }}>seg.</span>
            </div>
            <p className="text-xs mt-1" style={{ color: S.sub }}>Cuánto se muestra esta pantalla en el loop. Por defecto {DEFAULT_DURATION}s.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: S.text }}>Imagen de Fondo / Multimedia</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition relative group cursor-pointer overflow-hidden" style={field}>
            {screen.data.image ? (
              <>
                <img src={screen.data.image} alt="Background" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay blur-[2px]" />
                <div className="relative z-10 flex flex-col items-center justify-center p-4 bg-black/60 rounded-xl backdrop-blur-sm border border-white/10">
                  <img src={screen.data.image} alt="Preview" className="h-20 object-contain rounded" />
                  <p className="text-white text-xs mt-2 font-semibold">Cambiar imagen</p>
                </div>
              </>
            ) : (
              <div className="space-y-1 text-center py-4">
                <svg className="mx-auto h-10 w-10" style={{ color: S.sub }} stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div className="mt-2 text-sm" style={{ color: S.sub }}>
                  <span className="text-blue-500 font-semibold cursor-pointer mr-1">Sube un archivo</span>
                  o arrastra y suelta
                </div>
                <p className="text-xs" style={{ color: S.sub }}>PNG, JPG, GIF</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {(() => {
          const animDef = findAnimation(screen.data.animation)

          return (
            <div className="border-t pt-4" style={{ borderColor: S.border }}>
              {/* Botón secundario discreto: abre el editor de animación (modal). */}
              {animDef ? (
                <div className="flex items-center gap-3 border rounded-lg p-2.5" style={field}>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-400 shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: S.sub }}>Animación activa</p>
                    <p className="text-sm font-semibold truncate" style={{ color: S.text }}>{animDef.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnimEditorOpenFor(screen.id)}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 hover:brightness-125 border"
                    style={{ ...surface, color: S.text }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Settings
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAnimEditorOpenFor(screen.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition hover:brightness-125"
                  style={{ ...field }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Usar animación Lottie
                </button>
              )}
              {animDef && (
                <div className="mt-3 flex items-start gap-2 text-xs text-amber-300/90 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>Con animación activa, la pantalla muestra <strong>solo el Lottie</strong>. Imagen, título, descripción y precio se ignoran.</span>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    )

    return (
      <div className="border-t animate-in fade-in slide-in-from-top-2 duration-200" style={{ borderColor: S.border }} onClick={(e) => e.stopPropagation()}>
        {/* URL propia de esta pantalla */}
        <div className="px-5 md:px-6 pt-5">
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: S.sub }}>URL de esta pantalla</label>
          <div className="flex items-center gap-2 border rounded-lg p-1.5 pl-3" style={field}>
            <svg className="w-4 h-4 shrink-0" style={{ color: S.sub }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m6.328-1.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" /></svg>
            <code className="flex-1 min-w-0 truncate text-sm text-blue-400 font-mono">{origin}/admin/tv/pantalla/{screen.id}</code>
            <button
              onClick={() => handleCopyUrl(screen.id)}
              title="Copiar URL"
              className={`shrink-0 px-3 py-2 rounded-md text-xs font-semibold transition flex items-center gap-1.5 border hover:brightness-125 ${copiedId === screen.id ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : ''}`}
              style={copiedId === screen.id ? undefined : { ...surface, color: S.text }}
            >
              {copiedId === screen.id ? (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copiado</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copiar</>
              )}
            </button>
            <a
              href={`/admin/tv/pantalla/${screen.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir en una pestaña nueva"
              className="shrink-0 px-3 py-2 rounded-md text-xs font-semibold transition flex items-center gap-1.5 border hover:brightness-125"
              style={{ ...surface, color: S.text }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              Abrir
            </a>
          </div>
        </div>

        {isVertical ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 p-5 md:p-6 items-start">
            {inputsBlock}
            {previewBlock}
          </div>
        ) : (
          <div className="flex flex-col gap-6 p-5 md:p-6">
            {previewBlock}
            {inputsBlock}
          </div>
        )}
      </div>
    )
  }

  // --- RENDER PREVIEW FULLSCREEN ---
  if (previewMode && currentDevice) {
    return (
      <PreviewPlayer
        screens={currentDeviceScreens}
        onClose={() => setPreviewMode(false)}
      />
    )
  }

  // --- RENDER DASHBOARD ---
  return (
    <div className="min-h-screen md:ml-[240px] md:pt-16 font-sans selection:bg-blue-500/30" style={{ backgroundColor: S.bg, color: S.text }}>
      <AdminNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-8 custom-scrollbar">

        {/* ENCABEZADO */}
        <header className="border-b pb-6" style={{ borderColor: S.border }}>
          <h1 className="font-black text-2xl md:text-3xl flex items-center gap-3" style={{ color: S.text }}>
            <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20h6l-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Gestión de Pantallas
          </h1>
          <p className="text-sm mt-1.5" style={{ color: S.sub }}>Configura qué se reproduce en cada TV. Sigue los pasos de arriba hacia abajo.</p>
        </header>

        {/* PASO 1 · SUCURSAL */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 shrink-0 rounded-full bg-blue-600 text-white inline-flex items-center justify-center text-xs font-bold">1</span>
              <h2 className="font-bold" style={{ color: S.text }}>Elige la sucursal</h2>
            </div>
            <button
              onClick={handleAddClient}
              className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white text-sm px-3 py-2 rounded-lg transition font-medium flex gap-1.5 items-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nueva sucursal
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:max-w-2xl">
            <select
              className="w-full sm:max-w-md border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-600 transition"
              style={field}
              value={selectedClientId}
              onChange={e => {
                setSelectedClientId(e.target.value)
                setSelectedDeviceId(null)
                setSelectedScreenId(null)
              }}
            >
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input
              type="text"
              value={clients.find(c => c.id === selectedClientId)?.name ?? ""}
              onChange={e => setClients(clients.map(c => c.id === selectedClientId ? { ...c, name: e.target.value } : c))}
              placeholder="Nombre de la sucursal"
              className="w-full sm:flex-1 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
              style={field}
            />
            <button
              onClick={() => handleDeleteClient(selectedClientId)}
              disabled={!selectedClientId}
              title="Eliminar sucursal"
              className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-3 rounded-lg text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white transition disabled:opacity-30 disabled:hover:bg-red-500/10 disabled:hover:text-red-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span className="sm:hidden">Eliminar sucursal</span>
            </button>
          </div>
        </section>

        {/* PASO 2 · DISPOSITIVOS */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 shrink-0 rounded-full bg-blue-600 text-white inline-flex items-center justify-center text-xs font-bold">2</span>
              <h2 className="font-bold" style={{ color: S.text }}>Selecciona una TV</h2>
            </div>
            <button
              onClick={handleAddDevice}
              className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white text-sm px-3 py-2 rounded-lg transition font-medium flex gap-1.5 items-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nueva TV
            </button>
          </div>

          {filteredDevices.length === 0 ? (
            <div className="text-sm border border-dashed rounded-xl p-5 text-center" style={{ ...surface, color: S.sub }}>
              Esta sucursal aún no tiene TVs registradas. Crea una con “Nueva TV”.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredDevices.map(d => {
                const isActive = selectedDeviceId === d.id
                const count = screens.filter(s => s.deviceId === d.id).length
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDeviceId(d.id)
                      setSelectedScreenId(null)
                    }}
                    className={`text-left p-4 rounded-xl border transition-all animate-in fade-in zoom-in duration-200 ${isActive ? 'bg-blue-600/10 border-blue-500/60 shadow-lg' : 'hover:brightness-125'}`}
                    style={isActive ? undefined : surface}
                  >
                    <svg className={`w-5 h-5 mb-2 ${isActive ? "text-blue-400" : ""}`} style={isActive ? undefined : { color: S.sub }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20h6l-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <p className="font-semibold truncate" style={{ color: isActive ? S.text : S.text }}>{d.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: S.sub }}>{count} pantalla{count === 1 ? '' : 's'}</p>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {!currentDevice ? (
          <div className="border border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center" style={{ borderColor: S.border, color: S.sub }}>
            <svg className="w-14 h-14 opacity-20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20h6l-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <p className="font-medium" style={{ color: S.text }}>Selecciona una TV de arriba</p>
            <p className="text-sm">para gestionar lo que se reproduce en ella.</p>
          </div>
        ) : (
          <>
            {/* PANEL DEL DISPOSITIVO: nombre + reproducir */}
            <section className="border rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={surface}>
              <div className="flex flex-col w-full sm:w-auto">
                <span className="text-xs text-blue-500 font-bold uppercase tracking-widest mb-1">TV seleccionada · {currentDevice.id}</span>
                <input
                  type="text"
                  value={currentDevice.name}
                  onChange={e => handleUpdateDeviceName(e.target.value)}
                  className="bg-transparent font-bold text-2xl md:text-3xl border-b border-transparent focus:border-blue-500 outline-none pb-1 rounded px-1 transition w-full sm:w-80"
                  style={{ color: S.text }}
                  placeholder="Nombre de la TV"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => handleDeleteDevice(currentDevice.id)}
                  title="Eliminar TV"
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg font-medium text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Eliminar TV
                </button>
                <button
                  onClick={() => setPreviewMode(true)}
                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                  Iniciar Reproducción
                </button>
              </div>
            </section>

            {/* PASO 3 · AÑADIR PANTALLA */}
            <section>
               <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-blue-600 text-white inline-flex items-center justify-center text-xs font-bold">3</span>
                  <h2 className="font-bold" style={{ color: S.text }}>Añade pantallas a la programación</h2>
               </div>
               <div className="flex flex-col sm:flex-row gap-3 sm:items-end border rounded-2xl p-5" style={surface}>
                  <div className="flex-1">
                     <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: S.sub }}>Plantilla</label>
                     <select
                        value={newScreenTemplate}
                        onChange={e => setNewScreenTemplate(e.target.value)}
                        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-600 transition"
                        style={field}
                     >
                        {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                     </select>
                  </div>
                  <button
                     onClick={() => handleAddScreen(newScreenTemplate)}
                     className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
                  >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                     Agregar Pantalla
                  </button>
               </div>
            </section>

            {/* LISTA DE PANTALLAS */}
            <section>
               <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-lg" style={{ color: S.text }}>Pantallas en esta TV</h3>
                  <span className="text-xs px-2.5 py-1 rounded-full font-mono border" style={{ ...field }}>{currentDeviceScreens.length}</span>
                  {currentDeviceScreens.length > 1 && <span className="text-xs ml-auto" style={{ color: S.sub }}>Arrastra para reordenar</span>}
               </div>
               {currentDeviceScreens.length === 0 ? (
                  <p className="text-sm border border-dashed rounded-xl p-4" style={{ ...surface, color: S.sub }}>
                     Aún no hay pantallas. Agrega una con el botón de arriba.
                  </p>
               ) : (
                  <div className="space-y-2">
                     {currentDeviceScreens.map((s, idx) => {
                        const template = TEMPLATES.find(t => t.id === s.templateId)
                        const isActive = selectedScreenId === s.id
                        return (
                           <div
                              key={s.id}
                              className={`rounded-xl border overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${draggedScreenId === s.id ? 'opacity-50' : ''} ${isActive ? 'bg-blue-600/5 border-blue-500/50 shadow-lg' : ''}`}
                              style={isActive ? undefined : surface}
                           >
                              <div
                                 draggable
                                 onDragStart={(e) => onDragStart(e, s.id)}
                                 onDragOver={onDragOver}
                                 onDrop={(e) => onDrop(e, s.id)}
                                 onClick={() => setSelectedScreenId(prev => prev === s.id ? null : s.id)}
                                 className="group flex items-center gap-3 p-3.5 cursor-pointer"
                                 aria-expanded={isActive}
                              >
                                 <svg className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'rotate-90 text-blue-400' : ''}`} style={isActive ? undefined : { color: S.sub }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                 <svg className="w-4 h-4 shrink-0 cursor-grab active:cursor-grabbing" style={{ color: S.sub }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                 <span className={`w-7 h-7 shrink-0 rounded-lg inline-flex items-center justify-center text-sm font-bold ${isActive ? 'bg-blue-600 text-white' : ''}`} style={isActive ? undefined : { ...field }}>
                                    {idx + 1}
                                 </span>
                                 <div className="min-w-0 flex-1">
                                    <p className="font-semibold truncate" style={{ color: S.text }}>{s.data.title || 'Pantalla sin título'}</p>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: S.sub }}>
                                       <span>{template?.name || s.templateId}</span>
                                       <span className="opacity-50">•</span>
                                       <span>{s.schedule.start} – {s.schedule.end}</span>
                                       <span className="opacity-50">•</span>
                                       <span>{s.duration ?? DEFAULT_DURATION}s</span>
                                       {s.orientation === 'vertical' && (<><span className="opacity-50">•</span><span className="text-blue-400">vertical</span></>)}
                                       {s.data.animation && (<><span className="opacity-50">•</span><span className="text-emerald-400">lottie</span></>)}
                                    </div>
                                    <code className="block mt-1 text-[11px] truncate font-mono" style={{ color: S.sub }}>/admin/tv/pantalla/{s.id}</code>
                                 </div>
                                 <div className="shrink-0 flex items-center gap-1">
                                    <button
                                       onClick={(e) => { e.stopPropagation(); handleCopyUrl(s.id); }}
                                       title="Copiar URL"
                                       className={`p-2 rounded-lg transition ${copiedId === s.id ? 'text-emerald-400 bg-emerald-500/10' : 'hover:text-blue-400 hover:bg-blue-500/10'}`}
                                       style={copiedId === s.id ? undefined : { color: S.sub }}
                                    >
                                       {copiedId === s.id ? (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                       ) : (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                       )}
                                    </button>
                                    <a
                                       href={`/admin/tv/pantalla/${s.id}`}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       onClick={(e) => e.stopPropagation()}
                                       title="Abrir pantalla en una pestaña nueva"
                                       className="p-2 rounded-lg hover:text-blue-400 hover:bg-blue-500/10 transition inline-flex"
                                       style={{ color: S.sub }}
                                    >
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                    <button
                                       onClick={(e) => { e.stopPropagation(); handleDeleteScreen(s.id); }}
                                       title="Eliminar pantalla"
                                       className="p-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                                    >
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                 </div>
                              </div>
                              {isActive && renderEditorContent(s)}
                           </div>
                        )
                     })}
                     </div>
                  )}
            </section>

          </>
        )}
      </div>

      {/* EDITOR DE ANIMACIÓN (modal a pantalla completa) */}
      {(() => {
        const editScreen = screens.find(s => s.id === animEditorOpenFor)
        if (!editScreen) return null
        return (
          <AnimationEditorModal
            key={editScreen.id}
            open
            currentId={editScreen.data.animation}
            currentParams={editScreen.data.animationParams}
            orientation={editScreen.orientation ?? 'horizontal'}
            screenLabel={editScreen.data.title || 'Sin título'}
            onClose={() => setAnimEditorOpenFor(null)}
            onApply={(animationId, animationParams) => {
              setScreens(prev => prev.map(s =>
                s.id === editScreen.id
                  ? { ...s, data: { ...s.data, animation: animationId, animationParams } }
                  : s
              ))
            }}
          />
        )
      })()}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--ad-border); border-radius: 10px; }
      `}} />
    </div>
  )
}

// =========================================================================
// RENDER PLAYER ENGINE (LOOP INFINITO PARA LA PANTALLA)
// La simulación de la TV es siempre negra: representa la pantalla física,
// no el chrome del panel, por eso NO sigue el tema claro/oscuro.
// =========================================================================
function PreviewPlayer({ screens, onClose }: { screens: Screen[], onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Filtrar Activas en el Instante Actual comparando HH:MM a minutos totales del día
  const validScreens = screens.filter(s => {
    const now = new Date()
    const currentMins = now.getHours() * 60 + now.getMinutes()

    // Fallbacks si schedule no es correcto
    if (!s.schedule?.start || !s.schedule?.end) return true

    const [startH, startM] = s.schedule.start.split(':').map(Number)
    const [endH, endM] = s.schedule.end.split(':').map(Number)
    const startMins = startH * 60 + (startM || 0)
    const endMins = endH * 60 + (endM || 0)

    // Si cruza la medianoche (ej. 22:00 a 02:00)
    if (startMins > endMins) {
      return currentMins >= startMins || currentMins <= endMins
    }

    return currentMins >= startMins && currentMins <= endMins
  })

  // Cierre
  const handleClose = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
         await document.exitFullscreen()
      }
    } catch {
      // ignore
    }
    onClose()
  }

  useEffect(() => {
    try {
      if (document.documentElement.requestFullscreen) {
         document.documentElement.requestFullscreen().catch(()=> {})
      }
    } catch {
      // ignore
    }

    // Salir del reproductor con la tecla Escape
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  // Avance del loop según el tiempo de exposición de la pantalla actual
  useEffect(() => {
    if (validScreens.length === 0) return
    const current = validScreens[currentIndex % validScreens.length]
    const ms = Math.max(1, current?.duration || DEFAULT_DURATION) * 1000
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % validScreens.length)
    }, ms)
    return () => clearTimeout(timer)
  }, [currentIndex, validScreens.length])

  // UI si no hay nada en horario
  if (validScreens.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-500">
        <svg className="w-24 h-24 text-gray-800 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <h1 className="text-3xl font-bold mb-3">No hay contenido programado.</h1>
        <p className="text-gray-400 text-lg max-w-lg mb-8">El horario actual no coincide con la programación de ninguna de las pantallas creadas para este dispositivo.</p>
        <button onClick={handleClose} className="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold text-center border border-gray-700 shadow-xl transition">Salir del modo Reproductor</button>
      </div>
    )
  }

  const active = validScreens[currentIndex % validScreens.length]
  const activeDuration = Math.max(1, active?.duration || DEFAULT_DURATION)

  // Si la pantalla activa es una animación Lottie, ocupa todo el viewport.
  if (active.data.animation) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden animate-in fade-in duration-500">
        <div className="absolute top-0 right-0 p-8 z-[100] opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-auto">
          <button
            onClick={handleClose}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg shadow-xl font-bold flex items-center gap-2"
          >
            Salir de Preview
          </button>
        </div>
        <AnimationRenderer key={`lottie-${active.id}-${currentIndex}`} animationId={active.data.animation} params={active.data.animationParams} orientation={active.orientation ?? 'horizontal'} className="w-full h-full" />
        <div className="absolute bottom-0 w-full z-20 pointer-events-none">
          <div className="w-full h-1.5 bg-gray-900/50">
            <div key={`progress-${currentIndex}`} className="h-full bg-blue-500 origin-left" style={{ animation: `progress ${activeDuration}s linear forwards` }}></div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes progress {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}} />
      </div>
    )
  }

  // UI DEL REPRODUCTOR
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col text-white overflow-hidden animate-in fade-in duration-500">

      {/* Botón Salir visible al pasar mouse en esquina derecha */}
      <div className="absolute top-0 right-0 p-8 z-[100] opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-auto">
         <button
            onClick={handleClose}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg shadow-xl font-bold flex items-center gap-2"
         >
         Salir de Preview
         </button>
      </div>

      {/* RENDER VIEW */}
      <div className="w-full h-full relative flex items-center justify-center">

         {/* Imagen de fondo a pantalla completa */}
         {active.data.image ? (
            <div className="absolute inset-0 z-0 bg-black">
               <img src={active.data.image} alt="bg" className="w-full h-full object-cover" />
               {/* Degradado para legibilidad del texto */}
               <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20"></div>
            </div>
         ) : (
            <div className="absolute inset-0 z-0 bg-[#0c1015] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 to-black"></div>
         )}

         {/* Contenido superpuesto */}
         <div className={`z-10 animate-in zoom-in-95 duration-700 ease-out fade-in flex flex-col gap-6 w-[90%] max-w-7xl pointer-events-none
            ${active.data.image ? 'self-end items-start text-left mb-16 md:mb-24' : 'items-center text-center'}`}>

            {/* Label Template */}
            <div className={`px-4 py-1.5 rounded-full inline-block border bg-black/40 backdrop-blur w-max font-bold text-xs uppercase tracking-[0.2em] shadow-lg
               ${active.templateId === "template-menu" ? "text-amber-400 border-amber-500/30" : "text-emerald-400 border-emerald-500/30"}
            `}>
               {active.templateId === "template-menu" ? "Menú Especial" : "Promoción"}
            </div>

            {/* Titulo */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-tight bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
               {active.data.title || "Contenido"}
            </h1>

            {/* Descripcion */}
            <p className="text-2xl md:text-3xl lg:text-4xl text-gray-100 font-light leading-relaxed max-w-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
               {active.data.description}
            </p>

            {/* Precio Especial */}
            {(active.data.price && active.data.price !== "$0" && active.data.price.trim() !== "") && (
               <div className="mt-4">
                  <div className="inline-block bg-gradient-to-r from-green-500 to-emerald-700 text-white text-5xl md:text-7xl font-black px-12 py-6 rounded-3xl shadow-[0_20px_50px_-12px_rgba(16,185,129,0.5)] transform -rotate-2">
                     {active.data.price.startsWith('$') ? active.data.price : `$${active.data.price}`}
                  </div>
               </div>
            )}
         </div>

         {/* Barra de progreso / Paginacion bottom */}
         <div className="absolute bottom-0 w-full flex flex-col items-center">
            {/* Progress Bar (Css Animation CSS5s) */}
            <div className="w-full h-1.5 bg-gray-900/50">
               <div key={`progress-${currentIndex}`} className="h-full bg-blue-500 origin-left" style={{ animation: `progress ${activeDuration}s linear forwards` }}></div>
            </div>
         </div>

         <style dangerouslySetInnerHTML={{__html: `
            @keyframes progress {
               from { width: 0%; }
               to { width: 100%; }
            }
         `}} />
      </div>
    </div>
  )
}

// =========================================================================
// SCREEN PREVIEW (mini render con aspect ratio según orientación)
// Igual que la TV real: fondo negro, no sigue el tema del panel.
// =========================================================================
function ScreenPreview({ screen }: { screen: Screen }) {
  const isVertical = screen.orientation === 'vertical'
  const hasPrice = screen.data.price && screen.data.price !== '$0' && screen.data.price.trim() !== ''

  return (
    <div
      className={`relative bg-black overflow-hidden rounded-lg border border-gray-700 shadow-inner ${isVertical ? 'aspect-[9/16] h-[500px]' : 'aspect-video w-full'}`}
    >
      {screen.data.animation ? (
        <AnimationRenderer animationId={screen.data.animation} params={screen.data.animationParams} orientation={screen.orientation ?? 'horizontal'} className="absolute inset-0 w-full h-full" />
      ) : (
        <>
          {screen.data.image ? (
            <>
              <img src={screen.data.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
          )}
          <div className={`absolute inset-0 z-10 p-4 md:p-6 flex flex-col gap-2 text-white ${screen.data.image ? 'justify-end items-start text-left' : 'items-center justify-center text-center'}`}>
            <div className={`px-2.5 py-1 rounded-full border bg-black/40 backdrop-blur w-max font-bold uppercase tracking-[0.18em] ${isVertical ? 'text-[9px]' : 'text-[10px] md:text-xs'} ${screen.templateId === 'template-menu' ? 'text-amber-400 border-amber-500/30' : 'text-emerald-400 border-emerald-500/30'}`}>
              {screen.templateId === 'template-menu' ? 'Menú' : 'Promo'}
            </div>
            <div className={`font-black leading-tight bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent ${isVertical ? 'text-xl' : 'text-3xl md:text-5xl'}`}>
              {screen.data.title || 'Contenido'}
            </div>
            <div className={`text-gray-200 leading-snug line-clamp-3 ${isVertical ? 'text-xs' : 'text-sm md:text-lg'}`}>
              {screen.data.description}
            </div>
            {hasPrice && (
              <div className={`mt-1 inline-block bg-gradient-to-r from-green-500 to-emerald-700 text-white font-black px-3 py-1 rounded-md w-fit -rotate-2 shadow ${isVertical ? 'text-base' : 'text-2xl md:text-3xl'}`}>
                {screen.data.price.startsWith('$') ? screen.data.price : `$${screen.data.price}`}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
