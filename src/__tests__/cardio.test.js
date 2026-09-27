// ──────────────────────────────────────────────────────────
//  Voryn — Unit Tests: cardio.js
//  Run: npx vitest run
// ──────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest'
import { CARDIO_TYPES, getCardioType, summarizeCardio } from '../data/cardio'

describe('CARDIO_TYPES', () => {
  it('has 7 modalities, each with duration_minutes as a required field', () => {
    expect(CARDIO_TYPES.length).toBe(7)
    CARDIO_TYPES.forEach(t => {
      const durationField = t.fields.find(f => f.key === 'duration_minutes')
      expect(durationField).toBeTruthy()
      expect(durationField.required).toBe(true)
    })
  })
})

describe('getCardioType', () => {
  it('finds a type by id', () => {
    expect(getCardioType('esteira')?.label).toBe('Esteira')
  })
  it('returns null for unknown or missing id', () => {
    expect(getCardioType('inexistente')).toBeNull()
    expect(getCardioType(undefined)).toBeNull()
  })
})

describe('summarizeCardio', () => {
  it('summarizes filled fields only, skipping empty ones', () => {
    const r = summarizeCardio({ type: 'esteira', duration_minutes: 20, speed_kmh: 10.5 })
    expect(r).toContain('Esteira')
    expect(r).toContain('20 min')
    expect(r).toContain('10.5km/h')
    expect(r).not.toContain('null')
    expect(r).not.toContain('undefined')
  })
  it('translates select values (rpe) to their label', () => {
    const r = summarizeCardio({ type: 'livre', duration_minutes: 15, rpe_level: 'intenso' })
    expect(r).toContain('Intenso')
  })
  it('returns empty string for missing or unknown cardio', () => {
    expect(summarizeCardio(null)).toBe('')
    expect(summarizeCardio({ type: 'nao-existe' })).toBe('')
  })
})
