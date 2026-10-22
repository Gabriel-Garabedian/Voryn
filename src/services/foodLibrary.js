const storageKey = userId => `voryn_my_foods_v1_${userId}`
export function readFoods(userId) {
  try { return JSON.parse(localStorage.getItem(storageKey(userId))) || [] } catch { return [] }
}
export function saveFood(userId, food) {
  const normalized = { ...food, id: food.id || crypto.randomUUID(), name: food.name.trim() }
  if (!normalized.name || normalized.name.length > 80) throw new Error('Informe o nome do alimento (até 80 caracteres).')
  for (const key of ['kcal', 'protein_g', 'carbs_g', 'fat_g']) {
    if (normalized[key] !== null && (!Number.isFinite(normalized[key]) || normalized[key] < 0 || normalized[key] > 5000)) throw new Error('Confira os valores nutricionais por 100 g.')
  }
  if (!normalized.kcal) throw new Error('Informe as calorias por 100 g.')
  const next = [normalized, ...readFoods(userId).filter(item => item.id !== normalized.id)].slice(0, 300)
  localStorage.setItem(storageKey(userId), JSON.stringify(next))
  return next
}
export function removeFood(userId, id) {
  const next = readFoods(userId).filter(item => item.id !== id)
  localStorage.setItem(storageKey(userId), JSON.stringify(next))
  return next
}
export function portionNutrition(food, grams) {
  if (!Number.isFinite(grams) || grams <= 0 || grams > 10000) throw new Error('Informe uma porção válida em gramas.')
  return Object.fromEntries(['kcal', 'protein_g', 'carbs_g', 'fat_g'].map(key => [key, food[key] == null ? null : Math.round(food[key] * grams / 100 * 10) / 10]))
}
