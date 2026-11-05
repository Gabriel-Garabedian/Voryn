import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { localMusicStore, localMusicPlayer, parseStart, validateMusicFile, readMusicDuration } from '@/services/localMusic'
let players
class TestAudio {
  constructor(src) { this.currentTime = 0; this.duration = 180; this.src = src; players.push(this) }
  set src(value) { this.source = value; if (value) queueMicrotask(() => this.onloadedmetadata?.()) }
  play() { this.onplay?.(); return Promise.resolve() }
  pause() { this.onpause?.() }
  load() {}
  removeAttribute() {}
}
beforeEach(() => {
  players = []
  vi.stubGlobal('Audio', TestAudio)
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:audio'), revokeObjectURL: vi.fn() })
})
afterEach(() => { localMusicPlayer.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const track = () => ({ blob: new File(['audio'], 'Treino.mp3', { type: 'audio/mpeg' }), name: 'Treino.mp3', start: 80, duration: 180 })
it('converte o trecho e recusa tempo/formato/tamanho inválidos', () => {
  expect(parseStart('1:20')).toBe(80)
  expect(parseStart('1:60')).toBeNull()
  expect(() => validateMusicFile({ name: 'script.html', type: 'text/html', size: 4 })).toThrow('áudio')
  expect(() => validateMusicFile({ type: 'audio/mpeg', size: 51 * 1024 * 1024 })).toThrow('50 MB')
})
it('inspeciona a duração e libera a URL temporária', async () => {
  expect(await readMusicDuration(track().blob)).toBe(180)
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:audio')
})
it('começa no trecho salvo, pausa e reinicia nesse mesmo ponto', async () => {
  vi.spyOn(localMusicStore, 'get').mockResolvedValue(track())
  await localMusicPlayer.load('owner')
  await localMusicPlayer.play('owner')
  expect(players[0].currentTime).toBe(80)
  expect(localMusicPlayer.snapshot().playing).toBe(true)
  localMusicPlayer.pause()
  expect(localMusicPlayer.snapshot().playing).toBe(false)
  players[0].currentTime = 100
  await localMusicPlayer.play('owner')
  expect(players[0].currentTime).toBe(80)
})
it('preserva a música anterior se armazenar o novo arquivo falhar', async () => {
  const old = track()
  vi.spyOn(localMusicStore, 'get').mockResolvedValue(old)
  vi.spyOn(localMusicStore, 'save').mockRejectedValue(new Error('Sem espaço'))
  await localMusicPlayer.load('owner')
  await expect(localMusicPlayer.save('owner', { ...old, start: 30 })).rejects.toThrow('Sem espaço')
  expect(localMusicPlayer.snapshot().track.start).toBe(80)
})
it('para o áudio e isola arquivos quando a conta muda', async () => {
  vi.spyOn(localMusicStore, 'get').mockResolvedValueOnce(track()).mockResolvedValueOnce(undefined)
  await localMusicPlayer.load('owner')
  await localMusicPlayer.play('owner')
  await localMusicPlayer.load('other')
  expect(localMusicPlayer.snapshot().track).toBeNull()
  expect(localMusicPlayer.snapshot().playing).toBe(false)
  await expect(localMusicPlayer.play('other')).rejects.toThrow('Escolha uma música')
})
it('ignora leitura atrasada de outra conta', async () => {
  let finish
  vi.spyOn(localMusicStore, 'get').mockReturnValueOnce(new Promise(resolve => { finish = resolve })).mockResolvedValueOnce(undefined)
  const first = localMusicPlayer.load('owner')
  await localMusicPlayer.load('other')
  finish(track()); await first
  expect(localMusicPlayer.snapshot().userId).toBe('other')
  expect(localMusicPlayer.snapshot().track).toBeNull()
})
it('não mostra falha quando o próprio usuário pausa durante o início do áudio', async () => {
  vi.spyOn(localMusicStore, 'get').mockResolvedValue(track())
  await localMusicPlayer.load('owner')
  let rejectPlay
  players[0].play = () => new Promise((resolve, reject) => { rejectPlay = reject })
  const playing = localMusicPlayer.play('owner')
  localMusicPlayer.pause()
  rejectPlay(new DOMException('Interrupted', 'AbortError'))
  await expect(playing).resolves.toBeUndefined()
  expect(localMusicPlayer.snapshot().error).toBe('')
})
