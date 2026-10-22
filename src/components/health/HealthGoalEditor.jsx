import React, { useState } from 'react'
import { readHealthGoals, saveHealthGoal } from '@/services/healthGoals'

export default function HealthGoalEditor({ userId, metric, value }) {
  const [goal, setGoal] = useState(() => readHealthGoals(userId)[metric.key])
  const [draft, setDraft] = useState(goal)
  const [message, setMessage] = useState('')
  const percent = Math.min(100, Math.round((value || 0) / goal * 100))
  return <div className="health-detail space-y-3"><h2 className="font-semibold">{metric.key === 'weight_kg' ? 'Peso desejado' : 'Meta diária'}</h2>
    <p>{goal.toLocaleString('pt-BR')} {metric.unit}{metric.key !== 'weight_kg' && value != null ? ` · ${percent}% da meta` : ''}</p>
    {metric.key !== 'weight_kg' && <progress className="w-full" max="100" value={percent} aria-label="Progresso da meta" />}
    <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); try { saveHealthGoal(userId, metric.key, Number(draft)); setGoal(Number(draft)); setMessage('Meta salva neste aparelho.') } catch (err) { setMessage(err.message) } }}>
      <label className="text-sm">{metric.key === 'weight_kg' ? 'Meu objetivo' : 'Minha meta'} ({metric.unit})<input className="f-input" type="number" min={metric.key === 'weight_kg' ? '0.1' : '1'} step={metric.key === 'weight_kg' ? '0.1' : '1'} value={draft} onChange={event => setDraft(event.target.value)} required /></label><button className="f-btn f-btn-ghost" type="submit">Salvar meta</button>
    </form>
    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Referência pessoal editável, guardada por conta neste celular. O valor inicial é apenas um exemplo para você ajustar.</p>
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>
}
