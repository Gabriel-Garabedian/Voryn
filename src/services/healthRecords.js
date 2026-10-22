import { supabase } from '@/lib/supabase'
import { flushHealthRecords, mergeRemoteHealth, queueHealthRecord, readOfflineHealth } from './healthOffline'

export const HEALTH_PAGES = {
  steps: { key: 'steps', label: 'Passos', unit: 'passos', color: '#a9df64', permission: 'steps' },
  sleep: { key: 'sleep_minutes', label: 'Sono', unit: 'min', color: '#b99aff', permission: 'sleep' },
  nutrition: { key: 'nutrition_kcal', label: 'Alimentação', unit: 'kcal', color: '#e6b779', permission: 'nutrition' },
  water: { key: 'water_ml', label: 'Água', unit: 'ml', color: '#7dd5df', permission: 'water' },
  weight: { key: 'weight_kg', label: 'Peso', unit: 'kg', color: '#d1a4e6', permission: 'weight' },
}

export function mergeHealthDays(imported = [], entries = []) {
  const byDate = new Map(imported.map(day => [day.date, { ...day, sources: Object.fromEntries(Object.values(HEALTH_PAGES).map(metric => [metric.key, day[metric.key] == null ? null : day.sources?.[metric.key] || 'health_connect'])) }]))
  const groups = new Map()
  for (const entry of entries) {
    const key = `${entry.local_date}:${entry.metric}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(entry)
  }
  for (const records of groups.values()) {
    records.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at) || (b.created_at || '').localeCompare(a.created_at || ''))
    const latest = records[0]
    const day = byDate.get(latest.local_date) || { date: latest.local_date, sources: {} }
    const additive = ['water_ml', 'nutrition_kcal'].includes(latest.metric)
    day[latest.metric] = additive ? records.reduce((sum, item) => sum + Number(item.value), 0) : Number(latest.value)
    day.sources[latest.metric] = 'manual'
    byDate.set(latest.local_date, day)
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export function validateHealthEntry(entry) {
  const value = Number(entry.value)
  const limits = { steps: 200000, sleep_minutes: 1440, nutrition_kcal: 30000, water_ml: 30000, weight_kg: 1000 }
  if (!Object.hasOwn(limits, entry.metric) || !Number.isFinite(value) || value <= 0 || value > limits[entry.metric]) throw new Error('Informe um valor válido para este registro.')
  if (['steps', 'sleep_minutes'].includes(entry.metric) && !Number.isInteger(value)) throw new Error('Use um número inteiro para passos ou minutos.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.local_date) || !Number.isFinite(Date.parse(entry.occurred_at))) throw new Error('Informe uma data e um horário válidos.')
  const day = new Date(`${entry.local_date}T12:00:00Z`)
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== entry.local_date) throw new Error('Informe uma data válida.')
  if (entry.metric === 'sleep_minutes') {
    const duration = (Date.parse(entry.sleep_end) - Date.parse(entry.sleep_start)) / 60000
    if (!Number.isFinite(duration) || duration <= 0 || duration > 1440 || Math.abs(value - duration) >= 1) throw new Error('Confira os horários e a duração do sono.')
  }
  if ((entry.note || '').length > 250) throw new Error('A descrição deve ter até 250 caracteres.')
  for (const key of ['protein_g', 'carbs_g', 'fat_g']) {
    if (entry[key] != null && (!Number.isFinite(Number(entry[key])) || Number(entry[key]) < 0 || Number(entry[key]) > 5000)) throw new Error('Informe os nutrientes em gramas, com valores positivos ou zero.')
  }
  return { ...entry, value }
}

const databaseError = () => new Error('Não foi possível acessar os registros manuais. Verifique a conexão e execute o bloco REGISTROS MANUAIS DE SAÚDE do schema.sql no Supabase.')
export const manualHealthService = {
  async list(userId, start, end) {
    if (!navigator.onLine) return readOfflineHealth(userId).rows.filter(row => row.local_date >= start && row.local_date <= end)
    await flushHealthRecords(userId).catch(() => {})
    const revision = readOfflineHealth(userId).revision
    const entries = []
    let page = 0
    while (true) {
      const { data, error } = await supabase.from('health_manual_entries').select('*').eq('user_id', userId)
        .gte('local_date', start).lte('local_date', end).order('occurred_at', { ascending: false }).order('id')
        .range(page * 500, (page + 1) * 500 - 1)
      if (error) {
        const cached = readOfflineHealth(userId).rows.filter(row => row.local_date >= start && row.local_date <= end)
        if (cached.length) return cached
        throw databaseError()
      }
      entries.push(...(data || []))
      if (!data || data.length < 500) return mergeRemoteHealth(userId, entries, start, end, revision)
      page += 1
    }
  },
  async save(userId, entry) {
    if (!userId) throw new Error('Entre na sua conta para salvar o registro.')
    const valid = validateHealthEntry(entry)
    const row = { ...valid, id: valid.id || crypto.randomUUID(), user_id: userId }
    queueHealthRecord(userId, row)
    void flushHealthRecords(userId).catch(() => {})
    return row
  },
  async remove(userId, id) {
    if (!userId) throw new Error('Entre na sua conta para excluir o registro.')
    queueHealthRecord(userId, { id, user_id: userId }, true)
    void flushHealthRecords(userId).catch(() => {})
  },
}
