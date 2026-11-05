import { expect, it, vi } from 'vitest'
import { saveExport } from '@/services/fileExport'
import { exportRoutinePDF, exportAssessmentPDF, exportProgressPDF } from '@/services/pdfExport'

vi.mock('@/services/fileExport', () => ({ saveExport: vi.fn().mockResolvedValue(undefined) }))

it('generates all three PDFs locally and awaits saving', async () => {
  await exportRoutinePDF({ studentName: 'Ana', routines: { 1: { exercises: [{ name: 'Agachamento', sets: 3, reps: 12 }] } } })
  await exportAssessmentPDF({ studentName: 'Ana', assessments: [] })
  await exportProgressPDF({ studentName: 'Ana', metrics: { total: 2 }, workoutLogs: [], prs: {} })
  expect(saveExport.mock.calls.map(([, filename]) => filename)).toEqual([
    'voryn-ficha-ana.pdf', 'voryn-avaliacao-ana.pdf', 'voryn-progresso-ana.pdf',
  ])
  for (const [blob] of saveExport.mock.calls) {
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(1000)
  }
  saveExport.mockRejectedValueOnce(new Error('Salvamento cancelado.'))
  await expect(exportRoutinePDF({ studentName: 'Ana', routines: {} })).rejects.toThrow('Salvamento cancelado.')
})
