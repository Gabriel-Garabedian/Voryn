import React, { useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import Avatar from './Avatar'
import { socialProfiles } from '@/services/socialProfiles'

export default function ProfilePhotoEditor() {
  const { user, profile, updateProfile } = useAuth()
  const toast = useToast()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  async function change(file) {
    if (busy) return
    setBusy(true)
    let path
    let saved = false
    try {
      path = file ? await socialProfiles.upload(file, user.id) : null
      const { error } = await updateProfile({ avatar_url: path })
      if (error) throw new Error('Não foi possível salvar a foto no perfil.')
      saved = true
      if (profile?.avatar_url) await socialProfiles.remove(profile.avatar_url).catch(() => {})
      toast.success(file ? 'Foto de perfil atualizada!' : 'Foto removida.')
    } catch (error) {
      if (path && !saved) await socialProfiles.remove(path).catch(() => {})
      toast.error(error.message)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  return <div className="flex flex-col items-center gap-1 flex-shrink-0">
    <button type="button" disabled={busy} onClick={() => input.current?.click()} aria-label="Alterar foto de perfil">
      <Avatar name={profile?.name} path={profile?.avatar_url} size={64} />
    </button>
    <button disabled={busy} onClick={() => input.current?.click()} className="text-xs" style={{ color: 'var(--accent-text)', minHeight: 32 }}>{busy ? 'Salvando…' : 'Trocar foto'}</button>
    {profile?.avatar_url && <button disabled={busy} onClick={() => change(null)} className="text-xs" style={{ color: 'var(--text-3)', minHeight: 32 }}>Remover</button>}
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { if (e.target.files?.[0]) change(e.target.files[0]) }} />
  </div>
}
