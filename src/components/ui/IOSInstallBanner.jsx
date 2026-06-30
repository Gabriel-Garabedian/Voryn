import React, { useState, useEffect } from 'react'

// iOS não dispara o evento 'beforeinstallprompt' nem mostra banner automático
// de instalação como o Android — o único jeito de instalar é via
// Safari → menu Compartilhar → "Adicionar à Tela de Início".
// Sem esse aviso, a maioria dos usuários de iPhone simplesmente não descobre
// que dá pra instalar, e usa o app direto no navegador (pior experiência,
// sem ícone na tela inicial, sem fullscreen, sem splash screen).
//
// Este componente:
// - Só aparece no Safari do iOS (detectado via user agent)
// - Só aparece se o app ainda não está instalado (modo standalone)
// - Pode ser dispensado pelo usuário (salvo em sessionStorage — volta
//   a aparecer em uma nova sessão, mas não fica aparecendo a cada tela)

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
}

function isInStandaloneMode() {
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

export default function IOSInstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Não mostra se: já está instalado, não é iOS, ou usuário já dispensou
    const dismissed = sessionStorage.getItem('voryn_ios_banner_dismissed')
    if (!isIOS() || isInStandaloneMode() || dismissed) return
    // Pequeno delay pra não aparecer logo de cara ao abrir a página
    const t = setTimeout(() => setShow(true), 3000)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label="Instalar Voryn no iPhone"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '16px 16px calc(16px + env(safe-area-inset-bottom))',
        background: 'var(--card)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -8px 32px rgba(0,0,0,.4)',
        animation: 'slideUp .3s ease-out',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/apple-touch-icon.png" alt="Voryn"
            style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
          <div>
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: '.05em', color: 'var(--text-1)', lineHeight: 1 }}>
              Instalar no iPhone
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              Adicione à tela inicial para a melhor experiência
            </p>
          </div>
        </div>
        <button
          onClick={() => { sessionStorage.setItem('voryn_ios_banner_dismissed', '1'); setShow(false) }}
          style={{ padding: 6, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          aria-label="Fechar"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Passo a passo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          {
            num: '1',
            text: 'Toque no botão Compartilhar',
            icon: (
              // Ícone de compartilhar do Safari iOS (caixa com seta pra cima)
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" fill="var(--accent)" stroke="none"/>
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--accent)"/>
                <path d="M12 16V8M9 11l3-3 3 3"/>
              </svg>
            ),
            detail: 'Na barra inferior do Safari (ícone de caixa com seta ↑)',
          },
          {
            num: '2',
            text: 'Toque em "Adicionar à Tela de Início"',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M12 8v8M8 12h8"/>
              </svg>
            ),
            detail: 'Role a lista de opções e procure esse item',
          },
          {
            num: '3',
            text: 'Toque em "Adicionar" no canto superior direito',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ),
            detail: 'O ícone do Voryn vai aparecer na sua tela inicial',
          },
        ].map(step => (
          <div key={step.num} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '8px 10px', borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--border)',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff',
            }}>
              {step.num}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3 }}>{step.text}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{step.detail}</p>
            </div>
            <div style={{ flexShrink: 0, marginTop: 2 }}>{step.icon}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
