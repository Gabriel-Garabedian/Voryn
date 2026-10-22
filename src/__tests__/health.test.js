import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
import { summaryRows } from '@/services/health'

describe('health summaries', () => {
  it('clears revoked categories and keeps missing data distinct from zero', () => {
    const [row] = summaryRows('owner', {
      syncedAt: '2026-10-22T12:00:00Z',
      days: [{ date: '2026-10-22', timezone: 'America/Sao_Paulo', permissions: ['steps', 'water', 'weight'], steps: 0, water_ml: null, weight_kg: 75.5, nutrition_kcal: 2000 }],
    })
    expect(row).toMatchObject({ user_id: 'owner', steps: 0, water_ml: null, weight_kg: 75.5, nutrition_kcal: null, sleep_minutes: null })
  })
  it('requires an authenticated owner', () => {
    expect(() => summaryRows(null, { days: [] })).toThrow('Entre na sua conta')
  })
  it('replaces non-finite values with null', () => {
    const [row] = summaryRows('owner', { days: [{ permissions: ['steps'], steps: Infinity }] })
    expect(row.steps).toBeNull()
  })
})
