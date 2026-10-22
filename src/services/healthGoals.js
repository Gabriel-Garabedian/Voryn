export const DEFAULT_HEALTH_GOALS = { steps: 6000, water_ml: 2000, sleep_minutes: 480, nutrition_kcal: 2000, weight_kg: 70 }
export function readHealthGoals(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(`voryn_health_goals_${userId}`) || '{}')
    return Object.fromEntries(Object.entries(DEFAULT_HEALTH_GOALS).map(([key, fallback]) => [key, Number.isFinite(saved[key]) && saved[key] > 0 ? saved[key] : fallback]))
  } catch { return { ...DEFAULT_HEALTH_GOALS } }
}
export function saveHealthGoal(userId, metric, value) {
  const limits = { steps: 200000, water_ml: 30000, sleep_minutes: 1440, nutrition_kcal: 30000, weight_kg: 1000 }
  if (!Object.hasOwn(limits, metric) || !Number.isFinite(value) || value <= 0 || value > limits[metric]) throw new Error('Informe uma meta válida.')
  const next = { ...readHealthGoals(userId), [metric]: value }
  localStorage.setItem(`voryn_health_goals_${userId}`, JSON.stringify(next))
  window.dispatchEvent(new Event('voryn-health-goals'))
  return next
}
