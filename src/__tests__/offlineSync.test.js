import { offlineSyncService } from '@/services'

describe('offlineSyncService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists, counts, and removes queued workouts by user', () => {
    offlineSyncService.add({ kind: 'workout_log', userId: 'user-a', log: { clientId: 'client-a' } })
    offlineSyncService.add({ kind: 'workout_log', userId: 'user-b', log: { clientId: 'client-b' } })

    expect(offlineSyncService.count('user-a')).toBe(1)
    expect(offlineSyncService.get()).toHaveLength(2)

    const queued = offlineSyncService.get()[0]
    offlineSyncService.remove(queued.id)

    expect(offlineSyncService.get()).toHaveLength(1)
    expect(offlineSyncService.count('user-a')).toBe(0)
  })
})
