const DB = 'voryn-local-music-v1'
let database
export function parseStart(value) {
  const text = value.trim()
  if (!/^\d{1,3}:[0-5]\d$/.test(text)) return null
  const [minutes, seconds] = text.split(':').map(Number)
  return minutes * 60 + seconds
}
export function formatMusicTime(seconds = 0) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, '0')}`
}
export function validateMusicFile(file) {
  if (!file?.size) throw new Error('Escolha um arquivo de áudio válido.')
  if (file.size > 50 * 1024 * 1024) throw new Error('Escolha uma música de até 50 MB.')
  if (!file.type?.startsWith('audio/') && !/\.(mp3|m4a|aac|wav|ogg|opus|flac)$/i.test(file.name || '')) throw new Error('Escolha um arquivo de áudio, como MP3, M4A ou WAV.')
}
function openDatabase() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('tracks')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Não foi possível acessar as músicas deste aparelho.'))
  }).catch(error => { database = null; throw error })
  return database
}
async function transaction(userId, mode, operation) {
  if (!userId) throw new Error('Entre na sua conta para configurar a música.')
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', mode)
    const request = operation(tx.objectStore('tracks'))
    tx.oncomplete = () => resolve(request.result)
    tx.onabort = tx.onerror = () => reject(new Error('Não foi possível salvar a música. Confira o espaço disponível neste aparelho.'))
  })
}
export const localMusicStore = {
  get: userId => transaction(userId, 'readonly', store => store.get(userId)),
  async save(userId, track) {
    validateMusicFile(track.blob)
    if (!Number.isFinite(track.duration) || !Number.isInteger(track.start) || track.start < 0 || track.start >= track.duration) throw new Error('Escolha um início antes do fim da música.')
    await transaction(userId, 'readwrite', store => store.put(track, userId))
  },
  remove: userId => transaction(userId, 'readwrite', store => store.delete(userId)),
}
export function readMusicDuration(file) {
  validateMusicFile(file)
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    const cleanup = () => { clearTimeout(timeout); audio.onloadedmetadata = null; audio.onerror = null; audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url) }
    const fail = () => { cleanup(); reject(new Error('Não foi possível ler esse áudio. Tente um arquivo MP3, M4A ou WAV compatível.')) }
    const timeout = setTimeout(fail, 15000)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      const duration = audio.duration
      if (!Number.isFinite(duration) || duration <= 0) { fail(); return }
      cleanup(); resolve(duration)
    }
    audio.onerror = fail
    audio.src = url
  })
}
// Uma instância mantém a reprodução entre Perfil e Treino. O arquivo nunca sai do aparelho.
let state = { userId: null, track: null, playing: false, loading: false, error: '' }
let audio, objectUrl, pending, revision = 0, playback = 0
const listeners = new Set()
const publish = updates => { state = { ...state, ...updates }; listeners.forEach(listener => listener()) }
function disposeAudio() {
  playback += 1
  if (audio) { audio.onplay = audio.onpause = audio.onended = audio.onerror = null; audio.pause(); audio.removeAttribute('src'); audio.load(); audio = null }
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = null
}
function prepare(track) {
  disposeAudio()
  if (!track) return
  objectUrl = URL.createObjectURL(track.blob)
  audio = new Audio(objectUrl)
  audio.preload = 'auto'
  audio.onplay = () => publish({ playing: true, error: '' })
  audio.onpause = audio.onended = () => publish({ playing: false })
  audio.onerror = () => publish({ playing: false, error: 'Não foi possível tocar este arquivo. Escolha uma música compatível no perfil.' })
}
export const localMusicPlayer = {
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  snapshot: () => state,
  load(userId) {
    if (state.userId === userId) return pending || Promise.resolve()
    this.clear()
    if (!userId) return Promise.resolve()
    const current = revision
    publish({ userId, loading: true })
    pending = localMusicStore.get(userId).then(track => {
      if (revision !== current) return
      prepare(track); publish({ track: track || null, loading: false })
    }).catch(() => { if (revision === current) publish({ loading: false, error: 'Não foi possível carregar a música deste aparelho.' }) })
      .finally(() => { if (revision === current) pending = null })
    return pending
  },
  async save(userId, track) {
    const current = revision
    await localMusicStore.save(userId, track)
    if (state.userId !== userId || revision !== current) return
    revision += 1; pending = null
    prepare(track); publish({ track, playing: false, loading: false, error: '' })
  },
  async remove(userId) {
    const current = revision
    await localMusicStore.remove(userId)
    if (state.userId !== userId || revision !== current) return
    revision += 1; pending = null
    disposeAudio(); publish({ track: null, playing: false, loading: false, error: '' })
  },
  async play(userId) {
    if (state.userId !== userId || !audio || !state.track) throw new Error('Escolha uma música deste aparelho no perfil.')
    const player = audio
    const request = ++playback
    player.currentTime = state.track.start
    try { await player.play() }
    catch { if (player === audio && request === playback) { publish({ playing: false }); throw new Error('Não foi possível iniciar o áudio. Toque novamente ou escolha outro arquivo.') } }
  },
  pause() { playback += 1; audio?.pause() },
  clear() { revision += 1; pending = null; disposeAudio(); publish({ userId: null, track: null, playing: false, loading: false, error: '' }) },
}
