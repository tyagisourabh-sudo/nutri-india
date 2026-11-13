import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/nutri-india/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'NutriIndia',
        short_name: 'NutriIndia',
        start_url: '/nutri-india/',
        scope: '/nutri-india/',
        display: 'standalone',
        theme_color: '#16a34a',
        background_color: '#ffffff'
      }
    })
  ]
})
