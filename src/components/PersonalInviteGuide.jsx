import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui'

// ── QR Code gerado com canvas (sem dependência externa) ─────
function QRCanvas({ value, size = 200 }) {
  const containerRef = useRef(null)
  const [error, setError] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!value || !containerRef.current) return
    const container = containerRef.current
    // limpar instância anterior
    container.innerHTML = ''
    setReady(false)
    setError(false)

    const scriptId = 'qrcode-script'

    function renderQR() {
      try {
        // QRCode renderiza num <canvas> — canvas não entende var(--accent)
        // (variável CSS), só aceita uma cor concreta resolvida. Antes, a
        // cor era um hex fixo, então o QR code do convite sempre era roxo
        // mesmo que o personal tivesse escolhido outra cor de destaque
        // (recurso pago). getComputedStyle resolve o valor real aplicado
        // no momento, seguindo a cor escolhida.
        const resolvedAccent = getComputedStyle(document.documentElement)
          .getPropertyValue('--accent').trim() || '#820AD1'
        // eslint-disable-next-line no-undef
        new QRCode(container, {
          text:           value,
          width:          size,
          height:         size,
          colorDark:      resolvedAccent,
          colorLight:     '#0D0D0D',
          correctLevel:   2, // QRCode.CorrectLevel.M
        })
        // QRCode lib cria <canvas> ou <img> dentro de container
        setTimeout(() => setReady(true), 100)
      } catch (e) {
        console.warn('[QR] render error:', e)
        setError(true)
      }
    }

    if (typeof QRCode !== 'undefined') {
      renderQR()
    } else if (document.getElementById(scriptId)) {
      // script está carregando
      const check = setInterval(() => {
        if (typeof QRCode !== 'undefined') { clearInterval(check); renderQR() }
      }, 100)
      return () => clearInterval(check)
    } else {
      const script = document.createElement('script')
      script.id    = scriptId
      script.src   = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
      // Risco de segurança conhecido e não totalmente mitigado: este é um
      // script de terceiro carregado via CDN sem Subresource Integrity
      // (SRI). Tentei adicionar um hash `integrity` fixo, mas há relatos
      // documentados de hashes do próprio cdnjs estarem incorretos para
      // certas bibliotecas — um hash errado bloquearia o carregamento por
      // completo (comportamento padrão do SRI), quebrando a função de QR
      // Code para todo mundo. Preferi manter funcional com crossorigin
      // (isola erros de CORS, reduz superfície) em vez de arriscar isso.
      // Se quiser fechar esse risco por completo, a forma mais segura é
      // hospedar uma cópia própria do arquivo (ex: em /public) em vez de
      // depender de CDN de terceiro.
      script.crossOrigin    = 'anonymous'
      script.referrerPolicy = 'no-referrer'
      script.onload  = renderQR
      script.onerror = () => setError(true)
      document.head.appendChild(script)
    }
  }, [value, size])

  if (error) return (
    <div className="flex flex-col items-center justify-center rounded-2xl"
      style={{ width: size, height: size, background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-xs text-center px-4" style={{ color: 'var(--text-3)' }}>
        QR indisponível.<br/>Use o link acima.
      </p>
    </div>
  )

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Container onde a lib injeta o canvas/img */}
      <div ref={containerRef}
        style={{
          width: size, height: size,
          borderRadius: 8,
          overflow: 'hidden',
          opacity: ready ? 1 : 0,
          transition: 'opacity .3s',
        }}/>
      {/* Loading skeleton */}
      {!ready && !error && (
        <div className="absolute inset-0 rounded-xl skeleton-pulse"
          style={{ background: 'var(--border)' }}/>
      )}
      {/* Logo Voryn no centro do QR */}
      {ready && (
        <img src="/voryn-icon-192.png" alt="Voryn"
          className="absolute rounded-lg pointer-events-none"
          style={{
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 34, height: 34,
            boxShadow: '0 0 0 3px #0D0D0D',
          }}/>
      )}
    </div>
  )
}

