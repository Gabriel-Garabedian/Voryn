import React from 'react'

export function HealthIcon({ type, size = 24 }) {
  const paths = {
    steps: <><path d="m7 4 3 2-1 5-5 3-2-3 4-3zM17 10l3 2-1 5-5 3-2-3 4-3z"/><path d="m4 17 3 2M14 5l3 2"/></>,
    sleep: <><path d="M20 15A8 8 0 0 1 9 4a8.5 8.5 0 1 0 11 11Z"/><path d="M18 3v4M16 5h4"/></>,
    water: <><path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/><path d="M8 15a4 4 0 0 0 4 4"/></>,
    nutrition: <><path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18M19 21V3c-4 2-4 8 0 9"/></>,
    weight: <><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M7 8a7 7 0 0 1 10 0M12 11l3-4"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type] || paths.steps}</svg>
}

export function HealthTrend({ days, metric, color = 'var(--accent-text)', label = 'Últimos sete dias', limit = 7 }) {
  const values = [...days].sort((a, b) => a.date.localeCompare(b.date)).slice(-limit)
  const max = Math.max(1, ...values.map(day => Number(day[metric]) || 0))
  const hasData = values.some(day => day[metric] != null)
  return <div className="health-trend" aria-label={label}>
    {hasData ? values.map(day => <div className="health-trend__day" key={day.date}>
      <span className="health-trend__column"><span style={{ height: day[metric] == null ? 3 : Math.max(3, Number(day[metric]) / max * 64), background: day[metric] == null ? 'var(--rule)' : color }} /></span>
      <span>{Number(day.date.slice(-2))}</span>
      <span className="sr-only">{day.date}: {day[metric] ?? 'sem registro'}</span>
    </div>) : <p className="health-empty-chart">Seu histórico aparece aqui após a primeira sincronização.</p>}
  </div>
}

export function ActivityRings({ values, goals }) {
  const colors = ['#a9df64', '#7dd5df', '#b99aff']
  const keys = ['steps', 'water_ml', 'sleep_minutes']
  return <svg className="health-rings" viewBox="0 0 140 140" fill="none" aria-label="Progresso das metas de passos, água e sono">
    {keys.map((key, index) => {
      const radius = 57 - index * 14
      const length = 2 * Math.PI * radius
      const progress = Math.min(1, Math.max(0, (values?.[key] || 0) / goals[key]))
      return <g key={key} transform="rotate(-90 70 70)">
        <circle cx="70" cy="70" r={radius} stroke={colors[index]} strokeOpacity=".15" strokeWidth="9" />
        {progress > 0 && <circle cx="70" cy="70" r={radius} stroke={colors[index]} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${length * progress} ${length}`} />}
      </g>
    })}
    <path d="m63 68 5 5 10-11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}
