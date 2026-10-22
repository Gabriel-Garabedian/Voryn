import React from 'react'
import { Link } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'

export default function AndroidDownloadLink({ className = 'f-btn f-btn-ghost', style }) {
  if (Capacitor.isNativePlatform()) return null
  return <Link to="/download" className={className} style={style}>Baixar para Android</Link>
}
