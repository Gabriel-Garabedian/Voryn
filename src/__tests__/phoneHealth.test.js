import { describe, expect, it } from 'vitest'
import { withPhoneSteps } from '@/services/phoneHealth'
import { mergeHealthDays } from '@/services/healthRecords'
describe('phone step source', () => {
  it('replaces overlapping Health Connect totals without adding or losing other metrics', () => {
    const [day] = mergeHealthDays(withPhoneSteps([{ date: '2026-10-22', steps: 5000, water_ml: 1000 }], [{ date: '2026-10-22', steps: 2000 }]), [])
    expect(day).toMatchObject({ steps: 2000, water_ml: 1000, sources: { steps: 'phone', water_ml: 'health_connect' } })
  })
  it('lets an explicit manual daily total override the phone sensor', () => {
    const [day] = mergeHealthDays(withPhoneSteps([], [{ date: '2026-10-22', steps: 2000 }]), [{ metric: 'steps', value: 3000, local_date: '2026-10-22', occurred_at: '2026-10-22T12:00:00Z' }])
    expect(day.steps).toBe(3000)
    expect(day.sources.steps).toBe('manual')
  })
})
