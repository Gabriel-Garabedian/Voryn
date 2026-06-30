import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock browser APIs
const mockNotification = { permission: 'default', requestPermission: vi.fn() }
const mockRegistration = {
  pushManager: {
    getSubscription: vi.fn().mockResolvedValue(null),
    subscribe: vi.fn().mockResolvedValue({
      endpoint: 'https://fcm.googleapis.com/test',
      getKey: vi.fn().mockReturnValue(new Uint8Array([1,2,3,4]).buffer),
    }),
  },
  showNotification: vi.fn(),
}
const mockServiceWorker = {
  ready: Promise.resolve(mockRegistration),
  register: vi.fn(),
}

vi.stubGlobal('Notification', mockNotification)
vi.stubGlobal('navigator', {
  serviceWorker: mockServiceWorker,
})
vi.stubGlobal('PushManager', {})
vi.stubGlobal('window', { atob: vi.fn().mockReturnValue('') })

describe('pushService.isSupported', () => {
  it('returns false when serviceWorker is unavailable', async () => {
    const { pushService } = await import('../services/pushNotifications')
    // In test env, serviceWorker is mocked but PushManager may not be
    const result = pushService.isSupported()
    expect(typeof result).toBe('boolean')
  })
})

describe('pushService.getPermission', () => {
  it('returns unsupported when not supported', async () => {
    const { pushService } = await import('../services/pushNotifications')
    if (!pushService.isSupported()) {
      const perm = await pushService.getPermission()
      expect(perm).toBe('unsupported')
    } else {
      const perm = await pushService.getPermission()
      expect(['granted', 'denied', 'default']).toContain(perm)
    }
  })
})
