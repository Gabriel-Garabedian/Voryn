import React from 'react'

export default function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col items-center gap-5 animate-fade-in">
        <img src="/voryn-icon-192.png" alt="Voryn" className="w-16 h-16 rounded-2xl"
          style={{ boxShadow: '0 0 32px rgba(var(--accent-rgb),.5)' }} />
        <div className="w-8 h-0.5 rounded-full" style={{ background: 'var(--accent)', animation: 'pulseGlow 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  )
}
