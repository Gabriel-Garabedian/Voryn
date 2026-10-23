import { loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'
import { validateNativeConfig } from './native-config.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
try {
  const config = validateNativeConfig(loadEnv('production', root, 'VITE_'))
  // Public endpoint only; never log key material.
  console.log(`Android backend configuration checked: ${config.url}`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
