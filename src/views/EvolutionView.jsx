import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { workoutLogService } from '@/services'
import { formatDateShort, formatVolume, getPlanLimit } from '@/utils/helpers'
import { Badge, Button } from '@/components/ui'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

// Usa a variável CSS (não um hex fixo) para que os gráficos sigam a cor
// de destaque escolhida pelo usuário (recurso pago — ver AccentColorPicker
// em ProfileView.jsx). Recharts renderiza via SVG real do DOM, então
// var(--accent) é resolvida normalmente pelo navegador.
const AC = 'var(--accent)'
const AC2 = 'var(--accent-2)'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="f-card px-3 py-2 text-xs" style={{ border: `1px solid rgba(var(--accent-rgb),.3)` }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--text-2)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: AC2 }}>{p.name}: <strong>{p.value}{p.unit||''}</strong></p>
      ))}
    </div>
  )
}

function GateCard({ navigate }) {
  return (
    <div className="f-card p-8 text-center space-y-4 m-4"
      style={{ borderColor: 'rgba(var(--accent-rgb),.3)', background: 'rgba(var(--accent-rgb),.04)' }}>
      <div className="text-4xl">📊</div>
      <h3 className="font-display text-xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
        Gráficos de Evolução
      </h3>
      <p className="text-sm" style={{ color: 'var(--text-3)' }}>
        Acompanhe sua progressão de carga e volume. Disponível no Plano Aluno.
      </p>
      <Button onClick={() => navigate('/app/subscription')}>
        Assinar agora — R$14,90/mês
      </Button>
    </div>
  )
}

