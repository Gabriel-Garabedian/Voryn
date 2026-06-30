import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { workoutLogService } from '@/services'
import { calcStreak, calcBestStreak } from '@/utils/helpers'
import { SkeletonList } from '@/components/ui/Skeleton'

const ACHIEVEMENTS = [
  { id:'first_workout', icon:'🏋️', title:'Primeira Pedra',    desc:'Complete seu primeiro treino',               check: (m) => m.total >= 1 },
  { id:'streak3',       icon:'🔑', title:'Sequência de 3',    desc:'Treine 3 dias seguidos',                     check: (m) => m.bestStreak >= 3 },
  { id:'workouts10',    icon:'⚡', title:'10 Treinos',         desc:'Complete 10 treinos no total',               check: (m) => m.total >= 10 },
  { id:'week1',         icon:'🔥', title:'Uma Semana',        desc:'Treine 7 dias seguidos',                     check: (m) => m.bestStreak >= 7 },
  { id:'streak14',      icon:'⭐', title:'Duas Semanas',      desc:'Treine 14 dias seguidos',                    check: (m) => m.bestStreak >= 14 },
  { id:'workouts50',    icon:'🚀', title:'50 Treinos',         desc:'Complete 50 treinos no total',               check: (m) => m.total >= 50 },
  { id:'vol1k',         icon:'💪', title:'1 Tonelada',        desc:'Levante 1.000 kg em volume total',            check: (m) => m.totalVolume >= 1000 },
  { id:'week4',         icon:'📅', title:'Mês Consistente',   desc:'Treine 3×/semana por 4 semanas',             check: (m) => m.monthlyCount >= 12 },
  { id:'month1',        icon:'💎', title:'Um Mês Seguido',    desc:'Treine 30 dias seguidos',                    check: (m) => m.bestStreak >= 30 },
  { id:'workouts100',   icon:'👑', title:'100 Treinos',        desc:'Complete 100 treinos no total',              check: (m) => m.total >= 100 },
  { id:'vol10k',        icon:'🏆', title:'10 Toneladas',      desc:'Levante 10.000 kg em volume total',           check: (m) => m.totalVolume >= 10000 },
  { id:'vol100k',       icon:'🌟', title:'100 Toneladas',     desc:'Levante 100.000 kg em volume total',          check: (m) => m.totalVolume >= 100000 },
]

