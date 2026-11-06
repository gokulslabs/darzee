import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { SaleMode, StaffRole } from '../data/shop'

export type ThemeName = 'light' | 'dark'

type SessionValue = {
  mode: SaleMode
  setMode: (mode: SaleMode) => void
  role: StaffRole
  ownerName: string
  unit: 'inch' | 'cm'
  setUnit: (unit: 'inch' | 'cm') => void
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
}

const SessionContext = createContext<SessionValue | null>(null)
let rememberedMode: SaleMode = 'both'
let rememberedUnit: 'inch' | 'cm' = 'inch'
let rememberedTheme: ThemeName = 'light'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<SaleMode>(rememberedMode)
  const [unit, setUnitState] = useState<'inch' | 'cm'>(rememberedUnit)
  const [theme, setThemeState] = useState<ThemeName>(rememberedTheme)
  const setMode = (next: SaleMode) => {
    rememberedMode = next
    setModeState(next)
  }
  const setUnit = (next: 'inch' | 'cm') => {
    rememberedUnit = next
    setUnitState(next)
  }
  const setTheme = (next: ThemeName) => {
    rememberedTheme = next
    setThemeState(next)
  }
  const value = useMemo(
    () => ({ mode, setMode, role: 'owner' as StaffRole, ownerName: 'Sridevi', unit, setUnit, theme, setTheme }),
    [mode, unit, theme],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used within SessionProvider')
  return value
}
