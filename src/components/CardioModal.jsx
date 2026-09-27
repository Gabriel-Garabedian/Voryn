import React, { useState } from 'react'
import { CARDIO_TYPES, getCardioType } from '@/data/cardio'

// ──────────────────────────────────────────────────────────
//  Voryn — Cardio Pós-Treino
//
//  Mostrado depois que o aluno finaliza o treino de musculação (antes
//  de salvar o log), pra registrar opcionalmente o cardio feito na
//  sequência. Três telas dentro do mesmo modal:
//    'prompt' — "quer registrar cardio?" (Pular / Registrar)
//    'pick'   — grade de modalidades (esteira, bike, escada, ...)
//    'form'   — campos específicos da modalidade escolhida
//  Os campos de cada modalidade vêm de src/data/cardio.js — nada aqui
//  é específico de um tipo, então adicionar uma modalidade nova é só
//  editar aquele arquivo, sem tocar neste componente.
// ──────────────────────────────────────────────────────────

export default function CardioModal({ onSkip, onSave, saving }) {
  const [step, setStep] = useState('prompt')
  const [typeId, setTypeId] = useState(null)
  const [form, setForm] = useState({})

  const type = getCardioType(typeId)

  function pickType(id) {
    setTypeId(id)
    setForm({})
    setStep('form')
  }

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSave() {
    // "Tempo (minutos)" é o único campo obrigatório de qualquer
    // modalidade (ver comentário em src/data/cardio.js).
    if (!form.duration_minutes) return
    onSave({ type: typeId, ...form })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-lg animate-slide-up"
        style={{
          background: 'var(--surface)', borderRadius: '28px 28px 0 0',
          border: '1px solid var(--border)', borderBottom: 'none',
          padding: '28px 24px 36px', maxHeight: '88vh', overflowY: 'auto',
        }}>

        {step === 'prompt' && (
          <div className="text-center">
            <div className="text-5xl mb-3">🏃</div>
            <h2 className="font-display text-2xl uppercase tracking-wide mb-2" style={{ color: 'var(--text-1)' }}>
              Cardio pós-treino?
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
              Se você fez cardio depois da musculação, registre aqui pra acompanhar sua evolução.
            </p>
            <button onClick={() => setStep('pick')} disabled={saving}
              className="f-btn f-btn-accent w-full py-4 text-sm font-display uppercase tracking-widest mb-3 disabled:opacity-50">
              Registrar Cardio
            </button>
            <button onClick={onSkip} disabled={saving} className="f-btn f-btn-ghost w-full py-3 text-sm disabled:opacity-50">
              {saving ? 'Salvando...' : 'Pular e Finalizar'}
            </button>
          </div>
        )}

        {step === 'pick' && (
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide mb-4 text-center" style={{ color: 'var(--text-1)' }}>
              Qual modalidade?
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {CARDIO_TYPES.map(t => (
                <button key={t.id} onClick={() => pickType(t.id)}
                  className="f-card p-4 text-center transition-transform active:scale-95">
                  <div className="text-3xl mb-2">{t.icon}</div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{t.label}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('prompt')} className="f-btn f-btn-ghost w-full py-3 text-sm">
              Voltar
            </button>
          </div>
        )}

        {step === 'form' && type && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl">{type.icon}</span>
              <h2 className="font-display text-xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
                {type.label}
              </h2>
            </div>

            <div className="space-y-3 mb-5">
              {type.fields.map(f => (
                <div key={f.key}>
                  <label className="f-label">
                    {f.label}{f.unit ? ` (${f.unit})` : ''}{f.required ? ' *' : ''}
                  </label>
                  {f.type === 'select' ? (
                    <select
                      className="f-input text-sm"
                      style={{ background: 'var(--surface)', color: 'var(--text-1)' }}
                      value={form[f.key] || ''}
                      onChange={e => setField(f.key, e.target.value)}>
                      <option value="">Selecione</option>
                      {f.options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === 'text' ? 'text' : 'number'}
                      inputMode={f.type === 'decimal' ? 'decimal' : f.type === 'number' ? 'numeric' : 'text'}
                      step={f.type === 'decimal' ? '0.1' : undefined}
                      className="f-input"
                      placeholder={f.placeholder}
                      value={form[f.key] ?? ''}
                      onChange={e => setField(f.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>

            <button onClick={handleSave} disabled={!form.duration_minutes || saving}
              className="f-btn f-btn-accent w-full py-4 text-sm font-display uppercase tracking-widest mb-3 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar Treino Completo'}
            </button>
            <button onClick={() => setStep('pick')} disabled={saving} className="f-btn f-btn-ghost w-full py-3 text-sm disabled:opacity-50">
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
