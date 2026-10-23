import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateNativeConfig } from '../native-config.mjs'

const publicKey = 'sb_publishable_abcdefghijklmnop1234567890'
const config = url => ({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: publicKey })

test('rejects the localhost backend accidentally shipped in the first preview', () => {
  assert.throws(() => validateNativeConfig(config('http://127.0.0.1:54321')), /HTTPS público/)
})
test('rejects local HTTPS and private network endpoints too', () => {
  for (const host of ['localhost', '127.0.0.1', '192.168.1.20', '10.0.0.2', '[::1]', 'backend.local']) {
    assert.throws(() => validateNativeConfig(config(`https://${host}`)))
  }
})
test('allows a production Supabase endpoint with a publishable key', () => {
  assert.deepEqual(validateNativeConfig(config('https://production-project.supabase.co')), { url: 'https://production-project.supabase.co' })
})
test('does not ship a privileged JWT or a fake development key', () => {
  const jwt = role => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`
  for (const key of ['local-dev-key', 'sb_secret_abcdefghijklmnop', jwt('service_role'), '']) {
    assert.throws(() => validateNativeConfig({ ...config('https://project.supabase.co'), VITE_SUPABASE_ANON_KEY: key }), /chave pública/)
  }
  assert.doesNotThrow(() => validateNativeConfig({ ...config('https://project.supabase.co'), VITE_SUPABASE_ANON_KEY: jwt('anon') }))
})
