import { afterEach, expect, it, vi } from 'vitest'
import { appUpdate, newerRelease, RELEASE_URL } from '@/services/appUpdate'

const native = vi.hoisted(() => ({ info: vi.fn(), openDownload: vi.fn(), platform: 'android' }))
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => native.platform }, registerPlugin: () => native }))
const release = { versionCode: 10, versionName: '1.8', applicationId: 'com.voryn.mobile', apkPath: '/downloads/voryn-1.8.apk' }
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); native.platform = 'android' })

it('compares Android version codes and rejects invalid download metadata', () => {
  expect(newerRelease(release, 9, 'com.voryn.mobile')).toEqual(release)
  expect(newerRelease(release, 10, 'com.voryn.mobile')).toBeNull()
  expect(newerRelease(release, 11, 'com.voryn.mobile')).toBeNull()
  expect(newerRelease(release, 9, 'com.voryn.app.preview')).toBeNull()
  expect(newerRelease(release, 9, undefined)).toBeNull()
  expect(newerRelease({ ...release, versionCode: '10' }, 9, 'com.voryn.mobile')).toBeNull()
  expect(newerRelease({ ...release, apkPath: 'https://other.example/app.apk' }, 9, 'com.voryn.mobile')).toBeNull()
  expect(newerRelease({ ...release, apkPath: '/downloads/../app.apk' }, 9, 'com.voryn.mobile')).toBeNull()
})

it('reads the installed version and fetches fresh release metadata', async () => {
  native.info.mockResolvedValue({ versionCode: 9, applicationId: 'com.voryn.mobile' })
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => release })
  vi.stubGlobal('fetch', fetcher)
  const controller = new AbortController()
  expect(await appUpdate.check(controller.signal)).toEqual(release)
  expect(fetcher).toHaveBeenCalledWith(RELEASE_URL, { cache: 'no-store', signal: controller.signal })
  await appUpdate.open(release)
  expect(native.openDownload).toHaveBeenCalledWith({ apkPath: release.apkPath })
})

it('does not check for APK updates on the web', async () => {
  native.platform = 'web'
  expect(await appUpdate.check()).toBeNull()
  expect(native.info).not.toHaveBeenCalled()
})