// ── Modal do QR Code ────────────────────────────────────────
function QRModal({ inviteLink, trainerName, onClose }) {
  const [show, setShow] = useState(false)
  useEffect(() => { setTimeout(() => setShow(true), 40) }, [])

  function close() {
    setShow(false)
    setTimeout(onClose, 250)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={close}>
      {/* backdrop */}
      <div className="absolute inset-0" style={{
        background: 'rgba(0,0,0,.75)',
        backdropFilter: 'blur(8px)',
        opacity: show ? 1 : 0,
        transition: 'opacity .25s',
      }}/>

      {/* sheet */}
      <div className="relative w-full max-w-sm mx-auto pb-safe"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: '24px 24px 0 0',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          padding: '20px 20px 40px',
          transform: show ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .3s cubic-bezier(.34,1.1,.64,1)',
        }}>

        {/* handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--border)' }}/>

        <div className="text-center mb-5">
          <p className="font-display text-xl uppercase tracking-wide mb-1" style={{ color: 'var(--text-1)' }}>
            QR Code do convite
          </p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            O aluno escaneia com a câmera e é direcionado direto para o cadastro
          </p>
        </div>

        {/* QR centralizado */}
        <div id="qr-modal-canvas" className="flex justify-center mb-5">
          <div className="p-3 rounded-2xl" style={{ background: '#0D0D0D', border: '1px solid rgba(var(--accent-rgb),.3)' }}>
            <QRCanvas value={inviteLink} size={200}/>
          </div>
        </div>

        {/* link em texto */}
        <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2 overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-xs flex-1 truncate font-mono" style={{ color: 'var(--text-3)' }}>
            {inviteLink}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Download QR */}
          <button
            onClick={() => {
              // Tentar canvas primeiro, depois img (depende da lib/browser)
              const canvas = document.querySelector('#qr-modal-canvas canvas')
              const img    = document.querySelector('#qr-modal-canvas img')
              const a = document.createElement('a')
              a.download = `voryn-convite-${trainerName?.split(' ')[0] || 'personal'}.png`
              if (canvas) {
                a.href = canvas.toDataURL('image/png')
                a.click()
              } else if (img) {
                a.href = img.src
                a.click()
              }
            }}
            className="f-card p-3 flex items-center justify-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--text-1)' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Salvar QR
          </button>

          <button onClick={close}
            className="py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────
