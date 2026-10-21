import { useEffect, useRef } from 'react'

// ── Diálogo: foco preso + devolução de foco ────────────────
// Usado pelo `Modal` e pelos modais que têm animação própria (bottom
// sheet), para que todos tenham o mesmo comportamento de teclado:
// Escape fecha, Tab cicla dentro do painel, e o foco volta para o
// elemento que abriu o diálogo quando ele fecha.
//
// Vive fora de `index.jsx` porque aquele arquivo exporta apenas
// componentes — o plugin react-refresh exige isso para o fast
// refresh funcionar durante o desenvolvimento.
export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useDialogA11y(open, onClose, panelRef, initialFocusRef) {
  const restoreFocusRef = useRef(null)
  // O `onClose` quase sempre é uma arrow function inline, que ganha uma
  // identidade nova a cada render do pai. Se ele fosse dependência do
  // efeito, cada re-render desmancharia e remontaria o efeito — e a
  // limpeza devolveria o foco ao gatilho, tirando o foco do campo que a
  // pessoa está digitando. Guardamos a referência para que o efeito só
  // dependa de `open`.
  const onCloseRef = useRef(onClose)

  // Sincronizado em efeito (e não durante o render) para manter a
  // referência sempre atualizada sem depender da identidade do callback.
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    restoreFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab') return
      const items = panelRef.current?.querySelectorAll(FOCUSABLE_SELECTOR)
      if (!items?.length) return
      const list = Array.from(items)
      const first = list[0]
      const last = list[list.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    requestAnimationFrame(() => {
      const target = initialFocusRef?.current || panelRef.current?.querySelector(FOCUSABLE_SELECTOR)
      target?.focus()
    })
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      restoreFocusRef.current?.focus?.()
    }
  }, [open, panelRef, initialFocusRef])

  return restoreFocusRef
}
