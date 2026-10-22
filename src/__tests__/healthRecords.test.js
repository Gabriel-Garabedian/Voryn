import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
import { mergeHealthDays, validateHealthEntry } from '@/services/healthRecords'
const entry = (metric, value, time = '12:00') => ({ metric, value, local_date: '2026-10-22', occurred_at: `2026-10-22T${time}:00Z`, created_at: `2026-10-22T${time}:00Z` })
describe('manual and imported health data', () => {
  it('uses the manual water total without double counting imported water', () => {
    const [day] = mergeHealthDays([{ date: '2026-10-22', water_ml: 500, steps: 1000 }], [entry('water_ml', 250), entry('water_ml', 500, '13:00')])
    expect(day.water_ml).toBe(750)
    expect(day.steps).toBe(1000)
    expect(day.sources.water_ml).toBe('manual')
    expect(day.sources.steps).toBe('health_connect')
  })
  it('uses latest daily steps, sleep and weight instead of summing daily totals', () => {
    const [day] = mergeHealthDays([], [entry('steps', 100), entry('steps', 200, '13:00'), entry('sleep_minutes', 420), entry('sleep_minutes', 480, '13:00'), entry('weight_kg', 72), entry('weight_kg', 71.5, '13:00')])
    expect(day).toMatchObject({ steps: 200, sleep_minutes: 480, weight_kg: 71.5 })
  })
  it('sums meals only in their own calendar day', () => {
    const days = mergeHealthDays([], [entry('nutrition_kcal', 500), entry('nutrition_kcal', 300), { ...entry('nutrition_kcal', 100), local_date: '2026-10-21' }])
    expect(days[0].nutrition_kcal).toBe(800)
    expect(days[1].nutrition_kcal).toBe(100)
  })
  it('restores the imported value when manual entries are removed', () => {
    expect(mergeHealthDays([{ date: '2026-10-22', water_ml: 500 }], [])[0].water_ml).toBe(500)
  })
  it('rejects invalid values, impossible dates and inconsistent sleep intervals', () => {
    for (const value of [-1, 0, Infinity, NaN]) expect(() => validateHealthEntry(entry('water_ml', value))).toThrow()
    expect(() => validateHealthEntry(entry('steps', 1.5))).toThrow()
    expect(() => validateHealthEntry({ ...entry('water_ml', 100), local_date: '2026-02-31' })).toThrow()
    expect(() => validateHealthEntry({ ...entry('sleep_minutes', 480), sleep_start: '2026-10-22T08:00:00Z', sleep_end: '2026-10-22T07:00:00Z' })).toThrow()
  })
})
