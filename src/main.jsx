import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'
import { initSentry, captureError } from './lib/sentry'
initSentry()

// Registra o Service Worker (gerado pelo vite-plugin-pwa, com os handlers
// de push injetados via public/sw-push.js — ver vite.config.js). Antes,
// NENHUM lugar do projeto chamava virtual:pwa-register — o SW era
// registrado implicitamente pelo plugin, mas sem nenhuma visibilidade
// sobre falhas de registro. Com registerType: 'autoUpdate' (já configurado
// em vite.config.js), o comportamento esperado é atualização silenciosa em
// segundo plano — por isso só tratamos onRegisterError e onOfflineReady
// aqui, não onNeedRefresh (que é mais relevante para o modo 'prompt',
// não usado neste projeto).
import { registerSW } from 'virtual:pwa-register'
registerSW({
  onRegisterError(err) {
    console.error('[Voryn] Falha ao registrar o Service Worker:', err)
    captureError(err, { context: 'service_worker_registration' })
  },
  onOfflineReady() {
    console.log('[Voryn] App pronto para uso offline (assets em cache).')
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
