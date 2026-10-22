import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ session: vi.fn(), send: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: mocks.session }, from: mocks.from } }))
import { flushHealthRecords, mergeRemoteHealth, queueHealthRecord, readOfflineHealth } from '@/services/healthOffline'

const row = (value = 250) => ({ id: 'record-a', user_id: 'owner', metric: 'water_ml', local_date: '2026-10-22', value })
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks()
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  mocks.session.mockResolvedValue({ data: { session: { user: { id: 'owner' } } } })
  mocks.send.mockResolvedValue({ error: null })
  mocks.from.mockImplementation(() => {
    const builder = { upsert: () => builder, delete: () => builder, eq: () => builder, abortSignal: () => mocks.send() }
    return builder
  })
})
describe('offline health outbox', () => {
  it('persists records while offline and sends a stable id once online', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })
    queueHealthRecord('owner', row())
    await flushHealthRecords('owner')
    expect(mocks.from).not.toHaveBeenCalled()
    expect(readOfflineHealth('owner').rows).toEqual([row()])
    Object.defineProperty(navigator, 'onLine', { value: true })
    await flushHealthRecords('owner')
    expect(readOfflineHealth('owner').pending).toEqual({})
    expect(readOfflineHealth('owner').rows[0].id).toBe('record-a')
  })
  it('keeps failed writes queued and never sends them under another account', async () => {
    queueHealthRecord('owner', row())
    mocks.session.mockResolvedValueOnce({ data: { session: { user: { id: 'other' } } } })
    await flushHealthRecords('owner')
    expect(mocks.from).not.toHaveBeenCalled()
    expect(readOfflineHealth('other').rows).toEqual([])
    mocks.send.mockResolvedValueOnce({ error: { message: 'offline' } })
    await expect(flushHealthRecords('owner')).rejects.toThrow('salvos neste celular')
    expect(Object.keys(readOfflineHealth('owner').pending)).toHaveLength(1)
  })
  it('does not acknowledge a newer edit when an older request finishes', async () => {
    let finish
    mocks.send.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    queueHealthRecord('owner', row())
    const pending = flushHealthRecords('owner')
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
    queueHealthRecord('owner', row(500))
    finish({ error: null }); await pending
    expect(readOfflineHealth('owner').pending['record-a'].row.value).toBe(500)
    await flushHealthRecords('owner')
    expect(readOfflineHealth('owner').pending).toEqual({})
  })
  it('prevents stale remote results from restoring a deleted local record', async () => {
    queueHealthRecord('owner', row())
    const revision = readOfflineHealth('owner').revision
    queueHealthRecord('owner', row(), true)
    const merged = mergeRemoteHealth('owner', [row()], '2026-10-01', '2026-10-31', revision)
    expect(merged).toEqual([])
    expect(readOfflineHealth('owner').pending['record-a'].remove).toBe(true)
  })
})
