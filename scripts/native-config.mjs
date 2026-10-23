import { isIP } from 'node:net'

// Distribution builds must never silently inherit a local test backend.
export function validateNativeConfig(env) {
  let url
  try { url = new URL(env.VITE_SUPABASE_URL) } catch {
    throw new Error('Configure VITE_SUPABASE_URL para o servidor real antes de gerar o APK.')
  }
  const host = url.hostname.toLowerCase()
  if (url.protocol !== 'https:' || url.username || url.password ||
      !host.includes('.') || isIP(host) || host.startsWith('[') ||
      /(^|\.)(localhost|local|test|invalid|example)$/.test(host) ||
      /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
      /placeholder|xxxxx|your-project|seu-projeto/.test(host)) {
    throw new Error('O APK precisa de um servidor HTTPS público. Verifique .env.production.local; .env.local também é carregado no build.')
  }
  const key = env.VITE_SUPABASE_ANON_KEY || ''
  let role
  try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role } catch { /* Not a legacy JWT. */ }
  if (!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key) && role !== 'anon') {
    throw new Error('Configure uma chave pública Supabase (publishable ou anon) para o APK. Chaves secretas e valores de teste não são aceitos.')
  }
  return { url: url.origin }
}
