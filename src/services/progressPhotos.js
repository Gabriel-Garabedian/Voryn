import { supabase } from '@/lib/supabase'

const BUCKET = 'progress-photos'

// Tamanho máximo e tipos aceitos. Antes, a única "validação" era o
// atributo accept="image/*" no <input type="file"> da tela — isso é só
// uma sugestão de UI para o seletor de arquivos do navegador, pode ser
// completamente ignorado via drag-and-drop ou manipulação direta do
// input. Sem checagem real, qualquer usuário autenticado podia subir
// qualquer tipo de arquivo (renomeando a extensão), de qualquer tamanho,
// para o bucket de fotos de progresso.
const MAX_SIZE_BYTES = 8 * 1024 * 1024 // 8MB
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const EXT_BY_TYPE    = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' }

export const progressPhotoService = {
  // Upload de foto para o Supabase Storage
  async upload(file, studentId) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { error: { message: 'Tipo de arquivo não permitido. Envie uma foto em JPG, PNG, WEBP ou HEIC.' } }
    }
    if (file.size > MAX_SIZE_BYTES) {
      return { error: { message: 'Arquivo muito grande. O limite é 8MB por foto.' } }
    }

    // Extensão derivada do MIME real (file.type), não do nome do arquivo —
    // o nome é trivialmente forjável; a checagem de MIME acima já bloqueia
    // a maior parte do risco, isso é uma segunda camada de defesa.
    const ext  = EXT_BY_TYPE[file.type] || 'jpg'
    const path = `${studentId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (upErr) return { error: upErr }

    return { url: path, path }  // Save storage path; generate signed URL on display
  },

  // Usado como rollback quando o upload no Storage teve sucesso mas o
  // insert correspondente em progress_photos falhou — sem isso, o arquivo
  // ficava órfão no Storage para sempre (ver handleUpload em
  // ProgressPhotosView.jsx).
  async removeOrphanFile(path) {
    if (!path) return
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) console.warn('[Voryn] Falha ao limpar arquivo órfão do Storage:', error)
  },

  // Criar registro no banco
  async create(studentId, { url, caption, category, taken_at, trainer_id }) {
    const { data, error } = await supabase
      .from('progress_photos')
      .insert({ student_id: studentId, photo_url: url, caption, category, taken_at, trainer_id })
      .select().single()
    return { data, error }
  },

  // Buscar todas as fotos de um aluno
  async getAll(studentId) {
    // try/catch defensivo: sem isso, falha de rede na query principal
    // rejeitava a Promise sem ninguém tratando — ProgressPhotosView.jsx
    // não tinha .catch(), travando a tela em "carregando" para sempre.
    try {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('student_id', studentId)
        .order('taken_at', { ascending: false })
      if (!data?.length) return { data: [], error }

      // Generate signed URLs for all photos in parallel.
      // IMPORTANTE: preservamos o path original em `storage_path` antes de
      // sobrescrever `photo_url` com a signed URL. Antes, depois de chamar
      // getAll(), o path real do arquivo no Storage ficava irrecuperável a
      // partir do objeto retornado — qualquer tela que precisasse deletar o
      // arquivo (ver handleDelete em ProgressPhotosView) só tinha acesso à
      // signed URL, que não é um path válido para storage.remove().
      //
      // Promise.allSettled em vez de Promise.all: se a signed URL de UMA
      // foto falhar (ex: arquivo removido do Storage manualmente, mas o
      // registro do banco ainda existe), Promise.all rejeitaria a busca
      // INTEIRA — o aluno perderia a visualização de todas as outras fotos
      // por causa de uma só com problema. allSettled isola a falha.
      const results = await Promise.allSettled(
        data.map(async photo => {
          if (photo.photo_url?.startsWith('http')) return { ...photo, storage_path: null }
          const { data: signed } = await supabase.storage
            .from(BUCKET).createSignedUrl(photo.photo_url, 3 * 3600)
          return { ...photo, storage_path: photo.photo_url, photo_url: signed?.signedUrl || photo.photo_url }
        })
      )
      const withUrls = results.map((r, i) =>
        r.status === 'fulfilled' ? r.value : { ...data[i], storage_path: data[i].photo_url }
      )
      return { data: withUrls, error }
    } catch (err) {
      console.error('[Voryn] progressPhotoService.getAll falhou (rede/parse):', err)
      return { data: [], error: err }
    }
  },

  // Buscar fotos por categoria (para comparação lado a lado)
  async getByCategory(studentId, category) {
    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('student_id', studentId)
      .eq('category', category)
      .order('taken_at', { ascending: true })
    return { data: data || [], error }
  },

  // Antes, a ordem era invertida: removia do Storage primeiro, e só depois
  // deletava a linha do banco — sem checar erro do storage. Se o delete do
  // storage falhasse silenciosamente (rede, permissão), a linha do banco
  // ainda assim era removida, perdendo a única referência ao path do
  // arquivo — o arquivo ficava no Storage para sempre, sem nenhuma forma
  // de descobrir que ele existia para limpar depois.
  //
  // Agora: deleta do banco primeiro (com erro checado — se falhar, paramos
  // e o arquivo no Storage continua referenciado, recuperável). Só depois
  // de confirmar que o banco foi limpo, removemos do Storage. Se o storage
  // falhar nesse momento, voltamos a ter um arquivo órfão, mas é um cenário
  // raro (falha de rede pontual) e não é mais o caminho padrão de toda
  // exclusão, como acontecia em produção até agora porque `path` nunca era
  // passado pela tela (vinha sempre null).
  async delete(photoId, path) {
    const { error: dbError } = await supabase.from('progress_photos').delete().eq('id', photoId)
    if (dbError) return { error: dbError }

    if (path) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([path])
      if (storageError) {
        console.warn('[Voryn] Foto removida do banco, mas falha ao remover do Storage (arquivo órfão):', storageError)
      }
    }
    return { error: null }
  },

  // Obter URL assinada (fotos privadas)
  async getSignedUrl(path, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresIn)
    return { url: data?.signedUrl, error }
  },
}
