import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { SaleMode, StaffRole } from '../data/shop.ts'

export type ThemeName = 'light' | 'dark'

type SessionValue = {
  mode: SaleMode
  setMode: (mode: SaleMode) => void
  role: StaffRole
  setRole: (role: StaffRole) => void
  owner: boolean
  stitcher: boolean
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  unit: 'inch' | 'cm'
  setUnit: (unit: 'inch' | 'cm') => void
}

const SessionContext = createContext<SessionValue | null>(null)
const MODE_KEY = 'tailor-sale-mode'
const THEME_KEY = 'tailor-theme'
const UNIT_KEY = 'tailor-unit'

function storedMode(): SaleMode {
  try {
    const value = sessionStorage.getItem(MODE_KEY)
    if (value === 'service' || value === 'product' || value === 'both') return value
  } catch {
    return 'both'
  }
  return 'both'
}

function storedUnit(): 'inch' | 'cm' {
  try {
    return sessionStorage.getItem(UNIT_KEY) === 'cm' ? 'cm' : 'inch'
  } catch {
    return 'inch'
  }
}

function storedTheme(): ThemeName {
  try {
    return sessionStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<SaleMode>(storedMode)
  const [theme, setThemeState] = useState<ThemeName>(storedTheme)
  const [unit, setUnitState] = useState<'inch' | 'cm'>(storedUnit)
  const [role, setRole] = useState<StaffRole>('owner')
  const setMode = (next: SaleMode) => {
    try {
      sessionStorage.setItem(MODE_KEY, next)
    } catch {
      // The choice still lasts for this page when storage is blocked.
    }
    setModeState(next)
  }
  const setTheme = (next: ThemeName) => {
    try {
      sessionStorage.setItem(THEME_KEY, next)
    } catch {
      // The choice still lasts for this page when storage is blocked.
    }
    setThemeState(next)
  }
  const setUnit = (next: 'inch' | 'cm') => {
    try {
      sessionStorage.setItem(UNIT_KEY, next)
    } catch {
      // The choice still lasts for this page when storage is blocked.
    }
    setUnitState(next)
  }
  const value = useMemo(
    () => ({ mode, setMode, role, setRole, owner: role === 'owner', stitcher: role === 'stitcher', theme, setTheme, unit, setUnit }),
    [mode, role, theme, unit],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used within SessionProvider')
  return value
}
