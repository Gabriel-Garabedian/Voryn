import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { relative } from 'node:path'

// Public APK downloads belong to the website, never inside another APK.
const generatedDownloads = fileURLToPath(new URL('../android/app/src/main/assets/public/downloads/', import.meta.url))
const nativePublic = fileURLToPath(new URL('../android/app/src/main/assets/public/', import.meta.url))
if (relative(nativePublic, generatedDownloads) !== 'downloads') throw new Error('Unexpected generated downloads directory')
await rm(generatedDownloads, { recursive: true, force: true })
console.log('Android assets ready: website APK downloads excluded from the native bundle.')
