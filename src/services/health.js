import { Capacitor, registerPlugin } from '@capacitor/core'
import { supabase } from '@/lib/supabase'

const HealthConnect = registerPlugin('HealthConnect')
export function healthErrorMessage(error) {
  if (error?.code === 'UNIMPLEMENTED' || /not implemented|not available.*android/i.test(error?.message || '')) {
    return 'A integração de saúde não foi carregada neste aplicativo. Instale o APK mais recente e abra o Voryn novamente.'
  }
  if (error?.code === 'PERMISSION_DENIED') return 'O acesso aos dados foi negado ou revogado. Abra as permissões do Voryn no Health Connect.'
  return error?.message || 'Não foi possível conectar ao Health Connect. Tente novamente.'
}

async function nativeCall(method, timeout = 35000) {
  let timer
  try {
    return await Promise.race([
      HealthConnect[method](),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(method === 'connect'
          ? 'A autorização ainda não terminou. Volte ao Voryn e confira as permissões no Health Connect.'
          : 'O Health Connect demorou para responder. Abra suas configurações, confira as permissões e tente novamente.')), timeout)
      }),
    ])
  } catch (error) {
    throw Object.assign(new Error(healthErrorMessage(error)), { code: error?.code })
  } finally { clearTimeout(timer) }
}
export const HEALTH_METRICS = [
  { key: 'steps', permission: 'steps', label: 'Passos', unit: 'passos' },
  { key: 'sleep_minutes', permission: 'sleep', label: 'Sono', unit: 'min' },
  { key: 'nutrition_kcal', permission: 'nutrition', label: 'Alimentação', unit: 'kcal' },
  { key: 'water_ml', permission: 'water', label: 'Água', unit: 'ml' },
  { key: 'weight_kg', permission: 'weight', label: 'Peso', unit: 'kg' },
]

export function summaryRows(userId, summary) {
  if (!userId) throw new Error('Entre na sua conta para salvar os dados.')
  return summary.days.map(day => ({
    user_id: userId,
    date: day.date,
    timezone: day.timezone,
    source: 'health_connect',
    synced_at: summary.syncedAt,
    permissions: day.permissions,
    ...Object.fromEntries(HEALTH_METRICS.map(({ key, permission }) => [
      key, day.permissions.includes(permission) && Number.isFinite(day[key]) ? day[key] : null,
    ])),
  }))
}

export const healthService = {
  isAndroid: () => Capacitor.getPlatform() === 'android',
  status: () => nativeCall('status'),
  connect: () => nativeCall('connect', 180000),
  openSettings: () => nativeCall('openSettings'),
  read: () => nativeCall('readSummary'),
  diagnose: () => nativeCall('diagnose'),
  onResume: callback => HealthConnect.addListener('resume', callback),
  async save(userId, summary) {
    const { error } = await supabase.from('health_daily_summaries')
      .upsert(summaryRows(userId, summary), { onConflict: 'user_id,date,source' })
    if (error) throw new Error('Os dados foram lidos, mas não foi possível salvar na conta. Verifique a conexão e a migração do banco.')
  },
  async history(userId) {
    const { data, error } = await supabase.from('health_daily_summaries')
      .select('*').eq('user_id', userId).order('date', { ascending: false }).limit(7)
    if (error) throw new Error('Não foi possível carregar o histórico. Verifique a conexão e a migração do banco.')
    return data
  },
  async remove(userId) {
    const { error } = await supabase.from('health_daily_summaries').delete().eq('user_id', userId)
    if (error) throw new Error('Não foi possível excluir os resumos. Tente novamente.')
  },
}
