import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Importante: Tenta atualizar sozinho
      
      // Configurações do Workbox (O motor do PWA)
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true, // Limpa versões velhas
        clientsClaim: true, // O novo SW assume o controle imediatamente
        skipWaiting: true,  // Não espera o usuário fechar a aba
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Aumenta limite para 5MB
      },
      
      devOptions: {
        enabled: true // Facilita seus testes locais
      },

      // ... (seu manifesto continua aqui igual) ...
      manifest: {
        // ... mantenha suas configurações de ícones e cores ...
        name: 'ITAM Hospitalar',
        short_name: 'ITAM',
        theme_color: '#007aff',
        background_color: '#f2f2f7',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
            {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
            },
            {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png'
            }
        ]
      }
    })
  ],
})