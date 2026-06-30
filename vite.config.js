import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  plugins: [
    react(),
    VitePWA({
      // generateSW: Workbox gera o SW; importScripts injeta os handlers de
      // push/notificationclick de public/sw-push.js no SW final.
      //
      // ANTES desta correção, o comentário dizia "handlers injetados no SW
      // gerado", mas o importScripts nunca existia aqui — o SW gerado tinha
      // só o cache padrão do Workbox, sem nenhum listener de 'push' ou
      // 'notificationclick'. Resultado: toda notificação push enviada pelo
      // servidor (Edge Function send-push) chegava ao navegador via Web
      // Push Protocol e era descartada silenciosamente, porque não havia
      // nada registrado para exibi-la. Sem erro visível em lugar nenhum —
      // o tipo de bug mais difícil de notar sem testar manualmente em um
      // dispositivo real com push de fato configurado.
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        importScripts: ['sw-push.js'],
        // Sem isso, o fallback de navegação do Workbox cobre só a rota
        // raiz ('/') por padrão — abrir o app offline direto numa rota
        // interna (ex: /app/workout, depois de ter sido fechado nessa
        // tela) resultava em tela em branco, porque o Service Worker não
        // sabia servir index.html para nenhuma rota além da raiz. Como
        // este é uma SPA com roteamento 100% client-side (React Router),
        // toda navegação deve cair em index.html e deixar o router
        // resolver a rota certa no lado do cliente.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/functions\//],
        // Runtime cache for Supabase API calls
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.includes('supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Voryn',
        short_name: 'Voryn',
        description: 'Registre treinos, acompanhe evolução e gerencie alunos.',
        theme_color: '#820AD1',
        background_color: '#080808',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/app',
        scope: '/',
        lang: 'pt-BR',
        dir: 'ltr',
        categories: ['health', 'fitness', 'sports'],
        icons: [
          { src: '/voryn-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/voryn-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/voryn-badge-96.png',  sizes: '96x96',  type: 'image/png' },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          charts:   ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: { port: 5173, host: true },
  test: {
    globals:     true,
    environment: 'jsdom',
    setupFiles:  ['./src/__tests__/setup.js'],
    include:     ['src/**/*.test.{js,jsx,ts,tsx}'],
    coverage: {
      provider:  'v8',
      reporter:  ['text', 'lcov'],
      exclude:   ['node_modules/', 'src/__tests__/setup.js'],
    },
  },
})
