import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'TelecomCatalog',
        short_name: 'TelecomCat',
        description: 'Catálogo fotográfico de proyectos de telecomunicaciones',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        lang: 'es',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cachea toda la app shell al instalar
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
        cleanupOutdatedCaches: true,
        // Activa el SW nuevo inmediatamente sin esperar a que el usuario cierre tabs
        skipWaiting: true,
        clientsClaim: true,
        // No intentes cachear rutas externas (proxy, APIs)
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/proxy/],
      },
    }),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
})
