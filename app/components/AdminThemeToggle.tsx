'use client'

// Sin estado de React: el icono visible lo decide CSS según
// el atributo data-admin-theme (ver globals.css). El click solo
// conmuta el atributo y lo persiste. Evita efectos y desajustes de hidratación.
function applyTheme(theme: 'dark' | 'light') {
  try {
    localStorage.setItem('admin_theme', theme)
  } catch {}
  document.documentElement.setAttribute('data-admin-theme', theme)
}

export default function AdminThemeToggle() {
  function toggle() {
    const current = document.documentElement.getAttribute('data-admin-theme') === 'light' ? 'light' : 'dark'
    applyTheme(current === 'light' ? 'dark' : 'light')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar tema claro/oscuro"
      title="Cambiar tema claro/oscuro"
      className="pointer-events-auto w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
      style={{
        backgroundColor: 'var(--ad-card)',
        border: '1px solid var(--ad-border)',
        color: 'var(--ad-text)',
      }}
    >
      {/* Visible en modo oscuro → sol (cambia a claro) */}
      <svg className="ad-icon-dark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
        <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
        <line x1="4.9" y1="4.9" x2="6.3" y2="6.3" /><line x1="17.7" y1="17.7" x2="19.1" y2="19.1" />
        <line x1="4.9" y1="19.1" x2="6.3" y2="17.7" /><line x1="17.7" y1="6.3" x2="19.1" y2="4.9" />
      </svg>
      {/* Visible en modo claro → luna (cambia a oscuro) */}
      <svg className="ad-icon-light" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  )
}
