// ──────────────────────────────────────────────────────────
//  Voryn — Unit Tests: helpers.js
//  Run: npx vitest run
// ──────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest'
import {
  translateError, formatDuration, formatDate, formatDateShort,
  estimateOneRepMax, formatVolume, getRecoverySnapshot, calcStreak, calcBestStreak, getRoutineDates, getPlanLimit, PLAN_LIMITS
} from '../utils/helpers'

describe('translateError', () => {
  it('returns Portuguese for known Supabase errors', () => {
    expect(translateError({ message: 'Invalid login credentials' }))
      .toBe('Email ou senha incorretos.')
  })

  it('returns Portuguese for weak password', () => {
    expect(translateError({ message: 'Password should be at least 6 characters' }))
      .toBe('A senha precisa ter pelo menos 6 caracteres.')
  })

  it('handles null/undefined gracefully', () => {
    expect(translateError(null)).toBe('Ocorreu um erro inesperado.')
    expect(translateError(undefined)).toBe('Ocorreu um erro inesperado.')
  })

  it('handles network errors', () => {
    expect(translateError({ message: 'network error' })).toContain('conexão')
  })

  it('handles plain string errors', () => {
    const result = translateError({ message: 'Unknown weird error XYZ' })
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })
})

describe('formatDuration', () => {
  it('formats seconds under 60', () => {
    expect(formatDuration(45)).toBe('45s')
  })
  it('formats minutes correctly', () => {
    expect(formatDuration(90)).toBe('1min')
    expect(formatDuration(3600)).toBe('1h 0min')
  })
  it('handles 0 and undefined', () => {
    expect(formatDuration(0)).toBe('—')
    expect(formatDuration(null)).toBe('—')
  })
})

describe('formatDate', () => {
  it('formats a date string as dd de mês de aaaa (pt-BR)', () => {
    const r = formatDate('2026-03-15')
    expect(r).toContain('15')
    expect(r).toContain('2026')
  })
  it('handles missing input', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('')).toBe('—')
  })
})

describe('formatDateShort', () => {
  it('formats a date string without the year', () => {
    const r = formatDateShort('2026-03-15')
    expect(r).toContain('15')
    expect(r).not.toContain('2026')
  })
  it('handles missing input', () => {
    expect(formatDateShort(null)).toBe('—')
  })
})

describe('formatVolume', () => {
  it('formats kg under 1000', () => {
    const r = formatVolume(500)
    expect(r).toContain('500')
  })
  it('keeps a single workout in kg, even past 1000 (ex: supino 80kg x10 x4 séries = 3200kg — não é tonelada)', () => {
    const r = formatVolume(3200)
    expect(r).toBe('3.200kg')
  })
  it('formats tons only for long-term accumulated totals (>= 10000kg)', () => {
    const r = formatVolume(15000)
    expect(r).toMatch(/15[,.]0\s*t/)
  })
  it('handles null', () => {
    expect(formatVolume(null)).toBe('—')
  })
})

describe('PLAN_LIMITS', () => {
  it('personal plan has 15 student limit', () => {
    expect(PLAN_LIMITS.personal.students).toBe(15)
  })
  it('personal_pro plan has 50 student limit', () => {
    expect(PLAN_LIMITS.personal_pro.students).toBe(50)
  })
  it('student plan has no student limit', () => {
    expect(PLAN_LIMITS.student.students).toBe(0)
  })
  it('free plan cannot access graphs', () => {
    expect(PLAN_LIMITS.free.hasGraphs).toBe(false)
  })
  it('student plan can access graphs', () => {
    expect(PLAN_LIMITS.student.hasGraphs).toBe(true)
  })
})

describe('getPlanLimit', () => {
  it('returns correct limit for known plan', () => {
    expect(getPlanLimit('personal', 'students')).toBe(15)
  })
  it('falls back to free plan for unknown plan', () => {
    expect(getPlanLimit('unknown_plan', 'students')).toBe(0)
  })
  it('returns false for free hasGraphs', () => {
    expect(getPlanLimit('free', 'hasGraphs')).toBe(false)
  })
})

describe('calcStreak', () => {
  it('returns 0 for empty dates', () => {
    expect(calcStreak([])).toBe(0)
  })

  describe('training insights', () => {
    it('estimates e1RM with the Epley formula', () => {
      expect(estimateOneRepMax('80', '5')).toBe(93.3)
      expect(estimateOneRepMax('', '5')).toBe(0)
    })

    it('summarizes recent muscle recovery without counting incomplete sets', () => {
      const now = new Date('2026-10-14T12:00:00')
      const snapshot = getRecoverySnapshot([{
        date: '2026-10-13',
        exercises: [{ muscle: 'Peito', sets: [
          { weight: '80', reps: '5', done: true },
          { weight: '80', reps: '5', done: false },
        ] }],
      }], now)
      expect(snapshot[0].muscle).toBe('Peito')
      expect(snapshot[0].sets).toBe(1)
      expect(snapshot[0].status).toBe('recuperando')
    })
  })

  it('returns 1 for only today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(calcStreak([today])).toBe(1)
  })

  it('returns correct streak for consecutive days', () => {
    const dates = []
    for (let i = 0; i < 5; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }
    expect(calcStreak(dates)).toBe(5)
  })

  it('breaks streak on gap', () => {
    const today = new Date().toISOString().split('T')[0]
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const old = threeDaysAgo.toISOString().split('T')[0]
    expect(calcStreak([today, old])).toBe(1)
  })

  it('skips planned rest days when calculating streak', () => {
    const today = new Date()
    const trained = [today, new Date(today.getTime() - 2 * 86400000)]
      .map(d => d.toISOString().split('T')[0])
    expect(calcStreak(trained, trained)).toBe(2)
  })

  it('stops when a planned training day was missed', () => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    expect(calcStreak([today], [today, yesterday])).toBe(1)
  })
})

describe('calcBestStreak', () => {
  it('returns 0 for empty array', () => {
    expect(calcBestStreak([])).toBe(0)
  })

  it('finds best streak among multiple streaks', () => {
    // Create a 5-day streak 10 days ago, and a 2-day recent streak
    const dates = []
    // Recent streak: today + yesterday
    for (let i = 0; i < 2; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }
    // Old streak: 5 days starting 10 days ago
    for (let i = 0; i < 5; i++) {
      const d = new Date(); d.setDate(d.getDate() - 10 - i)
      dates.push(d.toISOString().split('T')[0])
    }
    expect(calcBestStreak(dates)).toBe(5)
  })

  it('counts planned training days across rest days', () => {
    const dates = ['2024-01-01', '2024-01-03', '2024-01-05']
    const eligible = ['2024-01-01', '2024-01-03', '2024-01-05']
    expect(calcBestStreak(dates, eligible)).toBe(3)
  })

  it('breaks the best streak on an uncompleted planned day', () => {
    const dates = ['2024-01-01', '2024-01-03']
    const eligible = ['2024-01-01', '2024-01-02', '2024-01-03']
    expect(calcBestStreak(dates, eligible)).toBe(1)
  })
})
