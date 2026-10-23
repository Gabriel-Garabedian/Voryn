import React, { useEffect, useState } from 'react'
import { socialProfiles } from '@/services/socialProfiles'

export default function Avatar({ name, path, size = 40 }) {
  const [photo, setPhoto] = useState(null)
  useEffect(() => {
    let active = true
    setPhoto(null)
    if (!path) return
    const refresh = () => socialProfiles.photoUrl(path).then(url => { if (active) setPhoto(url) }).catch(() => { if (active) setPhoto(null) })
    refresh()
    const timer = setInterval(refresh, 50 * 60 * 1000)
    return () => { active = false; clearInterval(timer) }
  }, [path])
  return <span className="voryn-avatar" style={{ width: size, height: size }}>
    {photo ? <img src={photo} alt={`Foto de ${name || 'perfil'}`} onError={() => setPhoto(null)} />
      : <span aria-label={name || 'Sem foto'}>{name?.trim()?.charAt(0)?.toUpperCase() || '?'}</span>}
  </span>
}
