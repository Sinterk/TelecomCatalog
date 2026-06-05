import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',   // rutas relativas → funciona abriendo index.html directamente
  plugins: [react()],
  resolve: {
    alias: { '@': '/src' },
  },
})
