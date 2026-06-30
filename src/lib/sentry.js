// ──────────────────────────────────────────────────────────
//  Voryn — Sentry Error Monitoring
//  Install: npm install @sentry/react @sentry/tracing
//  Env:     VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
// ──────────────────────────────────────────────────────────

// Lazy-load Sentry so it doesn't block the app
let Sentry = null

export async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    console.warn('[Sentry] VITE_SENTRY_DSN not set — error monitoring disabled')
    return
  }

  try {
    const mod = await import('@sentry/react')
    Sentry = mod

    Sentry.init({
      dsn,
      environment:      import.meta.env.MODE,
      release:          `contato@${import.meta.env.VITE_APP_VERSION || '4.0.0'}`,
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      integrations:     [],
      beforeSend(event) {
        // Strip PII from breadcrumbs
        if (event.user) delete event.user.email
        return event
      },
    })
    console.log('[Sentry] Initialized')
  } catch (e) {
    console.warn('[Sentry] Failed to initialize:', e)
  }
}

export function captureError(err, context = {}) {
  if (Sentry) Sentry.captureException(err, { extra: context })
  else console.error('[Error]', err, context)
}

export function setUser(userId) {
  if (Sentry) Sentry.setUser({ id: userId })
}

export function clearUser() {
  if (Sentry) Sentry.setUser(null)
}
