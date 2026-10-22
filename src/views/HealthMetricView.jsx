import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { HEALTH_PAGES, manualHealthService } from '@/services/healthRecords'
import useHealthData from '@/hooks/useHealthData'
import { localDateKey } from '@/utils/helpers'
import { HealthIcon, HealthTrend } from '@/components/health/HealthVisuals'
import ManualHealthForm from '@/components/health/ManualHealthForm'
import PhoneHealthControls from '@/components/health/PhoneHealthControls'
import HealthGoalEditor from '@/components/health/HealthGoalEditor'

const format = value => value == null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)

export default function HealthMetricView({ category }) {
  const { user } = useAuth()
  const metric = HEALTH_PAGES[category]
  const data = useHealthData(user.id)
  const [date, setDate] = useState(() => localDateKey())
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [period, setPeriod] = useState(7)
  const quickId = useRef(null)
  const view = useRef(null)
  useEffect(() => { const parent = view.current?.closest('.app-content'); if (parent) parent.scrollTop = 0 }, [])
  const startDate = new Date(); startDate.setDate(startDate.getDate() - 30)
  const day = data.days.find(item => item.date === date)
  const records = data.entries.filter(entry => entry.metric === metric.key && entry.local_date === date)
  const oldestChart = new Date(`${date}T12:00:00`); oldestChart.setDate(oldestChart.getDate() - period + 1)
  const chartDays = data.days.filter(item => item.date <= date && item.date >= localDateKey(oldestChart))
  const manual = day?.sources?.[metric.key] === 'manual'

  async function saved() { setShowForm(false); setEditing(null); setActionError(''); await data.refresh() }
  async function quickWater(amount) {
    if (pending) return
    setPending(true); setActionError('')
    const occurred = new Date()
    quickId.current ||= crypto.randomUUID()
    try {
      await manualHealthService.save(user.id, { id: quickId.current, metric: 'water_ml', value: amount, local_date: date, occurred_at: new Date(`${date}T${String(occurred.getHours()).padStart(2, '0')}:${String(occurred.getMinutes()).padStart(2, '0')}`).toISOString(), note: null })
      quickId.current = null
      await data.refresh()
    } catch (err) { setActionError(err.message) }
    finally { setPending(false) }
  }
  async function remove(id) {
    setPending(true); setActionError('')
    try { await manualHealthService.remove(user.id, id); setDeleteId(null); await data.refresh() }
    catch (err) { setActionError(err.message) }
    finally { setPending(false) }
  }
  function changeDate(next) { setDate(next); setShowForm(false); setEditing(null); setDeleteId(null); quickId.current = null }

  return <section ref={view} className={`health-category health-category--${category} max-w-3xl mx-auto p-4 space-y-5`} style={{ '--health-color': metric.color, color: 'var(--text-1)' }}>
    <Link className="health-text-button" to="/app">← Início</Link>
    <header className="health-category-header"><h1><HealthIcon type={metric.permission} size={28} />{metric.label}</h1><Link to="/app/health" className="health-text-button">Conexão e fontes</Link></header>
    <div className="health-date-picker"><button aria-label="Dia anterior" disabled={date <= localDateKey(startDate)} onClick={() => { const previous = new Date(`${date}T12:00:00`); previous.setDate(previous.getDate() - 1); changeDate(localDateKey(previous)) }}>‹</button><label><span className="sr-only">Data do registro</span><input type="date" min={localDateKey(startDate)} max={localDateKey()} value={date} onChange={event => { if (event.target.value) changeDate(event.target.value) }} /></label><button aria-label="Próximo dia" disabled={date >= localDateKey()} onClick={() => { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + 1); changeDate(localDateKey(next)) }}>›</button></div>
    <div className="health-detail health-category-summary">
      <span className="health-eyebrow">{date === localDateKey() ? 'HOJE' : date.split('-').reverse().join('/')}</span>
      <p className="health-category-value">{category === 'sleep' && day?.sleep_minutes != null ? `${Math.floor(day.sleep_minutes / 60)}h ${day.sleep_minutes % 60}min` : format(day?.[metric.key])} <small>{category === 'sleep' && day?.sleep_minutes != null ? '' : metric.unit}</small></p>
      <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>{day?.[metric.key] == null ? 'Nenhum registro para esta data.' : manual ? 'Fonte: registros manuais no Voryn' : day?.sources?.[metric.key] === 'phone' ? 'Fonte: sensor deste celular' : 'Fonte: Health Connect'}</p>
      {manual && <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>O total manual deste dia substitui o importado nesta categoria, evitando duplicidade. Ao excluir todos os registros manuais, o dado importado volta a ser usado.</p>}
      <div className="flex flex-wrap gap-2 mt-5"><button className="f-btn f-btn-accent" disabled={pending} onClick={() => { setEditing(null); setShowForm(true) }}>+ {category === 'nutrition' ? 'Registrar refeição' : category === 'sleep' ? 'Registrar sono' : category === 'weight' ? 'Registrar peso' : category === 'steps' ? 'Registrar passos' : 'Registrar água'}</button>
        {category === 'water' && <><button className="f-btn f-btn-ghost" disabled={pending || data.busy} onClick={() => quickWater(250)}>+ 250 ml</button><button className="f-btn f-btn-ghost" disabled={pending || data.busy} onClick={() => quickWater(500)}>+ 500 ml</button></>}
      </div>
      {category === 'water' && <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>Os botões adicionam ao total manual do dia. O registro fica salvo neste celular e aguarda internet para sincronizar com sua conta.</p>}
    </div>
    <PhoneHealthControls userId={user.id} category={category} date={date} phone={data.phone} refresh={data.refresh} onEdit={entry => { setEditing(entry); setShowForm(true) }} />
    <HealthGoalEditor userId={user.id} metric={metric} value={day?.[metric.key]} />
    <p className="text-xs" role="status">{data.pendingCount ? `${data.pendingCount} registro(s) salvo(s) neste celular, aguardando sincronização com sua conta. Abra o Voryn com internet para sincronizar.` : 'Registros manuais disponíveis offline neste aparelho após carregar. Novos registros são salvos aqui antes de sincronizar.'}</p>
    {data.busy && <p role="status" className="text-sm">Atualizando registros…</p>}
    {(data.error || actionError) && <p role="alert" className="text-sm text-red-400">{actionError || data.error}</p>}
    {showForm && <ManualHealthForm key={`${date}-${editing?.id || 'new'}`} metric={metric} date={date} entry={editing} onSaved={saved} onCancel={() => setShowForm(false)} />}
    {category === 'nutrition' && <div className="health-detail"><h2 className="font-semibold mb-4">Informações nutricionais</h2><div className="health-nutrient-grid">{[['carbs_g', 'Carboidratos'], ['fat_g', 'Gorduras'], ['protein_g', 'Proteínas']].map(([key, label]) => {
      const known = records.filter(item => item[key] != null)
      return <div key={key}><span>{label}</span><strong>{known.length ? format(known.reduce((sum, entry) => sum + Number(entry[key]), 0)) : '—'} <small>g</small></strong></div>
    })}</div><p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>Nutrientes informados nos seus registros manuais. Nenhum valor é estimado automaticamente.</p></div>}
    {category === 'nutrition' && <details className="health-detail space-y-3"><summary className="font-semibold cursor-pointer">Repetir uma refeição recente</summary><p className="text-xs">Preenche um novo registro na data selecionada para você conferir e salvar.</p>{data.entries.filter(item => item.metric === 'nutrition_kcal').slice(0, 12).map(entry => <button key={entry.id} className="f-btn f-btn-ghost w-full text-left" onClick={() => { setEditing({ ...entry, id: undefined, local_date: date, occurred_at: new Date(`${date}T12:00:00`).toISOString() }); setShowForm(true) }}>{entry.meal} · {entry.note || `${format(entry.value)} kcal`} · {entry.local_date.split('-').reverse().join('/')}</button>)}</details>}
    <div className="health-detail space-y-3"><h2 className="font-semibold">{category === 'sleep' ? 'Tempo de sono' : metric.label} · últimos {period} dias</h2><label className="text-sm">Período<select className="f-input" value={period} onChange={event => setPeriod(Number(event.target.value))}><option value="7">7 dias</option><option value="30">30 dias</option></select></label><div style={{ overflowX: 'auto' }}><HealthTrend days={chartDays} metric={metric.key} color={metric.color} limit={period} label={`Últimos ${period} dias`} /></div><p className="text-xs" style={{ color: 'var(--text-3)' }}>Mostra os dias com registros disponíveis, sem preencher dias ausentes. Health Connect consulta os últimos 7 dias.</p></div>
    <div className="health-detail space-y-4"><h2 className="font-semibold">{category === 'nutrition' ? 'Refeições registradas' : 'Meus registros'} · {date.split('-').reverse().join('/')}</h2>
      {!records.length && <p className="text-sm" style={{ color: 'var(--text-3)' }}>Você ainda não adicionou registros manuais neste dia.</p>}
      {records.map(entry => <article className="health-record" key={entry.id}>
        <div><strong>{entry.meal || (category === 'sleep' ? 'Sono registrado' : `${format(Number(entry.value))} ${metric.unit}`)}</strong>{category === 'nutrition' && <p>{format(Number(entry.value))} kcal</p>}{category === 'sleep' && <p>{Math.floor(entry.value / 60)}h {entry.value % 60}min · {new Date(entry.sleep_start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}–{new Date(entry.sleep_end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>}<p>{entry.note}</p><small>{new Date(entry.occurred_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></div>
        <div className="health-record-actions"><button className="health-text-button" disabled={pending} onClick={() => { setEditing(entry); setShowForm(true) }}>Editar</button><button className="health-text-button" disabled={pending} onClick={() => setDeleteId(entry.id)}>Excluir</button></div>
        {deleteId === entry.id && <div className="w-full text-sm"><p>Excluir este registro manual?</p><button className="f-btn f-btn-ghost mt-2 mr-2" disabled={pending} onClick={() => remove(entry.id)}>Confirmar exclusão</button><button className="f-btn f-btn-ghost" disabled={pending} onClick={() => setDeleteId(null)}>Cancelar</button></div>}
      </article>)}
    </div>
    <div className="health-category-footer"><p>{data.notice || 'Registre seus dados manualmente ou conecte uma fonte de saúde.'}</p><button className="health-text-button" disabled={data.busy} onClick={data.refresh}>Atualizar</button></div>
  </section>
}
