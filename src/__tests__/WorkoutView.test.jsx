import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WorkoutView from '@/views/WorkoutView'
import { activeWorkoutService, routineService, workoutLogService } from '@/services'

const notifications = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => notifications }))
vi.mock('@/components/TrainingMusic', () => ({ default: () => null }))
vi.mock('@/components/PostWorkoutModal', () => ({ default: () => <p>Treino concluído</p> }))
vi.mock('@/components/ExercisePicker', () => ({
  default: ({ onSelect }) => <button onClick={() => onSelect({ name: 'Flexão', muscle: 'Peito' })}>Adicionar flexão</button>,
}))
vi.mock('@/services', async original => {
  const services = await original()
  return {
    ...services,
    routineService: { ...services.routineService, upsert: vi.fn(), delete: vi.fn() },
    workoutLogService: { ...services.workoutLogService, create: vi.fn() },
  }
})

const exercise = (id, name, weight = '') => ({
  id, name, muscle: 'Peito',
  sets: [{ id: `set-${id}`, reps: '10', weight, done: false, type: 'working' }],
})
function seed(exercises = [exercise('a', 'Supino', '20'), exercise('b', 'Remada', '30'), exercise('c', 'Agachamento', '40')], extra = {}) {
  const workout = { id: 'workout-a', dayIndex: 1, name: 'Treino A', startTime: Date.now(), exercises, ...extra }
  activeWorkoutService.save(workout)
  return workout
}
const show = () => render(<MemoryRouter><WorkoutView /></MemoryRouter>)
async function confirmRemoval(name) {
  fireEvent.click(screen.getByRole('button', { name: `Remover ${name} do treino` }))
  const dialog = await screen.findByRole('dialog', { name: 'Remover exercício?' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Remover do treino' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  workoutLogService.create.mockResolvedValue({ error: null })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('remoção de exercício durante o treino', () => {
  it('permite cancelar sem alterar séries, notas ou armazenamento', async () => {
    const logged = exercise('a', 'Supino', '20')
    logged.sets[0].done = true
    logged.notes = 'Reduzi a carga na última série'
    const original = seed([logged])
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Remover Supino do treino' }))
    const dialog = await screen.findByRole('dialog', { name: 'Remover exercício?' })
    expect(dialog).toHaveTextContent('Sua ficha de rotina não será alterada.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(activeWorkoutService.get()).toEqual(original)
    expect(screen.getByRole('button', { name: 'Remover Supino do treino' })).toBeInTheDocument()
  })

  it('remove só o exercício escolhido, preserva os outros e persiste ao reabrir', async () => {
    const original = seed()
    const view = show()
    await confirmRemoval('Supino')
    expect(activeWorkoutService.get()).toEqual({ ...original, exercises: original.exercises.slice(1) })
    expect(routineService.upsert).not.toHaveBeenCalled()
    expect(routineService.delete).not.toHaveBeenCalled()
    expect(screen.getByText('0/2 séries')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover Remada do treino' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adicionar exercício' })).toHaveFocus()
    view.unmount()
    show()
    expect(screen.queryByText('Supino')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Peso da série 1')).toHaveValue('30')
  })

  it('não transfere detalhes e notas abertos para o exercício seguinte', async () => {
    seed()
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Detalhes da série 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'adicionar anotação' }))
    await confirmRemoval('Supino')
    expect(screen.queryByLabelText('RPE da série 1')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: '' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Peso da série 1'), { target: { value: '35' } })
    expect(activeWorkoutService.get().exercises.map(ex => ex.sets[0].weight)).toEqual(['35', '40'])
  })

  it('permite remover a última posição e mantém um exercício restante aberto', async () => {
    seed()
    show()
    fireEvent.click(screen.getByText('Agachamento'))
    await confirmRemoval('Agachamento')
    expect(activeWorkoutService.get().exercises.map(ex => ex.id)).toEqual(['a', 'b'])
    expect(screen.getByLabelText('Peso da série 1')).toHaveValue('30')
  })

  it('não confunde exercícios repetidos com o mesmo nome', async () => {
    seed([exercise('a', 'Supino'), exercise('b', 'Supino')])
    show()
    await confirmRemoval('Supino')
    expect(activeWorkoutService.get().exercises.map(ex => ex.id)).toEqual(['b'])
  })

  it('permite esvaziar o treino e adicionar outro exercício, sem salvar histórico vazio', async () => {
    seed([exercise('a', 'Supino')], { restEndsAt: Date.now() + 60000, restDuration: 60 })
    show()
    await confirmRemoval('Supino')
    expect(activeWorkoutService.get().exercises).toEqual([])
    expect(activeWorkoutService.get().restEndsAt).toBeNull()
    expect(screen.getByRole('button', { name: 'Finalizar Treino' })).toBeDisabled()
    expect(screen.getByText('Nenhum exercício neste treino. Adicione um exercício para continuar.')).toBeInTheDocument()
    expect(workoutLogService.create).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar exercício' }))
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar flexão' }))
    expect(screen.getByRole('button', { name: 'Remover Flexão do treino' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finalizar Treino' })).toBeEnabled()
  })

  it('mantém o exercício e avisa se não conseguir persistir a remoção', async () => {
    const original = seed()
    show()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('Sem espaço') })
    fireEvent.click(screen.getByRole('button', { name: 'Remover Supino do treino' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remover do treino' }))
    expect(activeWorkoutService.get()).toEqual(original)
    expect(screen.getByRole('button', { name: 'Remover Supino do treino' })).toBeInTheDocument()
    expect(notifications.error).toHaveBeenCalled()
    expect(notifications.success).not.toHaveBeenCalled()
  })

  it('salva no histórico somente os exercícios que permaneceram no treino', async () => {
    const original = seed()
    show()
    await confirmRemoval('Supino')
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Treino' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Pular e Finalizar' }))
    await screen.findByText('Treino concluído')
    expect(workoutLogService.create).toHaveBeenCalledWith('owner', expect.objectContaining({ exercises: original.exercises.slice(1) }))
  })
})
