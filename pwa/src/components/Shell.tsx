import { useEffect, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useSession } from '../state/Session.tsx'
import { useShop } from '../state/ShopContext.tsx'

const tabs = [
  { to: '/', label: 'Home', end: true, icon: 'home' },
  { to: '/orders', label: 'Orders', end: false, icon: 'orders' },
  { to: '/customers', label: 'Customers', end: false, icon: 'customers' },
  { to: '/dashboard', label: 'Dashboard', end: true, icon: 'dashboard' },
  { to: '/settings', label: 'Settings', end: false, icon: 'settings' },
] as const

function TabIcon({ name }: { name: (typeof tabs)[number]['icon'] }) {
  const common = { viewBox: '0 0 24 24', 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1z" />
      </svg>
    )
  }
  if (name === 'orders') {
    return (
      <svg {...common}>
        <rect x="6" y="3.5" width="12" height="17" rx="2" />
        <path d="M9 3.5h6v2.2H9zM9 11h6M9 14.5h6M9 18h4" />
      </svg>
    )
  }
  if (name === 'customers') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 19.2c.8-3 3.2-4.7 6.5-4.7s5.7 1.7 6.5 4.7" />
      </svg>
    )
  }
  if (name === 'dashboard') {
    return (
      <svg {...common}>
        <path d="M5 19V11M10 19V7M15 19v-5M20 19V5" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3V20.5M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </svg>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const { ready, source, loadError } = useShop()
  const { theme } = useSession()
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  return (
    <div className="shell">
      <div className="workspace">
        <header className="phone-bar">
          <span className="lc-mark" aria-label="Ladies Collection">LC</span>
        </header>
        <main className="content">
          {loadError ? <p className="error">{loadError}</p> : null}
          {ready && source === 'local' ? (
            <p className="banner">The stitching floor is offline. Showing the copy kept on this device.</p>
          ) : null}
          {ready ? children : <p className="kicker">Opening the floor…</p>}
        </main>
      </div>
      <nav className="tabbar">
        {tabs.map(link => (
          <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'tablink active' : 'tablink')}>
            <TabIcon name={link.icon} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
