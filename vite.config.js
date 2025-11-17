import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Atualiza o app automaticamente quando houver nova versão
      registerType: 'autoUpdate',
      
      // Arquivos estáticos para incluir no cache
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      
      // Configuração do Manifesto (Aparência do App instalado)
      manifest: {
        name: 'ITAM Hospitalar - Gestão de Ativos',
        short_name: 'ITAM',
        description: 'Sistema de gestão de ativos hospitalares offline-first',
        theme_color: '#007aff',
        background_color: '#f2f2f7',
        display: 'standalone', // Remove a barra de URL do navegador
        orientation: 'portrait',
        
        // Ícones que aparecerão na tela do celular
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
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      
      // Configuração de Cache (Workbox)
      workbox: {
        // Aumenta o limite de tamanho de arquivo para cache (para 4MB)
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        
        // Padrões de arquivos para cachear
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
})