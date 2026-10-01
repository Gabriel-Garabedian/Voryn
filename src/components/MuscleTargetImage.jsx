import React from 'react'

const PRIMARY = 'var(--accent)'
const SECONDARY = '#f59e0b'
const BASE = 'rgba(148,163,184,.22)'
const STROKE = 'rgba(226,232,240,.42)'

const MUSCLE_LABELS = {
  Peito: 'Peitoral',
  Costas: 'Costas',
  Ombro: 'Ombros',
  Bíceps: 'Bíceps',
  Tríceps: 'Tríceps',
  Pernas: 'Quadríceps',
  Glúteo: 'Glúteos',
  Posterior: 'Posteriores',
  Panturrilha: 'Panturrilhas',
  Abdômen: 'Abdômen',
  Cardio: 'Corpo inteiro',
  Funcional: 'Corpo inteiro',
  Mobilidade: 'Mobilidade',
  Antebraço: 'Antebraços',
  Lombar: 'Lombar',
}

function normalizeMuscle(value = '') {
  const muscle = value.toLowerCase()
  if (muscle.includes('peito') || muscle.includes('pector')) return 'Peito'
  if (muscle.includes('costas') || muscle.includes('dorsal') || muscle.includes('back')) return 'Costas'
  if (muscle.includes('ombro') || muscle.includes('delto')) return 'Ombro'
  if (muscle.includes('bíceps') || muscle.includes('biceps')) return 'Bíceps'
  if (muscle.includes('tríceps') || muscle.includes('triceps')) return 'Tríceps'
  if (muscle.includes('glúteo') || muscle.includes('glute')) return 'Glúteo'
  if (muscle.includes('posterior') || muscle.includes('hamstring')) return 'Posterior'
  if (muscle.includes('panturr') || muscle.includes('calf')) return 'Panturrilha'
  if (muscle.includes('abd') || muscle.includes('core') || muscle.includes('waist')) return 'Abdômen'
  if (muscle.includes('antebra') || muscle.includes('forearm')) return 'Antebraço'
  if (muscle.includes('lombar') || muscle.includes('lower back')) return 'Lombar'
  if (muscle.includes('perna') || muscle.includes('quadr') || muscle.includes('leg')) return 'Pernas'
  return muscle ? 'Funcional' : ''
}

function fillFor(muscle, primary, secondary) {
  const normalized = normalizeMuscle(muscle)
  if (normalized === primary) return PRIMARY
  if (secondary.includes(normalized)) return SECONDARY
  return BASE
}

export default function MuscleTargetImage({
  muscle,
  secondaryMuscles = [],
  compact = false,
  showLabel = true,
}) {
  const primary = normalizeMuscle(muscle)
  const secondary = secondaryMuscles.map(normalizeMuscle).filter(Boolean)
  const label = MUSCLE_LABELS[primary] || muscle || 'Músculo alvo'
  const aria = `Músculo alvo: ${label}${secondary.length ? `. Secundários: ${secondary.join(', ')}` : ''}`

  return (
    <div
      className={`muscle-target ${compact ? 'muscle-target--compact' : ''}`}
      role="img"
      aria-label={aria}
      title={aria}
      style={{
        background: 'linear-gradient(145deg, rgba(var(--accent-rgb),.12), rgba(15,23,42,.22))',
        border: '1px solid rgba(var(--accent-rgb),.2)',
      }}
    >
      <svg viewBox="0 0 120 150" aria-hidden="true">
        <circle cx="60" cy="18" r="11" fill={BASE} stroke={STROKE} strokeWidth="1.4"/>
        <path d="M51 31c-7 5-11 15-10 29l5 26h28l5-26c1-14-3-24-10-29-5 3-13 3-18 0Z"
          fill={fillFor('Abdômen', primary, secondary)} stroke={STROKE} strokeWidth="1.4"/>
        <path d="M48 34c-8 2-14 7-18 15l-10 24 9 4 15-18 6-13Z"
          fill={fillFor('Ombro', primary, secondary)} stroke={STROKE} strokeWidth="1.4"/>
        <path d="M72 34c8 2 14 7 18 15l10 24-9 4-15-18-6-13Z"
          fill={fillFor('Ombro', primary, secondary)} stroke={STROKE} strokeWidth="1.4"/>
        <path d="M29 73l-10 33 8 3 14-30-3-6Z"
          fill={fillFor('Tríceps', primary, secondary)} stroke={STROKE} strokeWidth="1.4"/>
        <path d="M91 73l10 33-8 3-14-30 3-6Z"
          fill={fillFor('Tríceps', primary, secondary)} stroke={STROKE} strokeWidth="1.4"/>
        <path d="M26 108l-5 27 8 1 9-27-4-4Z"
          fill={fillFor('Antebraço', primary, secondary)} stroke={STROKE} strokeWidth="1.4"/>
        <path d="M94 108l5 27-8 1-9-27 4-4Z"
          fill={fillFor('Antebraço', primary, secondary)} stroke={STROKE} strokeWidth="1.4"/>
        <path d="M46 35c4 7 24 7 28 0l-3 16c-7 5-15 5-22 0Z"
          fill={fillFor('Peito', primary, secondary)} stroke={STROKE} strokeWidth="1.4"/>
        <path d="M47 51h26l-3 34H50Z"
          fill={fillFor('Abdômen', primary, secondary)} stroke={STROKE} strokeWidth="1.4"/>
        <path d="M50 84l-4 33-2 29h13l4-29 4-33Z"
          fill={fillFor('Pernas', primary, secondary)} stroke={STROKE} strokeWidth="1.4"/>
        <path d="M70 84l4 33 2 29H63l-4-29-4-33Z"
          fill={fillFor('Pernas', primary, secondary)} stroke={STROKE} strokeWidth="1.4"/>
        <path d="M44 117l-3 27 8 1 8-27-1-6Z"
          fill={fillFor('Posterior', primary, secondary)} opacity=".86" stroke={STROKE} strokeWidth="1.1"/>
        <path d="M76 117l3 27-8 1-8-27 1-6Z"
          fill={fillFor('Posterior', primary, secondary)} opacity=".86" stroke={STROKE} strokeWidth="1.1"/>
        <path d="M44 144l-2 5h12l1-5Z" fill={fillFor('Panturrilha', primary, secondary)} stroke={STROKE} strokeWidth="1"/>
        <path d="M76 144l2 5H66l-1-5Z" fill={fillFor('Panturrilha', primary, secondary)} stroke={STROKE} strokeWidth="1"/>
        <path d="M51 39c-2 15-2 28 0 45M69 39c2 15 2 28 0 45" stroke="rgba(255,255,255,.16)" strokeWidth="1" fill="none"/>
      </svg>
      {showLabel && (
        <div className="muscle-target__label">
          <span className="muscle-target__dot" />
          <span>{label}</span>
        </div>
      )}
    </div>
  )
}
