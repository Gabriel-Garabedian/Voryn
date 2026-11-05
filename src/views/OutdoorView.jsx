import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui'
import { outdoorActivity, OUTDOOR_SPORTS, activityRate, formatActivityTime } from '@/services/outdoorActivity'
import '@/styles/outdoor.css'

const OutdoorRouteMap = lazy(() => import('@/components/OutdoorRouteMap'))
const EMPTY_POINTS = []

function Metrics({ row }) {
  return <dl className="outdoor-metrics">
    <div><dt>Distância</dt><dd>{((row?.distanceMeters || 0) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<small> km</small></dd></div>
    <div><dt>Tempo ativo</dt><dd>{formatActivityTime(row?.elapsedMs || 0)}</dd></div>
    <div><dt>{row?.sport === 'cycling' ? 'Velocidade média' : 'Ritmo médio'}</dt><dd>{activityRate(row)}<small> {row?.sport === 'cycling' ? 'km/h' : 'min/km'}</small></dd></div>
  </dl>
}

export default function OutdoorView() {
  const { user } = useAuth()
  const userId = user?.id
  const [data, setData] = useState({ active: null, history: [] })
  const [selected, setSelected] = useState(null)
  const [sport, setSport] = useState('running')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [now, setNow] = useState(Date.now())
  const requestVersion = useRef(0)
  const available = outdoorActivity.available()

  useEffect(() => {
    if (!available || !userId) { setLoading(false); return }
    let disposed = false
    let timeout
    async function poll() {
      const version = requestVersion.current
      try {
        const next = await outdoorActivity.read(userId)
        if (!disposed && version === requestVersion.current) setData(next)
      } catch (err) { if (!disposed) setError(err.message || 'Não foi possível abrir as atividades.') }
      finally {
        if (!disposed) { setLoading(false); timeout = setTimeout(poll, 3000) }
      }
    }
    void poll()
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => { disposed = true; clearTimeout(timeout); clearInterval(timer) }
  }, [available, userId])

  async function run(action) {
    if (busy) return
    setBusy(true); setError(''); requestVersion.current += 1
    try {
      await action()
      setData(await outdoorActivity.read(userId))
    } catch (err) { setError(err.message || 'Não foi possível concluir. Seu último registro salvo foi preservado.') }
    finally { requestVersion.current += 1; setBusy(false) }
  }

  const active = data.active
  const row = active || selected
  const staleGps = active?.status === 'recording' && (!active.lastFixAt || now - active.lastFixAt > 15000)
  return <div className="app-view outdoor-view px-4 pt-6 pb-8">
    <p className="outdoor-eyebrow">VORYN / AO AR LIVRE</p>
    <h1 className="font-display text-3xl uppercase tracking-wide">Seu próximo percurso</h1>
    <p className="outdoor-muted mb-5">Corrida, caminhada e pedal. Cada caminho faz parte da sua evolução.</p>
    {!available ? <section className="f-card p-5">
      <h2 className="text-lg font-semibold mb-2">Leve o Voryn com você</h2>
      <p className="outdoor-muted mb-4">A gravação GPS está disponível no aplicativo Android, com acompanhamento mesmo com a tela bloqueada. O histórico de percursos fica no aparelho em que foi gravado.</p>
      <Link className="f-btn f-btn-accent" to="/download">Baixar aplicativo Android</Link>
    </section> : <>
      {error && <p className="outdoor-error mb-4" role="alert">{error}</p>}
      {loading ? <p role="status">Abrindo suas atividades…</p> : <>
        {!active && <fieldset className="outdoor-sports mb-4" disabled={busy}>
          <legend className="text-sm font-semibold mb-2">O que vamos fazer hoje?</legend>
          <div>{Object.entries(OUTDOOR_SPORTS).map(([id, label]) => <label key={id} className={sport === id ? 'is-selected' : ''}>
            <input type="radio" name="sport" value={id} checked={sport === id} onChange={() => { setSport(id); setSelected(null); setConfirmDelete(false) }} />{label}
          </label>)}</div>
        </fieldset>}
        <section className="f-card outdoor-session p-4" aria-label={active ? 'Atividade em andamento' : selected ? 'Resumo da atividade' : 'Nova atividade'}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold">{OUTDOOR_SPORTS[row?.sport || sport]}</h2>
            <span className="outdoor-status" role="status">{active ? active.status === 'paused' ? 'Pausada' : staleGps ? 'Aguardando GPS' : 'Gravando' : selected ? 'Atividade concluída' : 'Pronto para começar'}</span>
          </div>
          {row ? <>
            <Suspense fallback={<div className="outdoor-map-placeholder" role="status">Abrindo mapa…</div>}>
              <OutdoorRouteMap points={row.points || EMPTY_POINTS} />
            </Suspense>
            <Metrics row={row} />
            {active?.error && <p role="status" className="outdoor-error mb-3">{active.error}</p>}
            {staleGps && <p className="outdoor-muted mb-3">Buscando sinal preciso. Fique em local aberto; a distância só aumenta com posições válidas. Falhas longas de GPS aparecem como interrupções no trajeto.</p>}
            {selected && !active && <p className="outdoor-muted mb-3">{new Date(selected.startedAt).toLocaleString('pt-BR')} · Tempo ativo exclui as pausas manuais.</p>}
          </> : <div className="outdoor-start-placeholder"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15"/><path d="m5 12 4-2 6 3 4-2"/></svg><p>Escolha seu esporte e explore um novo caminho.</p></div>}
          <div className="outdoor-controls">
            {!active ? <Button loading={busy} onClick={() => run(async () => { setSelected(null); await outdoorActivity.start(userId, sport) })}>Iniciar {OUTDOOR_SPORTS[sport].toLowerCase()}</Button>
              : <><Button loading={busy} onClick={() => run(() => active.status === 'recording' ? outdoorActivity.pause(userId) : outdoorActivity.start(userId, active.sport))}>{active.status === 'recording' ? 'Pausar' : 'Retomar'}</Button>
                <Button variant="ghost" disabled={busy} onClick={() => run(async () => { setSelected(await outdoorActivity.finish(userId)); setConfirmDelete(false) })}>Finalizar e salvar</Button></>}
          </div>
          {!active && !selected && <p className="outdoor-muted mt-3">Ao iniciar, o Voryn pede localização precisa e mantém uma notificação durante a gravação. Você controla quando começar e parar.</p>}
          {selected && !active && <div className="mt-4">
            {!confirmDelete ? <Button variant="ghost" disabled={busy} onClick={() => setConfirmDelete(true)}>Excluir esta atividade</Button> : <>
              <p className="outdoor-muted mb-2">Excluir permanentemente o resumo e o trajeto deste aparelho?</p>
              <div className="outdoor-controls"><Button variant="danger" loading={busy} onClick={() => run(async () => { await outdoorActivity.delete(userId, selected.id); setSelected(null); setConfirmDelete(false) })}>Confirmar exclusão</Button><Button variant="ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancelar</Button></div>
            </>}
          </div>}
        </section>
        <section className="mt-6" aria-labelledby="outdoor-history-title">
          <h2 id="outdoor-history-title" className="text-xl font-semibold mb-1">Seus percursos</h2>
          <p className="outdoor-muted mb-3">Salvos apenas neste aparelho, separados por conta. Sem publicação ou sincronização com o Strava.</p>
          {!data.history.length && <p className="outdoor-muted f-card p-4">Seu primeiro percurso começa quando você quiser.</p>}
          <div className="space-y-2">{data.history.map(item => <button key={item.id} className="f-card outdoor-history-item" disabled={busy || !!active}
            onClick={() => run(async () => { setSelected(await outdoorActivity.detail(userId, item.id)); setConfirmDelete(false) })}>
            <span><strong>{OUTDOOR_SPORTS[item.sport]}</strong><small>{new Date(item.startedAt).toLocaleString('pt-BR')}</small></span>
            <span><strong>{(item.distanceMeters / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km</strong><small>{formatActivityTime(item.elapsedMs)}</small></span>
          </button>)}</div>
        </section>
      </>}
      <p className="outdoor-muted mt-5">O GPS grava sem internet; as ruas do mapa precisam de conexão. Ao abrir um trajeto, o OpenStreetMap recebe pedidos de mapas da região exibida. Limpar os dados ou desinstalar o app apaga os percursos locais.</p>
    </>}
  </div>
}
