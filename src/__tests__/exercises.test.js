import { describe, it, expect } from 'vitest'
import { EXERCISE_LIBRARY, MUSCLE_GROUPS, searchExercises } from '../data/exercises'

describe('EXERCISE_LIBRARY', () => {
  it('has exactly 100 exercises', () => {
    expect(EXERCISE_LIBRARY).toHaveLength(100)
  })

  it('every exercise has required fields', () => {
    EXERCISE_LIBRARY.forEach(ex => {
      expect(ex.id, `${ex.name} missing id`).toBeDefined()
      expect(ex.name, `exercise missing name`).toBeTruthy()
      expect(ex.muscle, `${ex.name} missing muscle`).toBeTruthy()
      expect(ex.equipment, `${ex.name} missing equipment`).toBeTruthy()
      expect(ex.type, `${ex.name} missing type`).toBeTruthy()
    })
  })

  it('has no duplicate IDs', () => {
    const ids = EXERCISE_LIBRARY.map(e => e.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('has no duplicate names', () => {
    const names = EXERCISE_LIBRARY.map(e => e.name.toLowerCase())
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)
  })

  it('type is always one of: compound, isolation, cardio', () => {
    const validTypes = ['compound', 'isolation', 'cardio']
    EXERCISE_LIBRARY.forEach(ex => {
      expect(validTypes).toContain(ex.type)
    })
  })

  it('contains key exercises (Supino Reto, Agachamento Livre)', () => {
    const names = EXERCISE_LIBRARY.map(e => e.name)
    expect(names).toContain('Supino Reto')
    expect(names).toContain('Agachamento Livre')
    expect(names).toContain('Levantamento Terra')
    expect(names).toContain('Barra Fixa')
  })
})

describe('MUSCLE_GROUPS', () => {
  it('is a non-empty array', () => {
    expect(MUSCLE_GROUPS.length).toBeGreaterThan(5)
  })

  it('has no duplicates', () => {
    const unique = new Set(MUSCLE_GROUPS)
    expect(unique.size).toBe(MUSCLE_GROUPS.length)
  })

  it('includes Peito, Costas, Pernas, Ombro', () => {
    expect(MUSCLE_GROUPS).toContain('Peito')
    expect(MUSCLE_GROUPS).toContain('Costas')
    expect(MUSCLE_GROUPS).toContain('Pernas')
    expect(MUSCLE_GROUPS).toContain('Ombro')
  })
})

describe('searchExercises', () => {
  it('returns all exercises when query and muscle are empty', () => {
    expect(searchExercises()).toHaveLength(100)
  })

  it('filters by name (case insensitive)', () => {
    const results = searchExercises('supino')
    expect(results.length).toBeGreaterThan(0)
    results.forEach(ex => expect(ex.name.toLowerCase()).toContain('supino'))
  })

  it('filters by muscle group', () => {
    const results = searchExercises('', 'Peito')
    expect(results.length).toBeGreaterThan(0)
    results.forEach(ex => expect(ex.muscle).toBe('Peito'))
  })

  it('combines name and muscle filters', () => {
    const results = searchExercises('supino', 'Peito')
    expect(results.length).toBeGreaterThan(0)
    results.forEach(ex => {
      expect(ex.name.toLowerCase()).toContain('supino')
      expect(ex.muscle).toBe('Peito')
    })
  })

  it('returns empty array for non-existent exercise', () => {
    expect(searchExercises('xyzabc123nonexistent')).toHaveLength(0)
  })

  it('handles whitespace in query', () => {
    const results = searchExercises('  supino  ')
    expect(results.length).toBeGreaterThan(0)
  })
})
