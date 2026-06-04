import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import './index.css'

registerSW({
  onNeedRefresh() {
    // Nueva versión disponible — se puede mostrar un toast aquí
  },
  onOfflineReady() {
    console.info('[SW] App lista para uso offline')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
