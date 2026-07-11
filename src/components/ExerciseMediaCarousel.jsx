import React, { useState } from 'react'

// Carrossel de fotos/vídeos por exercício — estrutura visual pronta,
// alimentada pelo campo `media` de cada exercício em data/exercises.js
// (ver comentário lá no topo do arquivo pra saber como preencher com
// conteúdo real depois). Sem fabricar nenhuma foto/vídeo aqui: quando
// `media` vem vazio (o padrão hoje, em todos os 136 exercícios), mostra
// um estado vazio elegante em vez de quebrar ou ficar com espaço em
// branco estranho.
//
// title/subtitle (opcionais) sobrepõem o rodapé da imagem, no mesmo
// estilo do print de referência (nome do exercício + equipamento).
export default function ExerciseMediaCarousel({ media = [], title, subtitle, aspectRatio = '4/3' }) {
  const [index, setIndex] = useState(0)
  const hasMedia = media.length > 0
  const current = hasMedia ? media[index] : null

  function goTo(i) {
    setIndex(Math.max(0, Math.min(media.length - 1, i)))
  }

  // Swipe simples por toque (sem biblioteca externa) — funciona bem em
  // conjunto com os pontos de navegação abaixo, que continuam clicáveis
  // como alternativa no desktop/mouse.
  const touchStartX = React.useRef(null)
  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 40) goTo(index + (delta < 0 ? 1 : -1))
    touchStartX.current = null
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl"
      style={{ aspectRatio, background: 'var(--card)', border: '1px solid var(--border)' }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {hasMedia ? (
        current.type === 'video' ? (
          <video key={current.url} src={current.url} className="w-full h-full object-cover"
            controls playsInline preload="metadata" />
        ) : (
          <img key={current.url} src={current.url} alt={title || 'Exercício'}
            className="w-full h-full object-cover" loading="lazy" />
        )
      ) : (
        // Estado vazio — sem foto/vídeo cadastrado ainda pra este
        // exercício. Não é um erro, é o estado padrão hoje pra todos.
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--text-3)" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Sem foto ou vídeo cadastrado ainda
          </p>
        </div>
      )}

      {/* Overlay de título/subtítulo, sobre gradiente escuro no rodapé —
          só aparece se algum dos dois for passado. */}
      {(title || subtitle) && (
        <div className="absolute inset-x-0 bottom-0 px-4 py-3"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,.85), transparent)' }}>
          {title && <p className="font-display text-lg uppercase tracking-wide text-white leading-tight">{title}</p>}
          {subtitle && <p className="text-xs text-white/70 mt-0.5">{subtitle}</p>}
        </div>
      )}

      {/* Pontos de navegação — só aparecem com mais de 1 item */}
      {media.length > 1 && (
        <div className="absolute top-3 inset-x-0 flex items-center justify-center gap-1.5">
          {media.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} aria-label={`Item ${i + 1}`}
              className="rounded-full transition-all"
              style={{
                width: i === index ? 18 : 6, height: 6,
                background: i === index ? 'var(--accent)' : 'rgba(255,255,255,.4)',
              }}/>
          ))}
        </div>
      )}
    </div>
  )
}
