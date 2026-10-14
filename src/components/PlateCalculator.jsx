import React, { useMemo, useState } from 'react'

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]

export default function PlateCalculator({ onClose }) {
  const [target, setTarget] = useState('')
  const [bar, setBar] = useState('20')
  const [available, setAvailable] = useState(PLATES.join(', '))

  const result = useMemo(() => {
    const total = Number(target)
    const barWeight = Number(bar)
    const plates = available.split(',').map(Number).filter(n => n > 0).sort((a, b) => b - a)
    if (!total || !barWeight || total <= barWeight || !plates.length) return null
    let remaining = (total - barWeight) / 2
    const selected = []
    for (const plate of plates) {
      const count = Math.floor((remaining + 1e-8) / plate)
      if (count > 0) {
        selected.push(...Array.from({ length: count }, () => plate))
        remaining = Math.round((remaining - count * plate) * 100) / 100
      }
    }
    return { selected, remaining }
  }, [target, bar, available])

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="plate-title">
      <button className="absolute inset-0" style={{ background: 'rgba(0,0,0,.7)' }} onClick={onClose} aria-label="Fechar calculadora" />
      <div className="relative w-full max-w-md p-5 rounded-t-3xl sm:rounded-3xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Ferramenta</p>
            <h2 id="plate-title" className="font-display text-xl uppercase" style={{ color: 'var(--text-1)' }}>Calculadora de anilhas</h2>
          </div>
          <button onClick={onClose} className="w-11 h-11 rounded-xl" style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }} aria-label="Fechar">×</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>Peso alvo (kg)
            <input autoFocus className="f-input mt-1" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} placeholder="Ex: 100" />
          </label>
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>Barra (kg)
            <input className="f-input mt-1" inputMode="decimal" value={bar} onChange={e => setBar(e.target.value)} />
          </label>
        </div>
        <label className="block text-xs mt-3" style={{ color: 'var(--text-3)' }}>Anilhas disponíveis (separadas por vírgula)
          <input className="f-input mt-1" value={available} onChange={e => setAvailable(e.target.value)} />
        </label>
        <div className="mt-4 p-4 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {!result ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Informe o peso alvo para calcular cada lado.</p>
          ) : result.remaining > 0.01 ? (
            <p className="text-sm" style={{ color: '#f59e0b' }}>Não foi possível montar exatamente. Faltam {result.remaining.toFixed(2)} kg por lado.</p>
          ) : (
            <>
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Cada lado</p>
              <p className="mt-1 font-display text-2xl" style={{ color: 'var(--accent)' }}>{result.selected.join(' + ')} kg</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Total: {target} kg incluindo a barra</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
