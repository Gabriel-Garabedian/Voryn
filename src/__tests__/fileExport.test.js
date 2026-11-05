import { expect, it, vi } from 'vitest'
import { saveExport } from '@/services/fileExport'

const native = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android' },
  registerPlugin: () => native,
}))

it('passes file bytes to Android and waits for confirmation', async () => {
  let finish
  native.save.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  let completed = false
  const pending = saveExport(new Blob(['ficha'], { type: 'application/pdf' }), 'ficha.pdf').then(() => { completed = true })
  await vi.waitFor(() => expect(native.save).toHaveBeenCalledWith({
    filename: 'ficha.pdf', mimeType: 'application/pdf', base64: btoa('ficha'),
  }))
  expect(completed).toBe(false)
  finish()
  await pending
  expect(completed).toBe(true)
})

it('propagates cancellation instead of reporting success', async () => {
  native.save.mockRejectedValueOnce(Object.assign(new Error('Salvamento cancelado.'), { code: 'CANCELLED' }))
  await expect(saveExport(new Blob(['{}'], { type: 'application/json' }), 'dados.json')).rejects.toMatchObject({ code: 'CANCELLED' })
})
