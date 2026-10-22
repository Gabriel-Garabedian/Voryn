import { supabase } from '@/lib/supabase'

const key = id => `voryn_health_records_v1_${id}`
const running = new Map()
export function readOfflineHealth(id) {
  try { return JSON.parse(localStorage.getItem(key(id))) || { rows: [], pending: {} } }
  catch { return { rows: [], pending: {} } }
}
export function writeOfflineHealth(id, state) {
  try { localStorage.setItem(key(id), JSON.stringify({ ...state, revision: crypto.randomUUID() })) }
  catch { throw new Error('O armazenamento do celular está cheio ou indisponível. O registro não foi salvo.') }
  window.dispatchEvent(new Event('voryn-health-local'))
}
export function queueHealthRecord(id, row, remove = false) {
  const state = readOfflineHealth(id)
  state.rows = state.rows.filter(item => item.id !== row.id)
  if (!remove) state.rows.push(row)
  state.pending[row.id] = { token: crypto.randomUUID(), remove, row }
  writeOfflineHealth(id, state)
}
export function flushHealthRecords(id) {
  if (running.has(id)) return running.get(id)
  const task = (async () => {
    if (!navigator.onLine) return
    let timer
    const { data } = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Sincronização pendente. Entre novamente quando houver internet.')), 10000) }),
    ]).finally(() => clearTimeout(timer))
    if (data?.session?.user?.id !== id) return
    for (const [recordId, operation] of Object.entries(readOfflineHealth(id).pending)) {
      const request = operation.remove
        ? supabase.from('health_manual_entries').delete().eq('id', recordId).eq('user_id', id)
        : supabase.from('health_manual_entries').upsert(operation.row, { onConflict: 'id' })
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const { error } = await Promise.resolve(request.abortSignal(controller.signal)).finally(() => clearTimeout(timeout))
      if (error) throw new Error('Registros salvos neste celular. A sincronização está pendente: confira a internet e o bloco REGISTROS MANUAIS DE SAÚDE no schema.sql.')
      const current = readOfflineHealth(id)
      if (current.pending[recordId]?.token === operation.token) {
        delete current.pending[recordId]
        writeOfflineHealth(id, current)
      }
    }
  })().finally(() => running.delete(id))
  running.set(id, task)
  return task
}
export function mergeRemoteHealth(id, rows, start, end, expectedRevision) {
  const current = readOfflineHealth(id)
  // A local edit or deletion made during the request takes priority over that response.
  if (current.revision !== expectedRevision) return current.rows.filter(row => row.local_date >= start && row.local_date <= end)
  const merged = new Map(current.rows.filter(row => row.local_date < start || row.local_date > end).map(row => [row.id, row]))
  rows.forEach(row => merged.set(row.id, row))
  for (const [recordId, operation] of Object.entries(current.pending)) {
    if (operation.remove) merged.delete(recordId)
    else merged.set(recordId, operation.row)
  }
  writeOfflineHealth(id, { rows: [...merged.values()], pending: current.pending })
  return [...merged.values()].filter(row => row.local_date >= start && row.local_date <= end)
}
