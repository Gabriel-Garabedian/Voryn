import { beforeEach, expect, it, vi } from 'vitest'
import { socialProfiles } from '@/services/socialProfiles'
import { supabase } from '@/lib/supabase'
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: vi.fn() }, rpc: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
it('recusa formato e tamanho inválidos antes de acessar Storage', async () => {
  await expect(socialProfiles.upload({ type: 'image/svg+xml', size: 10 }, 'owner')).rejects.toThrow('JPG')
  await expect(socialProfiles.upload({ type: 'image/jpeg', size: 6 * 1024 * 1024 }, 'owner')).rejects.toThrow('5 MB')
  expect(supabase.storage.from).not.toHaveBeenCalled()
})
it('gera arquivo na pasta do usuário e deriva extensão do tipo', async () => {
  const upload = vi.fn().mockResolvedValue({ error: null })
  supabase.storage.from.mockReturnValue({ upload })
  const path = await socialProfiles.upload({ type: 'image/png', name: 'malicious.html', size: 12 }, 'owner')
  expect(path).toMatch(/^owner\/[a-f0-9-]+\.png$/)
  expect(upload.mock.calls[0][2]).toEqual({ contentType: 'image/png' })
})
