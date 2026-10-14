const BASE = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0'

const MUSCLE_ENDPOINTS = {
  Peito: 'pectorals',
  Costas: 'upper-back',
  Ombro: 'delts',
  Bíceps: 'biceps',
  Tríceps: 'triceps',
  Pernas: 'quads',
  Glúteo: 'glutes',
  Posterior: 'hamstrings',
  Panturrilha: 'calves',
  Antebraço: 'forearms',
  Abdômen: 'abs',
  Cardio: 'cardio',
  Funcional: 'abs',
  Mobilidade: 'abs',
}

const ALIASES = {
  'supino reto': ['barbell bench press'],
  'supino inclinado': ['incline bench press'],
  'supino com halteres': ['dumbbell bench press'],
  'flexao de braco': ['push-up'],
  'puxada frontal': ['lat pulldown'],
  'remada curvada': ['barbell bent over row'],
  'remada com haltere': ['dumbbell row'],
  'barra fixa': ['pull-up'],
  'levantamento terra': ['barbell deadlift'],
  'desenvolvimento c barra': ['barbell shoulder press'],
  'desenvolvimento halteres': ['dumbbell shoulder press'],
  'elevacao lateral': ['dumbbell lateral raise'],
  'rosca direta': ['barbell curl'],
  'rosca alternada': ['alternating dumbbell curl'],
  'rosca martelo': ['hammer curl'],
  'triceps pulley': ['cable pushdown'],
  'agachamento livre': ['barbell squat'],
  'leg press 45': ['leg press'],
  'stiff': ['barbell romanian deadlift'],
  'hip thrust': ['barbell hip thrust'],
}

const cache = new Map()
const ALL_EXERCISES_KEY = '__all__'

function normalize(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function scoreExercise(target, candidate, equipment) {
  const targetText = normalize(target)
  const candidateText = normalize(candidate.name)
  const aliases = ALIASES[targetText] || []
  const aliasScore = aliases.some(alias => candidateText.includes(normalize(alias))) ? 100 : 0
  const targetTokens = new Set(targetText.split(' ').filter(token => token.length > 2))
  const overlap = candidateText.split(' ').filter(token => targetTokens.has(token)).length * 10
  const equipmentScore = equipment && normalize(candidate.equipment).includes(normalize(equipment)) ? 5 : 0
  return aliasScore + overlap + equipmentScore
}

async function loadMuscle(muscle) {
  const endpoint = MUSCLE_ENDPOINTS[muscle]
  if (!endpoint) return []
  if (!cache.has(endpoint)) {
    const promise = fetch(`${BASE}/api/en/muscles/${endpoint}.json`)
      .then(response => {
        if (!response.ok) throw new Error(`GIF source returned ${response.status}`)
        return response.json()
      })
      .then(payload => payload.exercises || [])
    cache.set(endpoint, promise)
  }
  return cache.get(endpoint)
}

async function loadAllExercises() {
  if (!cache.has(ALL_EXERCISES_KEY)) {
    const promise = fetch(`${BASE}/api/en/exercises.json`)
      .then(response => {
        if (!response.ok) throw new Error(`GIF source returned ${response.status}`)
        return response.json()
      })
      .then(payload => payload.exercises || payload || [])
    cache.set(ALL_EXERCISES_KEY, promise)
  }
  return cache.get(ALL_EXERCISES_KEY)
}

export async function findExerciseGif(exercise) {
  if (!exercise?.name) return null
  try {
    const muscleCandidates = await loadMuscle(exercise.muscle)
    const candidates = muscleCandidates.length ? muscleCandidates : await loadAllExercises()
    const best = candidates
      .map(candidate => ({ candidate, score: scoreExercise(exercise.name, candidate, exercise.equipment) }))
      .sort((a, b) => b.score - a.score)[0]
    // When the source has no exact translation, prefer a GIF from the same
    // muscle group instead of leaving the whole library without a visual.
    // Exact/strong matches still win; the fallback is intentionally last.
    return best?.candidate?.gifUrl || null
  } catch (error) {
    try {
      const all = await loadAllExercises()
      const best = all
        .map(candidate => ({ candidate, score: scoreExercise(exercise.name, candidate, exercise.equipment) }))
        .sort((a, b) => b.score - a.score)[0]
      return best?.candidate?.gifUrl || null
    } catch (fallbackError) {
      console.warn('[Voryn] Não foi possível carregar GIF do exercício:', fallbackError)
      return null
    }
  }
}
