import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { routineService } from '@/services'
import { Button } from '@/components/ui'

const DAYS_FULL  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const GOALS = [
  { id:'hypertrophy', label:'💪 Hipertrofia',    desc:'Ganhar músculo e força' },
  { id:'fat_loss',    label:'🔥 Emagrecimento',  desc:'Perder gordura' },
  { id:'endurance',   label:'🏃 Resistência',    desc:'Melhorar condicionamento' },
  { id:'strength',    label:'🏋️ Força máxima',  desc:'Levantar mais peso' },
  { id:'health',      label:'❤️ Saúde geral',   desc:'Qualidade de vida' },
]

const TRAINING_DAYS_PRESETS = [
  { label:'3x por semana', days:[1,3,5] },
  { label:'4x por semana', days:[1,2,4,5] },
  { label:'5x por semana', days:[1,2,3,4,5] },
  { label:'Personalizado', days:[] },
]

const WORKOUT_NAMES = {
  1: 'Peito & Tríceps',
  2: 'Costas & Bíceps',
  3: 'Pernas',
  4: 'Ombro & Tríceps',
  5: 'Costas & Bíceps',
  6: 'Pernas',
  0: 'Treino Livre',
}

function ProgressDots({ total, current }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="transition-all duration-300 rounded-full"
          style={{
            width:  i === current ? 24 : 8,
            height: 8,
            background: i <= current ? 'var(--accent)' : 'var(--border)',
          }}/>
      ))}
    </div>
  )
}

