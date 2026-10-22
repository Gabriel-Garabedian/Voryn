import { useCallback, useEffect, useRef, useState } from 'react'
import { healthService, HEALTH_METRICS, healthErrorMessage } from '@/services/health'
import { manualHealthService, mergeHealthDays } from '@/services/healthRecords'
import { localDateKey } from '@/utils/helpers'
import { phoneHealth, withPhoneSteps } from '@/services/phoneHealth'
import { readOfflineHealth, flushHealthRecords } from '@/services/healthOffline'

export function hasHealthValues(days) {
  return days.some(day => HEALTH_METRICS.some(metric => Number.isFinite(day[metric.key])))
}

function databaseDeadline(operation) {
  let timer
  return Promise.race([
    Promise.resolve(operation),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('O banco demorou para responder. Seus dados do celular podem ser consultados; tente carregar os registros da conta novamente.')), 20000) }),
  ]).finally(() => clearTimeout(timer))
}

export default function useHealthData(userId) {
  const [imported, setImported] = useState([])
  const [entries, setEntries] = useState([])
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [diagnostics, setDiagnostics] = useState(null)
  const [phone, setPhone] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const running = useRef(false)
  const alive = useRef(false)
  const android = healthService.isAndroid()

  const refresh = useCallback(async () => {
    if (running.current) return
    running.current = true
    setBusy(true)
    setError('')
    setNotice('')
    const end = localDateKey()
    const startDate = new Date(); startDate.setDate(startDate.getDate() - 30)
    const start = localDateKey(startDate)
    const issues = []
    let deviceUpdated = false
    async function loadSaved() {
      if (!navigator.onLine) {
        if (alive.current) setEntries(await manualHealthService.list(userId, start, end))
        return
      }
      const [saved, manual] = await Promise.allSettled([databaseDeadline(healthService.history(userId)), databaseDeadline(manualHealthService.list(userId, start, end))])
      if (!alive.current) return
      if (saved.status === 'fulfilled' && !deviceUpdated) setImported(saved.value || [])
      else if (saved.status === 'rejected') issues.push(saved.reason.message)
      if (manual.status === 'fulfilled') setEntries(manual.value || [])
      else issues.push(manual.reason.message)
    }
    async function loadPhone() {
      if (!phoneHealth.available()) return
      try {
        const result = await phoneHealth.read(userId)
        if (alive.current) setPhone(result)
      } catch (err) { if (alive.current) issues.push(err.message) }
    }
    async function loadDevice() {
      if (!android) return
      try {
        const current = await healthService.status()
        if (!alive.current) return
        setStatus(current)
        if (current.available && current.permissions.length) {
          const summary = await healthService.read()
          if (!alive.current) return
          deviceUpdated = true
          setImported(summary.days.map(day => ({ ...day, synced_at: summary.syncedAt })))
          setNotice(hasHealthValues(summary.days) ? 'Dados disponíveis no Health Connect foram lidos.' : 'Permissões ativas, mas o Health Connect não retornou valores nos últimos sete dias. Seus registros manuais continuam disponíveis.')
        } else setNotice('Você pode registrar dados manualmente ou conectar ao Health Connect.')
      } catch (err) { if (alive.current) issues.push(healthErrorMessage(err)) }
    }
    try {
      await Promise.all([loadSaved(), loadDevice(), loadPhone()])
    } catch (err) { if (alive.current) issues.push(healthErrorMessage(err)) }
    finally {
      running.current = false
      if (alive.current) { setBusy(false); setError(issues.join(' ')) }
    }
  }, [android, userId])

  useEffect(() => {
    alive.current = true
    refresh()
    const subscription = android ? healthService.onResume(refresh).catch(() => null) : null
    const online = () => { void flushHealthRecords(userId).catch(() => {}); refresh() }
    const local = () => {
      const cached = readOfflineHealth(userId)
      setPendingCount(Object.keys(cached.pending).length)
      setEntries(cached.rows)
    }
    setPendingCount(Object.keys(readOfflineHealth(userId).pending).length)
    window.addEventListener('online', online)
    window.addEventListener('voryn-health-local', local)
    return () => {
      alive.current = false
      window.removeEventListener('online', online)
      window.removeEventListener('voryn-health-local', local)
      subscription?.then(handle => handle?.remove()).catch(() => {})
    }
  }, [android, refresh, userId])

  async function diagnose() {
    setBusy(true); setError('')
    try { setDiagnostics(await healthService.diagnose()) }
    catch (err) { setError(healthErrorMessage(err)) }
    finally { setBusy(false) }
  }

  return { imported, entries, days: mergeHealthDays(withPhoneSteps(imported, phone?.days || []), entries), phone, pendingCount, status, error, busy, notice, diagnostics, refresh, diagnose, setError }
}
