// ──────────────────────────────────────────────────────────
//  Voryn — Push Notification Service (PWA)
//  Uses Web Push API via service worker
// ──────────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export const pushService = {
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  },

  async getPermission() {
    if (!this.isSupported()) return 'unsupported'
    return Notification.permission
  },

  async subscribe(userId) {
    if (!this.isSupported()) return { error: 'not_supported' }
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[Push] VITE_VAPID_PUBLIC_KEY não configurada')
      return { error: 'no_vapid_key' }
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return { error: 'denied' }

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) return { subscription: existing, already: true }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // Save to Supabase via edge function or directly
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('push_subscriptions').upsert({
        user_id:      userId,
        endpoint:     subscription.endpoint,
        p256dh:       btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        auth:         btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
        created_at:   new Date().toISOString(),
      }, { onConflict: 'user_id,endpoint' })

      return { subscription }
    } catch (err) {
      console.error('[Push] Falha ao subscrever:', err)
      return { error: err.message }
    }
  },

  async unsubscribe(userId) {
    if (!this.isSupported()) return
    const reg  = await navigator.serviceWorker.ready
    const sub  = await reg.pushManager.getSubscription()
    if (sub) {
      await sub.unsubscribe()
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('push_subscriptions').delete()
        .eq('user_id', userId).eq('endpoint', sub.endpoint)
    }
  },

  // Schedule a local notification (works without server)
  scheduleLocal(title, body, delayMs = 0) {
    if (!this.isSupported() || Notification.permission !== 'granted') return
    if (delayMs === 0) {
      new Notification(title, { body, icon: '/voryn-icon-192.png', badge: '/voryn-badge.png' })
    } else {
      setTimeout(() => {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, { body, icon: '/voryn-icon-192.png', badge: '/voryn-badge.png', tag: 'forge-workout' })
        })
      }, delayMs)
    }
  },
}
