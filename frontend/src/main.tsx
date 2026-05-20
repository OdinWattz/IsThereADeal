import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'

async function initOptionalClientErrorLogging() {
  if (!import.meta.env.DEV) return

  try {
    const loggerModulePath = './clientErrorLogger'
    const mod = await import(/* @vite-ignore */ loggerModulePath)
    if (typeof mod?.initClientErrorLogging === 'function') {
      mod.initClientErrorLogging()
    }
  } catch {
    // Local-only logger is optional; ignore when absent.
  }
}

void initOptionalClientErrorLogging()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
