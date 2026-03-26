import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'theme_preference'

// Get initial theme from localStorage or system preference
const getInitialTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') {
      return stored
    }
  } catch (error) {
    console.error('Failed to load theme preference:', error)
  }

  // Default to dark theme (matches current design)
  return 'dark'
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),

  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(STORAGE_KEY, newTheme)
        document.documentElement.classList.toggle('dark', newTheme === 'dark')
        document.documentElement.classList.toggle('light', newTheme === 'light')
      } catch (error) {
        console.error('Failed to save theme preference:', error)
      }
      return { theme: newTheme }
    }),

  setTheme: (theme) =>
    set(() => {
      try {
        localStorage.setItem(STORAGE_KEY, theme)
        document.documentElement.classList.toggle('dark', theme === 'dark')
        document.documentElement.classList.toggle('light', theme === 'light')
      } catch (error) {
        console.error('Failed to save theme preference:', error)
      }
      return { theme }
    }),
}))

// Initialize theme on load
if (typeof window !== 'undefined') {
  const theme = getInitialTheme()
  document.documentElement.classList.add(theme)
}
