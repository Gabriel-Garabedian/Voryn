import { Capacitor, registerPlugin } from '@capacitor/core'

const AppUpdate = registerPlugin('AppUpdate')
export const RELEASE_URL = 'https://voryn-liard.vercel.app/android-release.json'

export function newerRelease(release, installedCode, installedApplicationId) {
  if (!Number.isSafeInteger(installedCode) || !Number.isSafeInteger(release?.versionCode) || release.versionCode <= installedCode) return null
  if (typeof release.versionName !== 'string' || !/^\d+(\.\d+){1,3}$/.test(release.versionName)) return null
  if (typeof installedApplicationId !== 'string' || release?.applicationId !== installedApplicationId) return null
  if (typeof release.apkPath !== 'string' || !/^\/downloads\/[a-zA-Z0-9._-]+\.apk$/.test(release.apkPath)) return null
  return release
}

export const appUpdate = {
  async check(signal) {
    if (Capacitor.getPlatform() !== 'android') return null
    const installed = await AppUpdate.info()
    const response = await fetch(RELEASE_URL, { cache: 'no-store', signal })
    if (!response.ok) throw new Error('Verificação indisponível')
    return newerRelease(await response.json(), installed.versionCode, installed.applicationId)
  },
  open: release => AppUpdate.openDownload({ apkPath: release.apkPath }),
}
