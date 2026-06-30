// ──────────────────────────────────────────────────────────
//  Voryn — Unit Tests: helpers.js
//  Run: npx vitest run
// ──────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest'
import {
  translateError, formatDuration, formatDate, formatDateShort,
  formatVolume, calcStreak, calcBestStreak, getPlanLimit, PLAN_LIMITS
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

describe('formatVolume', () => {
  it('formats kg under 1000', () => {
    const r = formatVolume(500)
    expect(r).toContain('500')
  })
  it('formats tons for >= 1000', () => {
    const r = formatVolume(1500)
    expect(r).toMatch(/1[,.]5\s*t/)
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
})
