import React from 'react'

const PRIMARY = 'var(--accent)'
const SECONDARY = '#f59e0b'
const BASE = 'rgba(148,163,184,.18)'
const LINE = 'rgba(226,232,240,.38)'

const MUSCLE_LABELS = {
  Peito: 'Peitoral',
  Costas: 'Costas',
  Ombro: 'Deltoides',
  Bíceps: 'Bíceps',
  Tríceps: 'Tríceps',
  Pernas: 'Quadríceps',
  Glúteo: 'Glúteo máximo',
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

function FrontBody({ primary, secondary }) {
  return (
    <g stroke={LINE} strokeWidth="1.2" strokeLinejoin="round">
      <circle cx="80" cy="17" r="11" fill="#cbd5e1" />
      <path d="M73 28h14l5 9-3 9H71l-3-9 5-9Z" fill={BASE} />
      <path d="M69 38c-8 1-16 5-20 12l7 10 12-5 5-14Z" fill={fillFor('Ombro', primary, secondary)} />
      <path d="M91 38c8 1 16 5 20 12l-7 10-12-5-5-14Z" fill={fillFor('Ombro', primary, secondary)} />
      <path d="M55 50 43 83l9 4 17-27-6-13Z" fill={fillFor('Bíceps', primary, secondary)} />
      <path d="M105 50 117 83l-9 4-17-27 6-13Z" fill={fillFor('Bíceps', primary, secondary)} />
      <path d="M43 83 35 113l8 3 13-29-4-4Z" fill={fillFor('Antebraço', primary, secondary)} />
      <path d="M117 83 125 113l-8 3-13-29 4-4Z" fill={fillFor('Antebraço', primary, secondary)} />
      <path d="M68 39c4 5 20 5 24 0l5 17-7 12H70l-7-12 5-17Z" fill={fillFor('Peito', primary, secondary)} />
      <path d="M70 68h20l3 38H67l3-38Z" fill={fillFor('Abdômen', primary, secondary)} />
      <path d="M67 106h13v16l-5 45H57l7-45 3-16Z" fill={fillFor('Pernas', primary, secondary)} />
      <path d="M80 106h13l3 16 7 45H90l-5-45v-16Z" fill={fillFor('Pernas', primary, secondary)} />
      <path d="M57 167h18l-2 35H59l-5-29 3-6Z" fill={fillFor('Panturrilha', primary, secondary)} />
      <path d="M103 167h-18l2 35h14l5-29-3-6Z" fill={fillFor('Panturrilha', primary, secondary)} />
      <path d="M58 202h16l-1 5H54l4-5Z" fill={BASE} />
      <path d="M102 202H86l1 5h19l-4-5Z" fill={BASE} />
      <path d="M80 69v35M72 81h16M72 92h16" fill="none" opacity=".45" />
    </g>
  )
}

function BackBody({ primary, secondary }) {
  return (
    <g stroke={LINE} strokeWidth="1.2" strokeLinejoin="round">
      <circle cx="80" cy="17" r="11" fill="#cbd5e1" />
      <path d="M73 28h14l5 10-5 10H73l-5-10 5-10Z" fill={BASE} />
      <path d="M70 38 51 48l-7 17 12 8 15-20Z" fill={fillFor('Costas', primary, secondary)} />
      <path d="M90 38 109 48l7 17-12 8-15-20Z" fill={fillFor('Costas', primary, secondary)} />
      <path d="M55 50 43 83l9 4 17-27-6-13Z" fill={fillFor('Tríceps', primary, secondary)} />
      <path d="M105 50 117 83l-9 4-17-27 6-13Z" fill={fillFor('Tríceps', primary, secondary)} />
      <path d="M43 83 35 113l8 3 13-29-4-4Z" fill={fillFor('Antebraço', primary, secondary)} />
      <path d="M117 83 125 113l-8 3-13-29 4-4Z" fill={fillFor('Antebraço', primary, secondary)} />
      <path d="M71 65h18l5 41H66l5-41Z" fill={fillFor('Lombar', primary, secondary)} />
      <path d="M66 106h14v16l-5 45H57l7-45 3-16Z" fill={fillFor('Glúteo', primary, secondary)} />
      <path d="M80 106h14l3 16 7 45H90l-5-45v-16Z" fill={fillFor('Glúteo', primary, secondary)} />
      <path d="M57 167h18l-2 35H59l-5-29 3-6Z" fill={fillFor('Posterior', primary, secondary)} />
      <path d="M103 167H85l2 35h14l5-29-3-6Z" fill={fillFor('Posterior', primary, secondary)} />
      <path d="M58 202h16l-1 5H54l4-5Z" fill={fillFor('Panturrilha', primary, secondary)} />
      <path d="M102 202H86l1 5h19l-4-5Z" fill={fillFor('Panturrilha', primary, secondary)} />
      <path d="M80 42v61" fill="none" opacity=".45" />
    </g>
  )
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
  const viewIsBack = ['Costas', 'Glúteo', 'Posterior', 'Lombar'].includes(primary)
  const aria = `Músculo alvo: ${label}${secondary.length ? `. Secundários: ${secondary.join(', ')}` : ''}`

  return (
    <div
      className={`muscle-target ${compact ? 'muscle-target--compact' : ''}`}
      role="img"
      aria-label={aria}
      title={aria}
      style={{ background: 'linear-gradient(145deg, rgba(var(--accent-rgb),.12), rgba(15,23,42,.22))', border: '1px solid rgba(var(--accent-rgb),.2)' }}
    >
      <svg viewBox="0 0 160 215" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        {viewIsBack ? <BackBody primary={primary} secondary={secondary} /> : <FrontBody primary={primary} secondary={secondary} />}
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
