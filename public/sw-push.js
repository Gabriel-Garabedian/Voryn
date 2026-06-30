// ──────────────────────────────────────────────────────────
//  Handlers de Push Notification — ARQUIVO REAL, EM USO.
//  Injetado no Service Worker gerado pelo VitePWA via
//  workbox.importScripts (ver vite.config.js). Não renomeie
//  nem mova este arquivo sem atualizar essa referência.
// ──────────────────────────────────────────────────────────

// Push notification received
self.addEventListener('push', e => {
  if (!e.data) return
  let data = {}
  try { data = e.data.json() } catch { data = { title: 'Voryn', body: e.data.text() } }
  e.waitUntil(
    self.registration.showNotification(data.title || 'Voryn 💪', {
      body:    data.body || 'Toque para abrir o app',
      icon:    '/voryn-icon-192.png',
      badge:   '/voryn-badge-96.png',
      tag:     data.tag || 'voryn',
      data:    { url: data.url || '/app' },
      vibrate: [200, 100, 200],
    })
  )
})

// Notification click → navigate
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/app'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('/app')) { client.focus(); return }
      }
      return clients.openWindow(url)
    })
  )
})