function AchievementCard({ achievement, unlocked, isNew }) {
  const ref = useRef(null)
  useEffect(() => {
    if (isNew && ref.current) {
      ref.current.classList.add('achievement-unlock')
    }
  }, [isNew])

  return (
    <div ref={ref} className="f-card p-4 flex items-center gap-4 transition-all"
      style={{
        opacity: unlocked ? 1 : 0.45,
        borderColor: unlocked ? 'rgba(var(--accent-rgb),.4)' : 'var(--border)',
        background: unlocked ? 'rgba(var(--accent-rgb),.04)' : 'var(--card)',
      }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl relative"
        style={{
          background: unlocked ? 'rgba(var(--accent-rgb),.15)' : 'var(--surface)',
          border: `1.5px solid ${unlocked ? 'rgba(var(--accent-rgb),.4)' : 'var(--border)'}`,
          filter: unlocked ? 'none' : 'grayscale(100%)',
        }}>
        {achievement.icon}
        {isNew && (
          <span className="absolute -top-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: '#4ade80', color: '#000', fontSize: 9 }}>
            NOVO
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-sm" style={{ color: unlocked ? 'var(--text-1)' : 'var(--text-3)' }}>
            {achievement.title}
          </p>
          {unlocked && (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{achievement.desc}</p>
      </div>
      {unlocked && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent)', boxShadow: '0 0 12px rgba(var(--accent-rgb),.4)' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AchievementsView() {
  const { user } = useAuth()
  const [metrics,       setMetrics]       = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [prevUnlocked,  setPrevUnlocked]  = useState(new Set())
  const [newlyUnlocked, setNewlyUnlocked] = useState(new Set())

  useEffect(() => {
    if (!user) return
    const stored = JSON.parse(localStorage.getItem(`voryn_ach_${user.id}`) || '[]')
    setPrevUnlocked(new Set(stored))
    workoutLogService.getMetrics(user.id).then(m => {
      setMetrics(m)
      setLoading(false)
      const nowUnlocked = ACHIEVEMENTS.filter(a => m && a.check(m)).map(a => a.id)
      const fresh = nowUnlocked.filter(id => !stored.includes(id))
      if (fresh.length) {
        setNewlyUnlocked(new Set(fresh))
        localStorage.setItem(`voryn_ach_${user.id}`, JSON.stringify(nowUnlocked))
      }
    })
  }, [user])

  if (loading) return (
    <div className="px-4 pt-6 pb-8">
      <div className="mb-6 space-y-2">
        <div className="skeleton-pulse h-8 w-40 rounded-lg" style={{ background: 'var(--border)' }}/>
        <div className="skeleton-pulse h-4 w-24 rounded" style={{ background: 'var(--border)' }}/>
      </div>
      <SkeletonList count={6}/>
    </div>
  )

  const unlocked = ACHIEVEMENTS.filter(a => metrics && a.check(metrics))
  const locked   = ACHIEVEMENTS.filter(a => !metrics || !a.check(metrics))
  const pct      = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100)

  const MILESTONES = [
    { streak: 7,  label: '7 dias seguidos 🔥' },
    { streak: 14, label: '14 dias seguidos ⭐' },
    { streak: 30, label: '30 dias seguidos 💎' },
  ]
  const streak = metrics?.bestStreak || 0
  const nextMilestone = MILESTONES.find(m => m.streak > streak)

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="font-display text-3xl uppercase tracking-wide mb-1" style={{ color: 'var(--text-1)' }}>
        Conquistas
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
        {unlocked.length} de {ACHIEVEMENTS.length} desbloqueadas
      </p>

      {/* Progress bar */}
      <div className="f-card p-4 mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span style={{ color: 'var(--text-3)' }}>Progresso geral</span>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{pct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: 'var(--accent)', boxShadow: '0 0 8px rgba(var(--accent-rgb),.4)' }}/>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label:'Desbloqueadas', value: unlocked.length },
            { label:'Restantes',     value: locked.length },
            { label:'Total',         value: ACHIEVEMENTS.length },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="font-display text-2xl" style={{ color: 'var(--accent)' }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Next milestone */}
      {nextMilestone && (
        <div className="f-card p-4 mb-5 flex items-center gap-3"
          style={{ borderColor: 'rgba(250,204,21,.2)', background: 'rgba(250,204,21,.04)' }}>
          <span className="text-2xl">🎯</span>
          <div>
            <p className="text-xs font-semibold" style={{ color: '#facc15' }}>Próxima conquista</p>
            <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{nextMilestone.label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              Faltam {nextMilestone.streak - streak} dias de sequência
            </p>
          </div>
        </div>
      )}

      {newlyUnlocked.size > 0 && (
        <div className="f-card p-4 mb-5 flex items-center gap-3"
          style={{ borderColor: 'rgba(74,222,128,.3)', background: 'rgba(74,222,128,.06)' }}>
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-sm font-bold" style={{ color: '#4ade80' }}>
              {newlyUnlocked.size === 1 ? 'Nova conquista desbloqueada!' : `${newlyUnlocked.size} novas conquistas!`}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Continue assim, você está arrasando!</p>
          </div>
        </div>
      )}

      {unlocked.length > 0 && (
        <div className="mb-5">
          <p className="f-label mb-3">✅ Desbloqueadas ({unlocked.length})</p>
          <div className="space-y-2">
            {unlocked.map(a => (
              <AchievementCard key={a.id} achievement={a} unlocked={true} isNew={newlyUnlocked.has(a.id)}/>
            ))}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <p className="f-label mb-3">🔒 Bloqueadas ({locked.length})</p>
          <div className="space-y-2">
            {locked.map(a => <AchievementCard key={a.id} achievement={a} unlocked={false} isNew={false}/>)}
          </div>
        </div>
      )}
    </div>
  )
}
