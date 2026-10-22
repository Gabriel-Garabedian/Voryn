import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { healthService } from '@/services/health'
import { localDateKey } from '@/utils/helpers'
import { ActivityRings, HealthIcon, HealthTrend } from './HealthVisuals'
import useHealthData from '@/hooks/useHealthData'
import { readHealthGoals, saveHealthGoal } from '@/services/healthGoals'

const number = value => value == null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)

export default function HomeHealthCards() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { days, status, error, busy: loading, refresh, notice } = useHealthData(user.id)
  const [goals, setGoals] = useState(() => readHealthGoals(user.id))
  const android = healthService.isAndroid()

  const current = days.find(day => day.date === localDateKey())
  const weight = [...days].sort((a, b) => b.date.localeCompare(a.date)).find(day => day.weight_kg != null)
  const connected = android ? Boolean(status?.permissions?.length) : days.length > 0
  const paths = { steps: 'steps', sleep_minutes: 'sleep', water_ml: 'water', nutrition_kcal: 'nutrition', weight_kg: 'weight' }
  const open = metric => navigate(`/app/health${metric ? `/${paths[metric]}` : ''}`)
  const empty = key => loading ? 'Atualizando…' : android && !status?.permissions?.includes(key) ? 'Conecte seus dados' : 'Sem registro hoje'
  const lastSync = days.find(day => day.synced_at)?.synced_at

  function changeGoal(key, value) {
    const nextValue = Number(value)
    if (!Number.isFinite(nextValue) || nextValue <= 0) return
    try { setGoals(saveHealthGoal(user.id, key, nextValue)) } catch {}
  }

  return <section className="home-health" aria-labelledby="home-health-title">
    <div className="health-section-heading">
      <div><p className="health-eyebrow">CUIDADO DIÁRIO</p><h2 id="home-health-title">Sua saúde, por perto.</h2></div>
      <button className="health-text-button" onClick={() => open()}>Ver tudo <span aria-hidden="true">↗</span></button>
    </div>
    <div className="health-home-grid">
      <button className="health-tile health-tile--activity" onClick={() => open('steps')} aria-label="Ver atividade diária">
        <span className="health-tile__title">Atividade diária <span className="health-tile__arrow">↗</span></span>
        <ActivityRings values={current} goals={goals} />
        <span className="health-ring-legend"><i />Passos <i />Água <i />Sono</span>
      </button>
      <button className="health-tile health-tile--sleep" onClick={() => open('sleep_minutes')} aria-label="Ver sono">
        <span className="health-tile__title">Sono <HealthIcon type="sleep" /></span>
        <span className="health-moon" aria-hidden="true">☾</span>
        <strong className="health-tile__value">{current?.sleep_minutes != null ? `${Math.floor(current.sleep_minutes / 60)}h ${Math.round(current.sleep_minutes % 60)}min` : '—'}</strong>
        <span className="health-tile__caption">{current?.sleep_minutes != null ? (current.sources.sleep_minutes === 'manual' ? 'Sono registrado no Voryn' : 'Sono importado hoje') : empty('sleep')}</span>
      </button>
      <button className="health-tile" onClick={() => open('nutrition_kcal')} aria-label="Ver alimentação">
        <span className="health-tile__title">Alimentação <HealthIcon type="nutrition" /></span>
        <strong className="health-tile__value">{number(current?.nutrition_kcal)} <small>kcal</small></strong>
        <span className="health-tile__caption">{current?.nutrition_kcal != null ? (current.sources.nutrition_kcal === 'manual' ? 'Refeições registradas no Voryn' : 'Energia importada hoje') : empty('nutrition')}</span>
        <HealthTrend days={days} metric="nutrition_kcal" color="#e6b779" />
      </button>
      <button className="health-tile" onClick={() => open('steps')} aria-label="Ver passos">
        <span className="health-tile__title">Passos <HealthIcon type="steps" /></span>
        <strong className="health-tile__value">{number(current?.steps)}</strong>
        <span className="health-tile__caption">{current?.steps != null ? `Meta pessoal: ${number(goals.steps)} passos` : empty('steps')}</span>
        <span className="health-progress"><span style={{ width: `${Math.min(100, (current?.steps || 0) / goals.steps * 100)}%` }} /></span>
      </button>
      <button className="health-tile health-tile--water" onClick={() => open('water_ml')} aria-label="Ver água">
        <span className="health-tile__title">Água <HealthIcon type="water" /></span>
        <div className="health-water-body"><span><strong className="health-tile__value">{number(current?.water_ml)} <small>ml</small></strong><span className="health-tile__caption">{current?.water_ml != null ? `Meta pessoal: ${number(goals.water_ml)} ml` : empty('water')}</span></span><HealthTrend days={days} metric="water_ml" color="#7dd5df" /></div>
      </button>
      <button className="health-tile health-tile--weight" onClick={() => open('weight_kg')} aria-label="Ver peso">
        <span className="health-tile__title">Peso <HealthIcon type="weight" /></span>
        <strong className="health-tile__value">{number(weight?.weight_kg)} <small>kg</small></strong>
        <span className="health-tile__caption">{weight ? `Último registro: ${weight.date.split('-').reverse().join('/')}` : 'Acompanhe seus registros de peso'}</span>
      </button>
    </div>
    <div className="health-connection-strip">
      <span className={`health-connection-dot ${connected && !error ? 'is-connected' : ''}`} aria-hidden="true" />
      <div><strong>{loading ? 'Conferindo seus dados…' : error ? 'A conexão precisa de atenção' : connected ? (android ? 'Health Connect conectado' : 'Seus registros de saúde') : 'Sua saúde no Voryn'}</strong><p>{error || notice || (lastSync ? `Atualizado em ${new Date(lastSync).toLocaleString('pt-BR')}` : 'Registre manualmente ou conecte seus dados.')}</p></div>
      <button className="health-text-button" disabled={loading} onClick={() => connected && !error ? refresh() : open()}>{connected && !error ? 'Atualizar' : 'Conectar'}</button>
    </div>
    <details className="health-goals"><summary>Minhas metas diárias</summary><p>Referências pessoais editáveis. Ajuste-as à sua rotina.</p><div>
      <label>Passos<input type="number" min="1" step="500" value={goals.steps} onChange={event => changeGoal('steps', event.target.value)} /></label>
      <label>Água (ml)<input type="number" min="1" step="100" value={goals.water_ml} onChange={event => changeGoal('water_ml', event.target.value)} /></label>
      <label>Sono (min)<input type="number" min="1" step="30" value={goals.sleep_minutes} onChange={event => changeGoal('sleep_minutes', event.target.value)} /></label>
    </div></details>
  </section>
}
