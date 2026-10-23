import { supabase } from '@/lib/supabase'

const BUCKET = 'avatars'
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export const socialProfiles = {
  async get(ids) {
    if (!ids.length) return []
    const { data, error } = await supabase.rpc('get_social_profiles', { p_ids: [...new Set(ids)] })
    if (error) throw error
    return data || []
  },
  async photoUrl(path) {
    if (!path) return null
    // Compatibilidade com fotos já existentes no perfil.
    if (/^https:\/\//.test(path)) return path
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
    if (error) throw error
    return data.signedUrl
  },
  async upload(file, userId) {
    if (!TYPES[file.type]) throw new Error('Escolha uma foto JPG, PNG ou WebP.')
    if (file.size > 5 * 1024 * 1024) throw new Error('A foto deve ter até 5 MB.')
    const path = `${userId}/${crypto.randomUUID()}.${TYPES[file.type]}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
    if (error) throw new Error('Não foi possível enviar a foto. Tente novamente.')
    return path
  },
  async remove(path) {
    if (!path || path.startsWith('https://')) return
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) throw error
  },
}
