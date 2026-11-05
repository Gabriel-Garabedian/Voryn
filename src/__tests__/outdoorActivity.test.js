import { describe, it, expect } from 'vitest'
import { activityRate, formatActivityTime, routeSegments } from '@/services/outdoorActivity'

describe('outdoor activity metrics', () => {
  it('converts meters and active milliseconds to pace or km/h', () => {
    const run = { sport: 'running', distanceMeters: 5000, elapsedMs: 1500000 }
    expect(activityRate(run)).toBe('5:00')
    expect(activityRate({ ...run, sport: 'cycling' })).toBe('12')
    expect(activityRate({ ...run, distanceMeters: 0 })).toBe('—')
    expect(activityRate({ ...run, elapsedMs: 0 })).toBe('—')
  })
  it('rounds pace across a minute boundary', () => {
    expect(activityRate({ sport: 'walking', distanceMeters: 1000, elapsedMs: 359600 })).toBe('6:00')
    expect(formatActivityTime(3661999)).toBe('01:01:01')
    expect(formatActivityTime(0)).toBe('00:00:00')
  })
  it('does not draw a connecting line across a manual pause or GPS gap', () => {
    const points = [{ lat: 0, lon: 0, segment: 1 }, { lat: 0, lon: 1, segment: 1 }, { lat: 0, lon: 5, segment: 2 }]
    expect(routeSegments(points)).toEqual([[[0, 0], [0, 1]], [[0, 5]]])
    expect(routeSegments([])).toEqual([])
  })
})