export default function PersonalInviteGuide({ onClose, trainerId, onStudentAdded }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [copied,   setCopied]   = useState(false)
  const [showQR,   setShowQR]   = useState(false)
  const [showEmailField, setShowEmailField] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addError, setAddError] = useState('')

  const inviteLink = `${window.location.origin}/register?trainer=${user?.id ?? ''}`
  const trainerName = profile?.name || 'Personal'

  // Reaproveita a mesma lógica que já existia no modal separado de
  // adicionar aluno por email (trainerService.addStudent) — agora vivendo
  // dentro da experiência unificada de convite, em vez de um modal seco
  // e desconectado no dashboard.
  async function handleAddByEmail() {
    if (!addEmail.trim()) return
    setAddError('')
    const { trainerService } = await import('@/services')
    const { data, error } = await trainerService.addStudent(trainerId, addEmail.trim())
    if (error) { setAddError(error.message); return }
    toast.success('Aluno adicionado! 🎉')
    setAddEmail(''); setShowEmailField(false)
    onStudentAdded?.(data)
  }

  // BUG confirmado em teste real: navigator.clipboard só existe em contexto
  // seguro (HTTPS, ou localhost/127.0.0.1 exatos) — testando pelo IP da
  // rede local (ex: 192.168.x.x), o navegador trata isso como HTTP comum,
  // e navigator.clipboard fica undefined. Chamar .writeText nele lança um
  // erro síncrono, sempre cai no catch, e o usuário só via "não foi
  // possível copiar" sem conseguir copiar de outro jeito. Adicionado
  // fallback com textarea temporário + execCommand, que funciona em
  // qualquer contexto (seguro ou não) — é a forma recomendada de cobrir
  // ambos os casos.
  async function copyLink() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteLink)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = inviteLink
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (!ok) throw new Error('execCommand copy failed')
      }
      setCopied(true)
      toast.success('Link copiado! Mande pelo WhatsApp ou Instagram.')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error('Não foi possível copiar. Copie manualmente.')
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${trainerName} te convidou para o Voryn`,
          text:  'Treine comigo no Voryn — acompanhamento profissional no app!',
          url:   inviteLink,
        })
      } catch { /* cancelado pelo usuário */ }
    } else {
      copyLink()
    }
  }

  return (
    <>
      {showQR && (
        <QRModal
          inviteLink={inviteLink}
          trainerName={trainerName}
          onClose={() => setShowQR(false)}
        />
      )}

      <div className="f-card p-5 animate-slide-up"
        style={{ borderColor: 'rgba(var(--accent-rgb),.25)', background: 'rgba(var(--accent-rgb),.03)' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(var(--accent-rgb),.12)', border: '1px solid rgba(var(--accent-rgb),.25)' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Adicionar alunos</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Compartilhe seu link ou QR Code</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ color: 'var(--text-3)' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Link preview */}
        <div className="rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </svg>
          <p className="text-xs truncate flex-1 font-mono" style={{ color: 'var(--text-3)' }}>
            {inviteLink}
          </p>
        </div>

        {/* Ações — Melhoria 3: QR Code */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Copiar link */}
          <button onClick={copyLink}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
            style={{
              background: copied ? 'rgba(74,222,128,.1)' : 'var(--card)',
              border: `1px solid ${copied ? 'rgba(74,222,128,.3)' : 'var(--border)'}`,
            }}>
            {copied
              ? <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
            }
            <span className="text-xs font-semibold" style={{ color: copied ? '#4ade80' : 'var(--text-2)' }}>
              {copied ? 'Copiado!' : 'Copiar'}
            </span>
          </button>

          {/* QR Code */}
          <button onClick={() => setShowQR(true)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.8">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="3" height="3" rx=".5" fill="var(--accent)"/>
              <rect x="18" y="14" width="3" height="3" rx=".5" fill="var(--accent)"/>
              <rect x="14" y="18" width="3" height="3" rx=".5" fill="var(--accent)"/>
            </svg>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>QR Code</span>
          </button>

          {/* Compartilhar (usa Web Share API no mobile) */}
          <button onClick={shareLink}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
              {navigator.share ? 'Enviar' : 'Copiar'}
            </span>
          </button>
        </div>

        {/* Passos */}
        <div className="space-y-0 mb-4">
          {[
            { num:'1', title:'Compartilhe o link ou QR Code', desc:'Mande pelo WhatsApp, Instagram, ou mostre o QR Code na academia.' },
            { num:'2', title:'Aluno se cadastra em segundos', desc:'É grátis para o aluno. Ao criar a conta, já aparece no seu painel.' },
            { num:'3', title:'Comece a acompanhar', desc:'Acesse o chat, crie fichas de treino e acompanhe a evolução em tempo real.' },
          ].map((step, i) => (
            <div key={i} className="invite-step">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-display text-sm"
                style={{ background: 'var(--accent)', color: '#fff', minWidth: 28 }}>
                {step.num}
              </div>
              <div className="flex-1 pb-1">
                <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-1)' }}>{step.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-3 py-2 rounded-xl text-xs"
          style={{ background: 'rgba(250,204,21,.06)', border: '1px solid rgba(250,204,21,.15)', color: 'rgba(250,204,21,.7)' }}>
          💡 O cadastro do aluno é sempre gratuito. Apenas você paga a assinatura.
        </div>

        {/* Já sabe o email do aluno? — antes este fluxo (busca por email)
            vivia num modal totalmente separado e seco no dashboard,
            desconectado da experiência visual de convite (QR code,
            compartilhar). Unificado aqui: a maioria vai usar o link/QR,
            mas quem já tem o email de um aluno que já criou conta no
            Voryn (ex: indicado por outro aluno) pode adicionar direto. */}
        {trainerId && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            {showEmailField ? (
              <div className="space-y-2 scale-in">
                <input className="f-input" type="email" autoFocus
                  placeholder="email do aluno@exemplo.com"
                  value={addEmail} onChange={e => setAddEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddByEmail()}/>
                {addError && <p className="text-xs" style={{ color: '#f87171' }}>{addError}</p>}
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>O aluno precisa já ter uma conta no Voryn.</p>
                <div className="flex gap-2">
                  <Button className="flex-1 py-2 text-sm" onClick={handleAddByEmail}>Adicionar</Button>
                  <Button variant="ghost" className="px-4 py-2 text-sm"
                    onClick={() => { setShowEmailField(false); setAddEmail(''); setAddError('') }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowEmailField(true)}
                className="w-full text-center text-xs font-semibold py-1"
                style={{ color: 'var(--text-3)' }}>
                Já sabe o email do aluno? Adicione direto →
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
