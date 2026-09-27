// ──────────────────────────────────────────────────────────
//  Voryn — Cardio Pós-Treino: campos por modalidade
// ──────────────────────────────────────────────────────────
//
//  Cada tipo de cardio tem suas próprias métricas — esteira tem
//  inclinação, remo tem split pace, cardio livre só tem tempo e
//  esforço percebido. Este arquivo é a fonte da verdade de quais
//  campos cada modalidade tem: o formulário (CardioModal.jsx) é
//  inteiramente construído a partir daqui, não tem nada hardcoded
//  por tipo — adicionar uma modalidade nova ou um campo novo é só
//  editar esta lista.
//
//  Tipos de campo suportados pelo CardioModal:
//    'decimal' — input numérico com casas decimais (ex: 10.5 km/h)
//    'number'  — input numérico inteiro (ex: 20 min)
//    'text'    — texto livre curto (ex: "2:05" de split pace)
//    'select'  — escolha entre `options` (ex: nível de esforço)
//
//  `key` é o nome salvo no jsonb (workout_logs.cardio). `duration_minutes`
//  existe em todo tipo de propósito e é o único campo sempre obrigatório
//  (ver <casos_extremos_e_validacoes> da spec original) — os demais são
//  opcionais, e ficam `null` se a pessoa não preencher.
// ──────────────────────────────────────────────────────────

export const CARDIO_TYPES = [
  {
    id: 'esteira',
    label: 'Esteira',
    icon: '🏃',
    fields: [
      { key: 'speed_kmh',        label: 'Velocidade média', unit: 'km/h', type: 'decimal', placeholder: '10.5' },
      { key: 'incline_percent',  label: 'Inclinação',       unit: '%',    type: 'number',  placeholder: '3' },
      { key: 'duration_minutes', label: 'Tempo',            unit: 'min',  type: 'number',  placeholder: '20', required: true },
      { key: 'distance_km',      label: 'Distância',        unit: 'km',   type: 'decimal', placeholder: '3.5' },
    ],
  },
  {
    id: 'bike',
    label: 'Bicicleta Ergométrica',
    icon: '🚴',
    fields: [
      { key: 'resistance_level', label: 'Nível de resistência', unit: '1-20', type: 'number',  placeholder: '10' },
      { key: 'rpm',              label: 'Cadência média',       unit: 'rpm',  type: 'number',  placeholder: '80' },
      { key: 'duration_minutes', label: 'Tempo',                unit: 'min',  type: 'number',  placeholder: '20', required: true },
      { key: 'distance_km',      label: 'Distância',            unit: 'km',   type: 'decimal', placeholder: '8' },
    ],
  },
  {
    id: 'escada',
    label: 'Escada / Stairmaster',
    icon: '🪜',
    fields: [
      { key: 'resistance_level', label: 'Nível / velocidade', unit: '1-20', type: 'number', placeholder: '8' },
      { key: 'stair_spm',        label: 'Degraus por minuto', unit: 'spm',  type: 'number', placeholder: '60' },
      { key: 'duration_minutes', label: 'Tempo',              unit: 'min',  type: 'number', placeholder: '15', required: true },
      { key: 'floors',           label: 'Total de andares/degraus', unit: '', type: 'number', placeholder: '90' },
    ],
  },
  {
    id: 'eliptico',
    label: 'Elíptico / Transport',
    icon: '⚙️',
    fields: [
      { key: 'resistance_level', label: 'Nível de resistência', unit: '1-20', type: 'number',  placeholder: '10' },
      { key: 'duration_minutes', label: 'Tempo',                unit: 'min',  type: 'number',  placeholder: '20', required: true },
      { key: 'distance_km',      label: 'Distância',            unit: 'km',   type: 'decimal', placeholder: '5' },
    ],
  },
  {
    id: 'remo',
    label: 'Remo Seco',
    icon: '🚣',
    fields: [
      { key: 'split_pace',       label: 'Split pace (500m)',       unit: 'min/500m', type: 'text',   placeholder: '2:05' },
      { key: 'resistance_level', label: 'Carga do dumper',         unit: '1-10',     type: 'number', placeholder: '5' },
      { key: 'duration_minutes', label: 'Tempo',                   unit: 'min',      type: 'number', placeholder: '15', required: true },
      { key: 'distance_m',       label: 'Distância',               unit: 'm',        type: 'number', placeholder: '2000' },
    ],
  },
  {
    id: 'corrida',
    label: 'Corrida / Caminhada',
    icon: '🏞️',
    fields: [
      { key: 'pace_min_km',      label: 'Pace médio', unit: 'min/km', type: 'text',    placeholder: '5:30' },
      { key: 'distance_km',      label: 'Distância',  unit: 'km',     type: 'decimal', placeholder: '5' },
      { key: 'duration_minutes', label: 'Tempo',      unit: 'min',    type: 'number',  placeholder: '30', required: true },
      { key: 'elevation_m',      label: 'Elevação ganha', unit: 'm',  type: 'number',  placeholder: '40' },
    ],
  },
  {
    id: 'livre',
    label: 'Cardio Livre / Corda / HIIT',
    icon: '⚡',
    fields: [
      { key: 'duration_minutes', label: 'Tempo', unit: 'min', type: 'number', placeholder: '15', required: true },
      {
        key: 'rpe_level', label: 'Percepção de esforço', unit: '', type: 'select',
        options: [
          { value: 'leve',      label: 'Leve' },
          { value: 'moderado',  label: 'Moderado' },
          { value: 'intenso',   label: 'Intenso' },
          { value: 'exaustivo', label: 'Exaustivo' },
        ],
      },
      { key: 'calories', label: 'Calorias estimadas', unit: 'kcal', type: 'number', placeholder: '150' },
    ],
  },
]

export function getCardioType(id) {
  return CARDIO_TYPES.find(t => t.id === id) || null
}

// Resumo de uma linha pro badge do histórico — ex: "Esteira · 20 min ·
// 10.5 km/h · 3% inc". Só entra o que a pessoa preencheu; nunca mostra
// "null" nem campo vazio.
export function summarizeCardio(cardio) {
  if (!cardio?.type) return ''
  const def = getCardioType(cardio.type)
  if (!def) return ''
  const parts = [`${def.icon} ${def.label}`]
  if (cardio.duration_minutes) parts.push(`${cardio.duration_minutes} min`)
  def.fields.forEach(f => {
    if (f.key === 'duration_minutes') return // já entrou acima
    const v = cardio[f.key]
    if (v === null || v === undefined || v === '') return
    if (f.type === 'select') {
      const opt = f.options.find(o => o.value === v)
      parts.push(opt ? opt.label : v)
    } else {
      parts.push(`${v}${f.unit ? f.unit : ''}`)
    }
  })
  return parts.join(' · ')
}
