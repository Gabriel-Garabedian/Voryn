import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { progressPhotoService } from '@/services/progressPhotos'
import { useToast } from '@/components/ui/Toast'
import { SkeletonList } from '@/components/ui/Skeleton'
import { localDateKey } from '@/utils/helpers'

const CATEGORIES = [
  { key: 'front', label: 'Frente',    emoji: '⬆️' },
  { key: 'side',  label: 'Lateral',   emoji: '↗️' },
  { key: 'back',  label: 'Costas',    emoji: '⬇️' },
  { key: 'custom',label: 'Outro',     emoji: '📷' },
]
const AC = 'var(--accent)'

// ── Upload Card ─────────────────────────────────────────────
function UploadCard({ studentId, onUploaded }) {
  const toast     = useToast()
  const inputRef  = useRef()
  const [preview, setPreview]  = useState(null)
  const [file,    setFile]     = useState(null)
  const [form,    setForm]     = useState({ caption: '', category: 'front', taken_at: localDateKey() })
  const [uploading, setUploading] = useState(false)

  function handleFile(f) {
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Apenas imagens são aceitas.'); return }
    if (f.size > 10 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 10MB.'); return }
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    const { url: storagePath, error: upErr } = await progressPhotoService.upload(file, studentId)
    if (upErr) { toast.error(upErr.message || 'Erro no upload. Tente novamente.'); setUploading(false); return }
    const { data, error } = await progressPhotoService.create(studentId, { url: storagePath, ...form })
    if (error) {
      // Sem isso, se o insert no banco falhasse (RLS, rede, etc.), o
      // arquivo já enviado ao Storage na linha acima ficava órfão para
      // sempre — sem nenhuma linha em progress_photos referenciando-o, não
      // havia mais como descobrir que ele existia para limpar depois.
      await progressPhotoService.removeOrphanFile(storagePath)
      setUploading(false)
      toast.error('Erro ao salvar foto.')
      return
    }
    setUploading(false)
    toast.success('Foto salva! 📸')
    setPreview(null); setFile(null)
    // Use preview as temporary display URL until getAll refreshes with signed URL
    if (data) onUploaded({ ...data, photo_url: preview })
  }

  return (
    <div className="f-card p-4 space-y-3" style={{ borderColor: 'rgba(var(--accent-rgb),.25)' }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: AC }}>
        Nova foto de progresso
      </p>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
        onDragOver={e => e.preventDefault()}
        className="relative rounded-xl overflow-hidden cursor-pointer transition-all"
        style={{
          height: preview ? 'auto' : 160,
          border: `2px dashed ${preview ? 'transparent' : 'rgba(var(--accent-rgb),.3)'}`,
          background: preview ? 'transparent' : 'rgba(var(--accent-rgb),.03)',
        }}>
        {preview ? (
          <img src={preview} alt="preview" className="w-full rounded-xl object-cover" style={{ maxHeight: 280 }}/>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(var(--accent-rgb),.1)' }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={AC} strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
              Toque para selecionar foto
            </p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>JPG, PNG · Máx 10MB</p>
          </div>
        )}
        {preview && (
          <button
            onClick={e => { e.stopPropagation(); setPreview(null); setFile(null) }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,.6)' }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => handleFile(e.target.files[0])}/>

      {/* Category */}
      <div>
        <label className="f-label">Ângulo</label>
        <div className="grid grid-cols-4 gap-1.5">
          {CATEGORIES.map(c => (
            <button key={c.key} type="button"
              onClick={() => setForm(f => ({ ...f, category: c.key }))}
              className="f-card py-2 text-center text-xs font-semibold transition-all"
              style={{
                borderColor: form.category === c.key ? AC : 'var(--border)',
                background:  form.category === c.key ? 'rgba(var(--accent-rgb),.08)' : 'var(--card)',
                color:       form.category === c.key ? AC : 'var(--text-3)',
              }}>
              <div className="text-base mb-0.5">{c.emoji}</div>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="f-label">Data</label>
          <input type="date" className="f-input py-2 text-sm" value={form.taken_at}
            onChange={e => setForm(f => ({ ...f, taken_at: e.target.value }))}/>
        </div>
        <div>
          <label className="f-label">Legenda (opcional)</label>
          <input className="f-input py-2 text-sm" placeholder="Ex: Semana 4" value={form.caption}
            onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}/>
        </div>
      </div>

      <button onClick={handleUpload} disabled={!file || uploading}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
        style={{ background: AC }}>
        {uploading ? 'Enviando...' : '📸 Salvar foto de progresso'}
      </button>
    </div>
  )
}

// ── Compare Modal (lado a lado) ──────────────────────────────
function CompareModal({ photos, onClose }) {
  const [left,  setLeft]  = useState(0)
  const [right, setRight] = useState(Math.min(1, photos.length - 1))

  const L = photos[left]
  const R = photos[right]

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={onClose} style={{ color: 'var(--text-3)' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <p className="font-display text-base uppercase tracking-widest" style={{ color: 'var(--text-1)' }}>
          Comparação
        </p>
        <div style={{ width: 22 }}/>
      </div>

      {/* Side by side photos */}
      <div className="flex flex-1 gap-px overflow-hidden" style={{ background: 'var(--border)' }}>
        {[{ photo: L, idx: left, setIdx: setLeft, label: 'Antes' },
          { photo: R, idx: right, setIdx: setRight, label: 'Depois' }].map(({ photo, idx, setIdx, label }, side) => (
          <div key={side} className="flex-1 flex flex-col" style={{ background: 'var(--bg)' }}>
            <div className="flex-1 relative overflow-hidden">
              {photo ? (
                <img src={photo.photo_url} alt={label}
                  className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: 'var(--surface)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Sem foto</p>
                </div>
              )}
              {/* Label overlay */}
              <div className="absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-bold"
                style={{ background: 'rgba(0,0,0,.6)', color: '#fff' }}>
                {label}
              </div>
            </div>
            {/* Date selector */}
            <div className="px-2 py-2 overflow-x-auto" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex gap-1.5">
                {photos.map((p, i) => (
                  <button key={p.id} onClick={() => setIdx(i)}
                    className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: idx === i ? AC : 'var(--card)',
                      color:      idx === i ? '#fff' : 'var(--text-3)',
                      border:     `1px solid ${idx === i ? AC : 'var(--border)'}`,
                    }}>
                    {new Date(p.taken_at + 'T12:00').toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Diff info */}
      {L && R && L.id !== R.id && (
        <div className="px-4 py-3" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
            {Math.abs(Math.round((new Date(R.taken_at) - new Date(L.taken_at)) / 86400000))} dias entre as fotos
          </p>
        </div>
      )}
    </div>
  )
}

// ── Photo Card ───────────────────────────────────────────────
function PhotoCard({ photo, onDelete }) {
  const cat = CATEGORIES.find(c => c.key === photo.category) || CATEGORIES[3]
  return (
    <div className="relative rounded-2xl overflow-hidden group"
      style={{ aspectRatio: '3/4', background: 'var(--surface)' }}>
      <img src={photo.photo_url} alt={photo.caption || cat.label}
        className="w-full h-full object-cover"/>
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-2">
        <p className="text-xs font-semibold text-white">
          {new Date(photo.taken_at + 'T12:00').toLocaleDateString('pt-BR', { day:'numeric', month:'short' })}
        </p>
        {photo.caption && (
          <p className="text-xs text-white/70 truncate">{photo.caption}</p>
        )}
      </div>
      {/* Category badge */}
      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg text-xs font-bold"
        style={{ background: 'rgba(var(--accent-rgb),.8)', color: '#fff' }}>
        {cat.emoji} {cat.label}
      </div>
      {/* Delete */}
      {onDelete && (
        <button onClick={() => onDelete(photo)}
          className="absolute top-2 right-2 w-7 h-7 rounded-full items-center justify-center hidden group-hover:flex"
          style={{ background: 'rgba(239,68,68,.8)' }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Timeline view ────────────────────────────────────────────
function TimelineView({ photos, onDelete }) {
  const byMonth = {}
  photos.forEach(p => {
    const key = p.taken_at.slice(0, 7)
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(p)
  })

  return (
    <div className="space-y-6">
      {Object.entries(byMonth).map(([month, ps]) => (
        <div key={month}>
          <p className="font-display text-sm uppercase tracking-widest mb-3 px-1"
            style={{ color: AC }}>
            {new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            <span className="ml-2 text-xs" style={{ color: 'var(--text-3)' }}>({ps.length} foto{ps.length !== 1 ? 's' : ''})</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {ps.map(p => <PhotoCard key={p.id} photo={p} onDelete={onDelete}/>)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main View ────────────────────────────────────────────────
export default function ProgressPhotosView({ studentId: propStudentId, readOnly = false }) {
  const { user }  = useAuth()
  const toast     = useToast()
  const sid       = propStudentId || user?.id
  const [photos,  setPhotos]  = useState([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('timeline') // timeline | compare | upload
  const [compare, setCompare] = useState(false)
  const [selCat,  setSelCat]  = useState('all')

  useEffect(() => {
    if (!sid) return
    progressPhotoService.getAll(sid).then(({ data }) => {
      setPhotos(data)
      setLoading(false)
    }).catch(err => {
      console.error('[Voryn] ProgressPhotosView falhou ao carregar:', err)
      setLoading(false)
    })
  }, [sid])

  function handleUploaded(newPhoto) {
    setPhotos(p => [newPhoto, ...p])
    setTab('timeline')
  }

  async function handleDelete(photo) {
    const { error } = await progressPhotoService.delete(photo.id, photo.storage_path)
    if (error) { toast.error('Erro ao remover foto. Tente novamente.'); return }
    setPhotos(p => p.filter(x => x.id !== photo.id))
    toast.success('Foto removida')
  }

  const filtered = selCat === 'all' ? photos : photos.filter(p => p.category === selCat)

  if (compare) return <CompareModal photos={photos} onClose={() => setCompare(false)}/>

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-3xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
            Progresso
          </h1>
          {photos.length >= 2 && (
            <button onClick={() => setCompare(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
              style={{ background: 'rgba(var(--accent-rgb),.1)', color: AC, border: '1px solid rgba(var(--accent-rgb),.25)' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
              Comparar
            </button>
          )}
        </div>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          {photos.length} foto{photos.length !== 1 ? 's' : ''} · linha do tempo visual
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mb-4 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {[['timeline','Linha do Tempo'],['upload','+ Adicionar']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: tab === key ? 'var(--card)' : 'transparent',
              color:      tab === key ? AC : 'var(--text-3)',
              border:     tab === key ? '1px solid var(--border)' : '1px solid transparent',
            }}>
            {label}
          </button>
        ))}
      </div>

      <div className="px-4">
        {tab === 'upload' ? (
          <UploadCard studentId={sid} onUploaded={handleUploaded}/>
        ) : (
          <>
            {/* Category filter */}
            {photos.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {[{ key: 'all', label: 'Todas', emoji: '📸' }, ...CATEGORIES].map(c => (
                  <button key={c.key} onClick={() => setSelCat(c.key)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{
                      background: selCat === c.key ? AC : 'var(--card)',
                      color:      selCat === c.key ? '#fff' : 'var(--text-3)',
                      border:     `1px solid ${selCat === c.key ? AC : 'var(--border)'}`,
                    }}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <SkeletonList count={3}/>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center text-4xl"
                  style={{ background: 'rgba(var(--accent-rgb),.06)', border: '1px dashed rgba(var(--accent-rgb),.2)' }}>
                  📸
                </div>
                <p className="font-semibold text-sm mb-2" style={{ color: 'var(--text-2)' }}>
                  {photos.length === 0 ? 'Nenhuma foto ainda' : 'Nenhuma foto nesta categoria'}
                </p>
                <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>
                  {photos.length === 0
                    ? 'Registre sua evolução com fotos mensais'
                    : 'Mude o filtro ou adicione fotos nesta categoria'}
                </p>
                <button onClick={() => setTab('upload')}
                  className="text-sm font-semibold px-5 py-2.5 rounded-xl"
                  style={{ background: 'rgba(var(--accent-rgb),.1)', color: AC, border: '1px solid rgba(var(--accent-rgb),.25)' }}>
                  + Adicionar primeira foto
                </button>
              </div>
            ) : (
              <TimelineView photos={filtered} onDelete={!readOnly ? handleDelete : null}/>
            )}
          </>
        )}
      </div>
    </div>
  )
}