export default function OnboardingView() {
  const { user, profile, isPersonal, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [step,         setStep]         = useState(0)
  const [goal,         setGoal]         = useState('')
  const [selectedDays, setSelectedDays] = useState([1,3,5])
  const [preset,       setPreset]       = useState(0)
  const [saving,       setSaving]       = useState(false)

  // Personal não tem "objetivo de treino" nem rotina pessoal — esse
  // onboarding (escolher objetivo, montar dias de treino) é pensado para o
  // aluno. Sem essa checagem, o personal recém-cadastrado via cadastro
  // direto (sem link de convite) caía nessas mesmas perguntas e ganhava uma
  // "ficha de treino pessoal" vazia sem nenhum sentido, em vez de ir direto
  // para o dashboard de alunos.
  useEffect(() => {
    if (isPersonal && profile && !profile.onboarding_done) {
      updateProfile({ onboarding_done: true }).then(() => navigate('/app'))
    }
  }, [isPersonal, profile])

  if (isPersonal) return null // evita flash de conteúdo de aluno antes do redirect acima

  function toggleDay(d) {
    setPreset(3) // custom
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev, d])
  }

  async function finish() {
    setSaving(true)
    try {
      // Save goal to profile
      await updateProfile({ goal, onboarding_done: true })

      // Create basic routines for selected days
      for (const d of selectedDays) {
        await routineService.upsert(user.id, d, {
          name: WORKOUT_NAMES[d] || 'Treino',
          exercises: [],
        })
      }
      navigate('/app')
    } catch (e) {
      console.error(e)
      navigate('/app') // don't block user even if save fails
    }
  }

  const AC = 'var(--accent)'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10"
      style={{ background: 'var(--bg)' }}>

      {/* Background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(var(--accent-rgb),.08) 0%,transparent 70%)' }}/>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/voryn-icon-192.png" alt="Voryn" className="w-14 h-14 rounded-2xl mx-auto mb-3"
            style={{ boxShadow: '0 0 28px rgba(var(--accent-rgb),.45)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-3)' }}>
            Olá, {profile?.name?.split(' ')[0] || 'atleta'}! 👋
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Vamos configurar tudo em 1 minuto</p>
        </div>

        <ProgressDots total={3} current={step}/>

        {/* ── STEP 0: Objetivo ── */}
        {step === 0 && (
          <div className="animate-slide-up">
            <h2 className="font-display text-2xl uppercase tracking-wide mb-1" style={{ color: 'var(--text-1)' }}>
              Qual é seu objetivo?
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
              Isso vai personalizar sua experiência no Voryn.
            </p>
            <div className="space-y-2">
              {GOALS.map(g => (
                <button key={g.id} onClick={() => setGoal(g.id)}
                  className="w-full f-card p-4 text-left flex items-center gap-3 transition-all"
                  style={{
                    borderColor: goal === g.id ? AC : 'var(--border)',
                    background:  goal === g.id ? 'rgba(var(--accent-rgb),.06)' : 'var(--card)',
                  }}>
                  <span className="text-xl flex-shrink-0">{g.label.split(' ')[0]}</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                      {g.label.split(' ').slice(1).join(' ')}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{g.desc}</p>
                  </div>
                  {goal === g.id && (
                    <svg className="ml-auto flex-shrink-0" width="16" height="16" fill="none" viewBox="0 0 24 24"
                      stroke={AC} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </button>
              ))}
            </div>
            <Button size="xl" className="mt-6" disabled={!goal} onClick={() => setStep(1)}>
              Continuar →
            </Button>
          </div>
        )}

        {/* ── STEP 1: Dias de treino ── */}
        {step === 1 && (
          <div className="animate-slide-up">
            <h2 className="font-display text-2xl uppercase tracking-wide mb-1" style={{ color: 'var(--text-1)' }}>
              Quantos dias por semana?
            </h2>
            <p className="text-sm mb-3" style={{ color: 'var(--text-3)' }}>
              Selecione os dias e criaremos sua rotina base automaticamente — você edita depois.
            </p>
            <div className="f-card px-4 py-3 mb-4 flex items-center gap-3"
              style={{ borderColor:'rgba(var(--accent-rgb),.2)', background:'rgba(var(--accent-rgb),.04)' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-xs leading-relaxed" style={{ color:'var(--text-3)' }}>
                Cada dia selecionado ganha uma ficha em branco em <strong style={{color:'var(--text-2)'}}>Rotina</strong>. Adicione exercícios quando quiser.
              </p>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {TRAINING_DAYS_PRESETS.slice(0,3).map((p, i) => (
                <button key={i} onClick={() => { setPreset(i); setSelectedDays(p.days) }}
                  className="f-card p-3 text-center transition-all"
                  style={{
                    borderColor: preset === i ? AC : 'var(--border)',
                    background:  preset === i ? 'rgba(var(--accent-rgb),.06)' : 'var(--card)',
                  }}>
                  <p className="font-semibold text-sm" style={{ color: preset===i ? AC : 'var(--text-1)' }}>
                    {p.label}
                  </p>
                </button>
              ))}
              <button onClick={() => setPreset(3)}
                className="f-card p-3 text-center transition-all"
                style={{
                  borderColor: preset === 3 ? AC : 'var(--border)',
                  background:  preset === 3 ? 'rgba(var(--accent-rgb),.06)' : 'var(--card)',
                }}>
                <p className="font-semibold text-sm" style={{ color: preset===3 ? AC : 'var(--text-1)' }}>
                  Personalizado
                </p>
              </button>
            </div>

            {/* Day picker */}
            <div className="flex gap-2 justify-between mb-6">
              {DAYS_SHORT.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className="flex-1 py-3 rounded-xl font-semibold text-xs transition-all flex flex-col items-center gap-1"
                  style={{
                    background:  selectedDays.includes(i) ? AC : 'var(--card)',
                    color:       selectedDays.includes(i) ? '#fff' : 'var(--text-3)',
                    border:      `1px solid ${selectedDays.includes(i) ? AC : 'var(--border)'}`,
                    boxShadow:   selectedDays.includes(i) ? '0 0 10px rgba(var(--accent-rgb),.3)' : 'none',
                  }}>
                  {d}
                </button>
              ))}
            </div>

            <p className="text-xs text-center mb-4" style={{ color: 'var(--text-3)' }}>
              {selectedDays.length} dia{selectedDays.length !== 1 ? 's' : ''} selecionado{selectedDays.length !== 1 ? 's' : ''}
            </p>

            <div className="flex gap-2">
              <Button variant="ghost" className="px-5" onClick={() => setStep(0)}>← Voltar</Button>
              <Button className="flex-1" disabled={selectedDays.length === 0} onClick={() => setStep(2)}>
                Continuar →
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Resumo ── */}
        {step === 2 && (
          <div className="animate-slide-up">
            <h2 className="font-display text-2xl uppercase tracking-wide mb-1" style={{ color: 'var(--text-1)' }}>
              Tudo pronto!
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
              Sua rotina foi criada. Você pode personalizar depois.
            </p>

            <div className="f-card p-5 mb-4 space-y-4" style={{ borderColor: 'rgba(var(--accent-rgb),.3)' }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Objetivo</p>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                    {GOALS.find(g=>g.id===goal)?.label || goal}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Frequência</p>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                    {selectedDays.length}x por semana — {selectedDays.map(d => DAYS_SHORT[d]).join(', ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Rotina criada</p>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                    {selectedDays.length} treinos configurados e prontos para editar
                  </p>
                </div>
              </div>
            </div>

            <div className="f-card p-4 mb-6" style={{ background: 'rgba(74,222,128,.05)', borderColor: 'rgba(74,222,128,.2)' }}>
              <p className="text-sm" style={{ color: '#4ade80' }}>
                🎉 Você tem <strong>14 dias grátis</strong> para explorar tudo. Sem cartão necessário.
              </p>
            </div>

            <Button size="xl" loading={saving} onClick={finish}>
              Entrar no Voryn →
            </Button>

            <button onClick={() => navigate('/app')} className="w-full text-center text-sm mt-3"
              style={{ color: 'var(--text-3)' }}>
              Pular configuração
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
