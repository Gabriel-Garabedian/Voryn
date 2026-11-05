import React, { useEffect, useState } from 'react'
import { appUpdate } from '@/services/appUpdate'

export default function AppUpdateBanner({ hidden = false }) {
  const [release, setRelease] = useState(null)
  const [dismissed, setDismissed] = useState(null)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    let controller
    let lastCheck = 0
    async function check() {
      if (document.visibilityState === 'hidden' || navigator.onLine === false || controller || Date.now() - lastCheck < 300000) return
      lastCheck = Date.now()
      controller = new AbortController()
      const timeout = setTimeout(() => controller?.abort(), 8000)
      try {
        const next = await appUpdate.check(controller.signal)
        if (alive) setRelease(next)
      } catch { /* Sem rede, o app continua disponível. */ }
      finally { clearTimeout(timeout); controller = null }
    }
    void check()
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
    return () => {
      alive = false
      controller?.abort()
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('online', check)
    }
  }, [])

  if (hidden || !release || dismissed === release.versionCode) return null

  return <section aria-label="Atualização do Voryn" className="mx-4 mt-4 f-card p-4" style={{ color: 'var(--text-1)' }}>
    <p className="text-sm font-semibold" role="status">Voryn {release.versionName} disponível</p>
    <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Baixe a atualização e instale por cima da versão atual para manter seus registros locais.</p>
    <div className="flex flex-wrap gap-2 mt-3">
      <button className="f-btn f-btn-accent" disabled={opening} onClick={async () => {
        setOpening(true)
        setError('')
        try { await appUpdate.open(release) }
        catch (err) { setError(err.message || 'Não foi possível abrir o download.') }
        finally { setOpening(false) }
      }}>{opening ? 'Abrindo…' : 'Baixar atualização'}</button>
      <button className="f-btn f-btn-ghost" onClick={() => setDismissed(release.versionCode)}>Agora não</button>
    </div>
    {error && <p role="alert" className="text-sm mt-2">{error}</p>}
  </section>
}
