// ──────────────────────────────────────────────────────────
//  Voryn — Unit Tests: acessibilidade dos diálogos
//  Run: npx vitest run
//
//  Cobre o `useDialogA11y`, que dá a todos os modais o mesmo
//  comportamento de teclado: Escape fecha, Tab cicla dentro do
//  painel e o foco volta para o elemento que abriu o diálogo.
//
//  O teste "foco não é roubado durante re-render" existe porque
//  houve uma regressão real: o `onClose` (arrow function inline em
//  todos os consumidores) estava na lista de dependências do
//  efeito, então cada re-render do pai remontava o efeito e a
//  limpeza devolvia o foco ao gatilho — tirando o foco do campo
//  que a pessoa estava digitando e fazendo o valor digitado cair
//  no campo errado.
// ──────────────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest'
import React, { useRef, useState } from 'react'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { Modal } from '../components/ui/index'
import CardioModal from '../components/CardioModal'
import ExercisePicker from '../components/ExercisePicker'
import { MoreSheet } from '../components/layout/AppShell'

const flush = () => act(async () => { await new Promise(r => requestAnimationFrame(r)) })

// Avança o tempo para o AnimatePresence concluir a animação de saída.
const advance = async (ms = 600) => {
  await act(async () => { await new Promise(r => setTimeout(r, ms)) })
  await flush()
}

function Harness() {
  const [open, setOpen] = useState(true)
  const [tick, setTick] = useState(0)
  return (
    <>
      <span data-testid="state">{open ? 'ABERTO' : 'FECHADO'}</span>
      <button data-testid="outside" onClick={() => setTick(t => t + 1)}>fora {tick}</button>
      <Modal open={open} onClose={() => setOpen(false)} title="T">
        <input placeholder="A" />
        <input placeholder="B" />
        <input placeholder="C" />
      </Modal>
    </>
  )
}

describe('diálogo — foco e teclado', () => {
  it('mantém o foco no campo digitado durante re-render do pai', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    render(<Harness />)
    await flush()

    const target = document.querySelectorAll('input')[1]
    target.focus()
    await act(async () => { fireEvent.click(screen.getByTestId('outside')) })
    await flush()

    expect(document.activeElement).toBe(target)
  })

  it('mantém o valor digitado no campo em que ele foi digitado', async () => {
    render(<Harness />)
    await flush()

    const target = document.querySelectorAll('input')[1]
    target.focus()
    await act(async () => { fireEvent.change(target, { target: { value: 'xyz' } }) })
    await act(async () => { fireEvent.click(screen.getByTestId('outside')) })
    await flush()

    const values = Array.from(document.querySelectorAll('input')).map(i => i.value)
    expect(values).toEqual(['', 'xyz', ''])
  })

  it('devolve o foco ao gatilho quando o modal fecha', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const { unmount } = render(<Harness />)
    await flush()

    unmount()
    await flush()

    expect(document.activeElement).toBe(trigger)
  })

  it('Escape fecha o modal e o remove do DOM', async () => {
    render(<Harness />)
    await flush()
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()

    await act(async () => { fireEvent.keyDown(document, { key: 'Escape' }) })
    await advance()

    expect(screen.getByTestId('state').textContent).toBe('FECHADO')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('Tab cicla dentro do painel em vez de escapar para fora', async () => {
    render(<Harness />)
    await flush()

    const items = Array.from(
      document.querySelectorAll('[role="dialog"] button, [role="dialog"] input')
    )
    const last = items[items.length - 1]
    last.focus()

    await act(async () => { fireEvent.keyDown(document, { key: 'Tab' }) })
    await flush()

    expect(document.activeElement).toBe(items[0])
  })
})

// Regressões encontradas na revisão: cada diálogo tinha seu próprio jeito
// de tratar Escape/foco e três deles fugiam do comportamento do hook.
describe('diálogos — regressões', () => {
  it('MoreSheet: re-render do pai não rouba o foco', async () => {
    function Host() {
      const [n, setN] = useState(0)
      const trigger = useRef(null)
      return (
        <>
          <button ref={trigger} data-testid="outside" onClick={() => setN(v => v + 1)}>fora {n}</button>
          <MoreSheet open onClose={() => {}} navigate={() => {}} base="/app" currentPath="/app" triggerRef={trigger} />
        </>
      )
    }
    render(<Host />)
    await flush()
    const target = screen.getByRole('dialog').querySelectorAll('button')[1]
    target.focus()
    await act(async () => { fireEvent.click(screen.getByTestId('outside')) })
    await flush()
    expect(document.activeElement).toBe(target)
  })

  it('CardioModal: Esc não finaliza o treino de novo enquanto salva', async () => {
    const onSkip = vi.fn()
    const { unmount } = render(<CardioModal onSkip={onSkip} onSave={() => {}} saving />)
    await flush()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onSkip).not.toHaveBeenCalled()
    unmount()

    render(<CardioModal onSkip={onSkip} onSave={() => {}} saving={false} />)
    await flush()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('ExercisePicker: Esc fecha só o detalhe quando ele está aberto', async () => {
    const onClose = vi.fn()
    render(<ExercisePicker onSelect={() => {}} onClose={onClose} onCustom={() => {}} />)
    await flush()
    await act(async () => { fireEvent.click(document.querySelector('.f-card button')) })
    await flush()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    await flush()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
