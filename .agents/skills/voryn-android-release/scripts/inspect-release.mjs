import { createHash } from 'node:crypto'
import { readFile, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const ready = process.argv.includes('--ready')
const errors = []

try {
  const gradle = await readFile(resolve(root, 'android/app/build.gradle'), 'utf8')
  const build = {
    versionCode: Number(gradle.match(/\bversionCode\s*(?:=\s*)?(\d+)/)?.[1]),
    versionName: gradle.match(/\bversionName\s*(?:=\s*)?["']([^"']+)["']/)?.[1],
  }
  if (!Number.isSafeInteger(build.versionCode) || build.versionCode < 1 || !build.versionName) errors.push('Invalid Android build version metadata')
  const release = JSON.parse(await readFile(resolve(root, 'public/android-release.json'), 'utf8'))
  if (!Number.isSafeInteger(release.versionCode) || release.versionCode < 1 || typeof release.versionName !== 'string') errors.push('Invalid public release version metadata')
  const allowedPath = typeof release.apkPath === 'string' && /^\/downloads\/[a-zA-Z0-9._-]+\.apk$/.test(release.apkPath)
  if (!allowedPath) errors.push('APK must have a versioned local /downloads/*.apk path')
  const page = await readFile(resolve(root, 'src/pages/DownloadAndroidPage.jsx'), 'utf8')
  const pagePath = page.match(/export\s+const\s+ANDROID_APK\s*=\s*['"]([^'"]+)['"]/)?.[1]
  if (pagePath !== release.apkPath) errors.push('Download page and public release APK paths differ')
  let artifact = null
  if (allowedPath) {
    const downloads = await realpath(resolve(root, 'public/downloads'))
    const candidate = await realpath(resolve(root, 'public', release.apkPath.slice(1)))
    const within = relative(downloads, candidate)
    if (!within || within.startsWith('..') || isAbsolute(within) || dirname(candidate) !== downloads) throw new Error('APK resolves outside public/downloads')
    const bytes = await readFile(candidate)
    if (bytes.length < 4 || bytes.readUInt32LE(0) !== 0x04034b50) errors.push('APK does not start with a ZIP local file header')
    artifact = { path: release.apkPath, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
  }
  const matchesBuild = release.versionCode === build.versionCode && release.versionName === build.versionName
  if (ready && !matchesBuild) errors.push('Published metadata differs from candidate build; do not announce an unbuilt APK')
  console.log(JSON.stringify({
    mode: ready ? 'candidate-metadata' : 'inspect',
    build, release, pagePath, matchesBuild, artifact, errors,
    scope: 'Read-only metadata/file inspection. APK native version, signing certificate, installability, device behavior, and deployment were NOT verified.',
  }, null, 2))
  process.exitCode = errors.length ? 1 : 0
} catch (error) {
  console.error(JSON.stringify({ errors: [...errors, error.message], scope: 'Read-only inspection failed; no files changed.' }, null, 2))
  process.exitCode = 1
}
