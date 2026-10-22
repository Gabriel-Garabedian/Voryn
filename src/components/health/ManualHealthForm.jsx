import React, { useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { manualHealthService } from '@/services/healthRecords'
import FoodPicker from './FoodPicker'

const MEALS = ['Café da manhã', 'Almoço', 'Jantar', 'Lanche da manhã', 'Lanche da tarde', 'Lanche da noite']
const localTime = instant => {
  const date = new Date(instant)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default function ManualHealthForm({ metric, date, entry, onSaved, onCancel }) {
  const { user } = useAuth()
  const [value, setValue] = useState(entry?.value ?? (metric.key === 'water_ml' ? 250 : ''))
  const [note, setNote] = useState(entry?.note || '')
  const [meal, setMeal] = useState(entry?.meal || MEALS[0])
  const [time, setTime] = useState(entry ? localTime(entry.occurred_at).slice(11) : localTime(new Date()).slice(11))
  const previousDay = new Date(`${date}T12:00:00`); previousDay.setDate(previousDay.getDate() - 1)
  const [sleepStart, setSleepStart] = useState(entry?.sleep_start ? localTime(entry.sleep_start) : `${localTime(previousDay).slice(0, 10)}T23:00`)
  const [sleepEnd, setSleepEnd] = useState(entry?.sleep_end ? localTime(entry.sleep_end) : `${date}T07:00`)
  const [nutrients, setNutrients] = useState({ protein_g: entry?.protein_g ?? '', carbs_g: entry?.carbs_g ?? '', fat_g: entry?.fat_g ?? '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const id = useRef(entry?.id || crypto.randomUUID())
  const sleep = metric.key === 'sleep_minutes'
  const nutrition = metric.key === 'nutrition_kcal'

  async function save(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const duration = Math.round((new Date(sleepEnd) - new Date(sleepStart)) / 60000)
      if (sleep && (sleepEnd.slice(0, 10) !== date || duration <= 0 || duration > 1440)) throw new Error('A hora de acordar deve corresponder à data selecionada; o sono deve durar entre 1 minuto e 24 horas.')
      const payload = {
        id: id.current, metric: metric.key, local_date: date,
        occurred_at: new Date(sleep ? sleepEnd : `${date}T${time}`).toISOString(),
        value: sleep ? duration : Number(value), note: note.trim() || null,
        meal: nutrition ? meal : null,
        sleep_start: sleep ? new Date(sleepStart).toISOString() : null,
        sleep_end: sleep ? new Date(sleepEnd).toISOString() : null,
        ...Object.fromEntries(Object.entries(nutrients).map(([key, val]) => [key, nutrition && val !== '' ? Number(val) : null])),
      }
      await manualHealthService.save(user.id, payload)
      await onSaved()
    } catch (err) { setError(err.message || 'Não foi possível salvar este registro.') }
    finally { setBusy(false) }
  }

  return <form className="health-detail health-entry-form space-y-4" onSubmit={save} aria-label={`Registrar ${metric.label}`}>
    <h2 className="font-semibold">{entry ? 'Editar registro' : `Registrar ${metric.label.toLowerCase()}`}</h2>
    <p className="text-xs" style={{ color: 'var(--text-3)' }}>O registro é salvo neste celular e sincronizado com sua conta quando houver internet. Os registros manuais desta categoria substituem o total importado deste dia.</p>
    {sleep ? <div className="health-form-grid">
      <label>Fui dormir<input className="f-input" type="datetime-local" value={sleepStart} onChange={event => setSleepStart(event.target.value)} required /></label>
      <label>Acordei<input className="f-input" type="datetime-local" value={sleepEnd} onChange={event => setSleepEnd(event.target.value)} required /></label>
    </div> : <div className="health-form-grid">
      <label>{metric.key === 'steps' ? 'Total de passos do dia' : `${metric.label} (${metric.unit})`}<input className="f-input" type="number" min={metric.key === 'weight_kg' ? '.1' : '1'} step={metric.key === 'steps' ? '1' : '.1'} value={value} onChange={event => setValue(event.target.value)} required /></label>
      <label>Horário<input className="f-input" type="time" value={time} onChange={event => setTime(event.target.value)} required /></label>
    </div>}
    {nutrition && <>
      <FoodPicker userId={user.id} onApply={food => { setValue(food.kcal ?? ''); setNote(food.note); setNutrients({ protein_g: food.protein_g ?? '', carbs_g: food.carbs_g ?? '', fat_g: food.fat_g ?? '' }) }} />
      <label>Refeição<select aria-label="Refeição" className="f-input" value={meal} onChange={event => setMeal(event.target.value)}>{MEALS.map(item => <option key={item}>{item}</option>)}</select></label>
      <div className="health-form-grid health-form-grid--three">{[['carbs_g', 'Carboidratos'], ['protein_g', 'Proteínas'], ['fat_g', 'Gorduras']].map(([key, label]) => <label key={key}>{label} (g)<input className="f-input" type="number" min="0" max="5000" step=".1" placeholder="Opcional" value={nutrients[key]} onChange={event => setNutrients(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
    </>}
    <label>{nutrition ? 'Alimentos / descrição' : 'Observação'}<input className="f-input" maxLength={250} value={note} onChange={event => setNote(event.target.value)} placeholder={nutrition ? 'Ex.: arroz, feijão e frango' : 'Opcional'} /></label>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    <div className="flex flex-wrap gap-3"><button className="f-btn f-btn-accent" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar registro'}</button><button className="f-btn f-btn-ghost" type="button" disabled={busy} onClick={onCancel}>Cancelar</button></div>
  </form>
}