// EvolutionView é usado pelo próprio aluno (rota /app/evolution, sem props)
// e pelo personal visualizando a evolução de um aluno (embeddedUserId). O
// gate de plano (hasGraphs) é sempre avaliado sobre o usuário LOGADO — é o
// plano dele que dá direito a ver gráficos, não o do aluno sendo visualizado.
export default function EvolutionView({ embeddedUserId, embeddedName }) {
  const { user, plan } = useAuth()
  const navigate = useNavigate()
  const targetUserId = embeddedUserId || user?.id
  const isEmbedded = Boolean(embeddedUserId)
  const [logs,      setLogs]      = useState([])
  const [exercises, setExercises] = useState([])
  const [selected,  setSelected]  = useState('')
  const [tab,       setTab]       = useState('load') // 'load' | 'volume' | 'frequency'
  const [loading,   setLoading]   = useState(true)

  const hasGraphs = getPlanLimit(plan, 'hasGraphs')

  useEffect(() => {
    if (!targetUserId || !hasGraphs) { setLoading(false); return }
    workoutLogService.getAll(targetUserId).then(({ data }) => {
      const all = data || []
      setLogs(all)
      // Collect unique exercises
      const exSet = new Set()
      all.forEach(log => log.exercises?.forEach(ex => exSet.add(ex.name)))
      const exList = [...exSet].sort()
      setExercises(exList)
      if (exList.length > 0) setSelected(exList[0])
      setLoading(false)
    }).catch(err => {
      // workoutLogService.getAll já é defensivo (nunca rejeita), mas um erro
      // de lógica aqui dentro do próprio .then() (ex: log.exercises mal
      // formado) ainda pode travar o loading — defesa em profundidade.
      console.error('[Voryn] EvolutionView falhou ao carregar:', err)
      setLoading(false)
    })
  }, [targetUserId, hasGraphs])

  if (!hasGraphs) return <GateCard navigate={navigate}/>
  if (loading) return (
    <div className="px-4 pt-6 pb-8">
      <div className="skeleton-pulse h-8 w-32 rounded-lg mb-2" style={{ background: 'var(--border)' }}/>
      <div className="skeleton-pulse h-4 w-24 rounded mb-5" style={{ background: 'var(--border)' }}/>
      <SkeletonList count={4}/>
    </div>
  )
  if (logs.length === 0) return (
    <div className="px-4 pt-8 text-center space-y-3">
      <div className="text-4xl">📈</div>
      <p className="font-semibold" style={{ color: 'var(--text-1)' }}>Sem dados ainda</p>
      <p className="text-sm" style={{ color: 'var(--text-3)' }}>Complete alguns treinos para ver sua evolução.</p>
    </div>
  )

  // ── Load progression data ──────────────────────────────
  const loadData = logs
    .map(log => {
      const ex = log.exercises?.find(e => e.name === selected)
      if (!ex) return null
      const maxWeight = ex.sets.reduce((m, s) => Math.max(m, parseFloat(s.weight)||0), 0)
      return { date: formatDateShort(log.date), carga: maxWeight, volume: ex.sets.reduce((a,s) => a+(parseFloat(s.weight)||0)*(parseInt(s.reps)||0),0) }
    })
    .filter(Boolean)
    .reverse()
    .slice(-20)

  // ── Volume per week ────────────────────────────────────
  const weeklyVolume = (() => {
    const map = {}
    logs.forEach(log => {
      const week = getWeekLabel(log.date)
      const vol  = parseFloat(log.total_volume) || 0
      map[week]  = (map[week] || 0) + vol
    })
    return Object.entries(map).slice(-8).map(([week, vol]) => ({ week, volume: Math.round(vol) }))
  })()

  // ── Frequency per month ────────────────────────────────
  const monthlyFreq = (() => {
    const map = {}
    logs.forEach(log => {
      const m = log.date?.slice(0,7)
      map[m] = (map[m]||0) + 1
    })
    return Object.entries(map).slice(-6).map(([month, count]) => ({
      mes: month.slice(5) + '/' + month.slice(2,4),
      treinos: count
    }))
  })()

  return (
    <div className="pb-6">
      <div className="px-4 pt-6 pb-4">
        <h1 className="font-display text-3xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>Evolução</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
          {isEmbedded ? `Progresso de ${embeddedName || 'aluno'}` : 'Acompanhe sua progressão'}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {[['load','⚡ Carga'],['volume','🏋️ Volume'],['frequency','📅 Frequência']].map(([id,lbl]) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab===id ? 'var(--card)' : 'transparent',
                color:      tab===id ? 'var(--accent)' : 'var(--text-3)',
                border:     tab===id ? '1px solid var(--border)' : '1px solid transparent',
              }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Load chart */}
      {tab === 'load' && (
        <div className="px-4 space-y-4">
          {/* Exercise selector */}
          <div>
            <label className="f-label">Exercício</label>
            <select value={selected} onChange={e => setSelected(e.target.value)}
              className="f-input text-sm"
              style={{ background: 'var(--surface)', color: 'var(--text-1)' }}>
              {exercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>

          {loadData.length > 0 ? (
            <div className="f-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Carga máxima (kg)</p>
                {loadData.length > 0 && (
                  <Badge variant="accent">
                    Máx: {Math.max(...loadData.map(d=>d.carga))}kg
                  </Badge>
                )}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={loadData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} width={35}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Line type="monotone" dataKey="carga" name="Carga" unit="kg"
                    stroke={AC} strokeWidth={2.5} dot={{ fill: AC, r: 4 }}
                    activeDot={{ r: 6, fill: AC2 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="f-card p-6 text-center" style={{ color: 'var(--text-3)' }}>
              Nenhum dado para {selected}
            </div>
          )}

          {/* Volume for selected exercise */}
          {loadData.length > 0 && (
            <div className="f-card p-4">
              <p className="font-semibold text-sm mb-3" style={{ color: 'var(--text-1)' }}>Volume por sessão (kg × reps)</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={loadData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="date" tick={{ fill:'var(--text-3)', fontSize:10 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:'var(--text-3)', fontSize:10 }} axisLine={false} tickLine={false} width={40}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Bar dataKey="volume" name="Volume" fill={AC} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Volume tab */}
      {tab === 'volume' && (
        <div className="px-4 space-y-4">
          <div className="f-card p-4">
            <p className="font-semibold text-sm mb-3" style={{ color: 'var(--text-1)' }}>Volume total semanal</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="week" tick={{ fill:'var(--text-3)', fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'var(--text-3)', fontSize:10 }} axisLine={false} tickLine={false} width={40}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="volume" name="Volume" unit="kg" fill={AC} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:'Maior volume semanal', value: weeklyVolume.length ? formatVolume(Math.max(...weeklyVolume.map(w=>w.volume))) : '—' },
              { label:'Média semanal',         value: weeklyVolume.length ? formatVolume(weeklyVolume.reduce((a,w)=>a+w.volume,0)/weeklyVolume.length) : '—' },
              { label:'Total acumulado',        value: formatVolume(logs.reduce((a,l)=>a+(parseFloat(l.total_volume)||0),0)) },
              { label:'Melhor semana',          value: weeklyVolume.length ? weeklyVolume.reduce((a,b)=>a.volume>b.volume?a:b).week : '—' },
            ].map(s => (
              <div key={s.label} className="f-card p-3 text-center">
                <div className="font-display text-xl" style={{ color: 'var(--accent)' }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frequency tab */}
      {tab === 'frequency' && (
        <div className="px-4 space-y-4">
          <div className="f-card p-4">
            <p className="font-semibold text-sm mb-3" style={{ color: 'var(--text-1)' }}>Treinos por mês</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyFreq}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="mes" tick={{ fill:'var(--text-3)', fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'var(--text-3)', fontSize:10 }} axisLine={false} tickLine={false} width={30}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="treinos" name="Treinos" fill={AC2} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label:'Total treinos',    value: logs.length },
              { label:'Melhor mês',       value: monthlyFreq.length ? Math.max(...monthlyFreq.map(m=>m.treinos)) : 0 },
              { label:'Média/mês',        value: monthlyFreq.length ? Math.round(monthlyFreq.reduce((a,m)=>a+m.treinos,0)/monthlyFreq.length) : 0 },
            ].map(s => (
              <div key={s.label} className="f-card p-3 text-center">
                <div className="font-display text-2xl" style={{ color: 'var(--accent)' }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getWeekLabel(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00')
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay())
  return start.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })
}
