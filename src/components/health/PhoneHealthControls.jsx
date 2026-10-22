import React, { useEffect, useState } from 'react'
import { phoneHealth } from '@/services/phoneHealth'
import { manualHealthService } from '@/services/healthRecords'

export default function PhoneHealthControls({ userId, category, date, phone, refresh, onEdit }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [timer, setTimer] = useState(() => localStorage.getItem(`voryn_sleep_timer_${userId}`))
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`voryn_sleep_dismissed_${userId}`)) || [] } catch { return [] }
  })
  useEffect(() => {
    let alive = true
    if (category === 'sleep' && phone?.usageAllowed) {
      phoneHealth.sleepCandidates(userId).then(result => { if (alive) setCandidates(result.candidates) }).catch(err => { if (alive) setError(err.message) })
    }
    return () => { alive = false }
  }, [category, phone?.usageAllowed, userId])
  if (!['steps', 'sleep'].includes(category)) return null
  async function run(operation) {
    setBusy(true); setError('')
    try { await operation(); await refresh() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const candidate = candidates.find(item => item.date === date && !dismissed.includes(item.sleep_start))
  const suggestion = candidate && { ...candidate, id: undefined, local_date: candidate.date, metric: 'sleep_minutes', occurred_at: candidate.sleep_end, note: 'Horários sugeridos pela tela desligada; confirmados por mim.' }
  function dismiss() {
    const next = [...dismissed, candidate.sleep_start]
    localStorage.setItem(`voryn_sleep_dismissed_${userId}`, JSON.stringify(next)); setDismissed(next)
  }
  async function finishTimer() {
    const end = new Date()
    const value = Math.round((end - new Date(timer)) / 60000)
    if (value < 1 || value > 1440) throw new Error('Ajuste os horários manualmente: o intervalo deve ter de 1 minuto a 24 horas.')
    const local = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    await manualHealthService.save(userId, { id: crypto.randomUUID(), metric: 'sleep_minutes', local_date: local, occurred_at: end.toISOString(), sleep_start: timer, sleep_end: end.toISOString(), value, note: 'Horários registrados pelo temporizador.' })
    localStorage.removeItem(`voryn_sleep_timer_${userId}`); setTimer(null)
  }
  return <div className="health-detail space-y-3">
    <h2 className="font-semibold">{category === 'steps' ? 'Passos pelo celular' : 'Sono com o celular'}</h2>
    {category === 'steps' ? <>
      <p className="text-sm">O sensor conta a partir da ativação e guarda os totais neste aparelho, sem internet. Leve o celular com você. Os passos do celular substituem o total do Health Connect nas datas registradas.</p>
      {phoneHealth.available() ? <button className="f-btn f-btn-accent" disabled={busy || phone?.available === false} onClick={() => run(() => phone?.enabled ? phoneHealth.stop() : phoneHealth.start(userId))}>{phone?.enabled ? 'Pausar contagem automática' : 'Ativar contagem automática'}</button> : <p>Disponível no aplicativo Android instalado.</p>}
      {phone?.available === false && <p>O Android não disponibilizou um sensor de passos neste aparelho.</p>}
      <p className="text-xs" style={{ color: 'var(--text-3)' }}>A contagem usa uma notificação contínua. Forçar a parada ou restringir a bateria pode interrompê-la. Reabra o Voryn após reiniciar se necessário. Intervalos sem informação na mudança de dia não são estimados.</p>
    </> : <>
      <p className="text-sm">O tempo de tela desligada pode sugerir quando você dormiu e acordou. Isso é uma estimativa: ficar sem usar o celular também pode significar estar acordado. Confirme os horários antes de salvar.</p>
      {phoneHealth.available() && !phone?.usageAllowed && <button disabled={busy} className="f-btn f-btn-ghost" onClick={() => run(() => phoneHealth.openSleepSettings())}>Autorizar sugestões de horário</button>}
      {suggestion && <div className="space-y-3"><p>Sugestão: {new Date(candidate.sleep_start).toLocaleString('pt-BR')} até {new Date(candidate.sleep_end).toLocaleString('pt-BR')} · {Math.floor(candidate.value / 60)}h {candidate.value % 60}min</p><button className="f-btn f-btn-accent" onClick={() => onEdit(suggestion)}>Conferir e registrar</button> <button className="health-text-button" onClick={dismiss}>Descartar sugestão</button></div>}
      {phone?.usageAllowed && !suggestion && <p className="text-sm">Nenhuma sugestão disponível para esta data.</p>}
      <div className="flex flex-wrap gap-2">{timer ? <><p className="w-full text-sm">Iniciado em {new Date(timer).toLocaleString('pt-BR')}</p><button className="f-btn f-btn-accent" disabled={busy} onClick={() => run(finishTimer)}>Acordei · salvar intervalo</button><button className="health-text-button" onClick={() => { localStorage.removeItem(`voryn_sleep_timer_${userId}`); setTimer(null) }}>Cancelar temporizador</button></> : <button className="f-btn f-btn-ghost" onClick={() => { const now = new Date().toISOString(); localStorage.setItem(`voryn_sleep_timer_${userId}`, now); setTimer(now) }}>Vou dormir · iniciar temporizador</button>}</div>
      <p className="text-xs" style={{ color: 'var(--text-3)' }}>O temporizador funciona offline. Não mede fases do sono, ronco ou oxigenação. As sugestões usam apenas horários da tela; o Voryn não guarda os nomes dos aplicativos utilizados.</p>
    </>}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </div>
}
