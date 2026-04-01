import { createContext, useContext, useState } from 'react'
import { themes } from './theme'

const Ctx = createContext(null)

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('dark')
  const t = themes[mode]
  const toggle = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'))
  return <Ctx.Provider value={{ t, mode, toggle }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
