import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { localMusicPlayer, readMusicDuration, parseStart, formatMusicTime } from '@/services/localMusic'

export default function TrainingMusic({ compact = false }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const state = useSyncExternalStore(localMusicPlayer.subscribe, localMusicPlayer.snapshot)
  const saved = state.userId === user.id ? state.track : null
  const [selected, setSelected] = useState(null)
  const [start, setStart] = useState(null)
  const [busy, setBusy] = useState(false)
  const picker = useRef(null)
  const selection = useRef(0)
  useEffect(() => { void localMusicPlayer.load(user.id) }, [user.id])
  useEffect(() => () => { selection.current += 1 }, [])
  async function choose(file) {
    if (!file) return
    const current = ++selection.current
    setBusy(true)
    try {
      const duration = await readMusicDuration(file)
      if (current !== selection.current) return
      setSelected({ blob: file, name: file.name, duration }); setStart('0:00')
    } catch (error) { if (current === selection.current) toast.error(error.message) }
    finally { if (current === selection.current) setBusy(false); if (picker.current) picker.current.value = '' }
  }
  async function save(event) {
    event.preventDefault()
    const track = selected || saved
    const seconds = parseStart(start ?? formatMusicTime(saved?.start))
    if (!track || seconds === null || seconds >= track.duration) { toast.error('Informe um início antes do fim da música, como 1:20.'); return }
    setBusy(true)
    try { await localMusicPlayer.save(user.id, { ...track, start: seconds }); setSelected(null); setStart(null); toast.success('Música e trecho salvos neste aparelho!') }
    catch (error) { toast.error(error.message) }
    finally { setBusy(false) }
  }
  async function play() {
    try { await localMusicPlayer.play(user.id) } catch (error) { toast.error(error.message) }
  }
  async function remove() {
    setBusy(true)
    try { await localMusicPlayer.remove(user.id); setSelected(null); setStart(null); toast.success('Música removida deste aparelho.') }
    catch (error) { toast.error(error.message) }
    finally { setBusy(false) }
  }
  const controls = saved && <div className="flex flex-wrap gap-2">
    <button className="f-btn f-btn-accent" disabled={busy} onClick={play}>{state.playing ? 'Reiniciar no trecho' : 'Tocar para a série'}</button>
    {state.playing && <button className="f-btn f-btn-ghost" onClick={() => localMusicPlayer.pause()}>Pausar música</button>}
  </div>
  if (compact) return <section className="training-music-compact" aria-label="Música para a série">
    <div className="min-w-0"><p className="font-semibold text-sm break-words">{saved?.name || 'Música para a série'}</p><p className="text-xs" style={{ color: 'var(--text-3)' }}>{saved ? `Início em ${formatMusicTime(saved.start)}` : state.loading ? 'Carregando música…' : 'Escolha um áudio do celular no perfil.'}</p>{state.error && <p role="alert">{state.error}</p>}</div>
    {controls || <button className="f-btn f-btn-ghost" onClick={() => navigate('/app/profile')}>Escolher música</button>}
  </section>
  const draft = selected || saved
  return <section className="desktop-profile-section training-music" aria-labelledby="training-music-title">
    <h2 id="training-music-title" className="f-label">Música para a série</h2>
    <p className="text-sm" style={{ color: 'var(--text-3)' }}>Escolha uma música do celular e o trecho que dá força para começar.</p>
    <input ref={picker} hidden type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac" aria-label="Arquivo de áudio" onChange={e => choose(e.target.files?.[0])} />
    <button className="f-btn f-btn-ghost" disabled={busy || state.loading} onClick={() => picker.current?.click()}>{busy ? 'Aguarde…' : draft ? 'Trocar arquivo de áudio' : 'Escolher arquivo de áudio'}</button>
    {draft && <form onSubmit={save} className="space-y-3">
      <p className="text-sm break-words">{draft.name} · {formatMusicTime(draft.duration)}</p>
      <label className="block text-sm">Começar em (minutos:segundos)<input className="f-input mt-1" placeholder="1:20" value={start ?? formatMusicTime(saved?.start)} onChange={e => setStart(e.target.value)} required /></label>
      <button className="f-btn f-btn-accent" disabled={busy || state.loading} type="submit">Salvar música e trecho</button>
    </form>}
    {controls}
    {saved && <button className="f-btn f-btn-ghost" disabled={busy} onClick={remove}>Remover música</button>}
    {state.error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{state.error}</p>}
    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Áudio de até 50 MB, salvo somente neste aparelho. Funciona offline e não é compartilhado com outras pessoas. Ao limpar os dados do app, escolha o arquivo novamente.</p>
  </section>
}
