// ──────────────────────────────────────────────────────────
//  Voryn — Biblioteca de Exercícios (100 exercícios)
// ──────────────────────────────────────────────────────────

export const EXERCISE_LIBRARY = [
  // PEITO
  { id:'e001', name:'Supino Reto',               muscle:'Peito',       equipment:'Barra',        type:'compound'  },
  { id:'e002', name:'Supino Inclinado',           muscle:'Peito',       equipment:'Barra',        type:'compound'  },
  { id:'e003', name:'Supino Declinado',           muscle:'Peito',       equipment:'Barra',        type:'compound'  },
  { id:'e004', name:'Supino com Halteres',        muscle:'Peito',       equipment:'Halteres',     type:'compound'  },
  { id:'e005', name:'Supino Inclinado Halteres',  muscle:'Peito',       equipment:'Halteres',     type:'compound'  },
  { id:'e006', name:'Crucifixo',                  muscle:'Peito',       equipment:'Halteres',     type:'isolation' },
  { id:'e007', name:'Crucifixo Inclinado',        muscle:'Peito',       equipment:'Halteres',     type:'isolation' },
  { id:'e008', name:'Crossover no Cabo',          muscle:'Peito',       equipment:'Cabo',         type:'isolation' },
  { id:'e009', name:'Peck Deck',                  muscle:'Peito',       equipment:'Máquina',      type:'isolation' },
  { id:'e010', name:'Flexão de Braço',            muscle:'Peito',       equipment:'Corpo',        type:'compound'  },
  { id:'e011', name:'Fundos (Peito)',              muscle:'Peito',       equipment:'Corpo',        type:'compound'  },
  // COSTAS
  { id:'e012', name:'Puxada Frontal',             muscle:'Costas',      equipment:'Cabo',         type:'compound'  },
  { id:'e013', name:'Puxada Triângulo',           muscle:'Costas',      equipment:'Cabo',         type:'compound'  },
  { id:'e014', name:'Remada Curvada',             muscle:'Costas',      equipment:'Barra',        type:'compound'  },
  { id:'e015', name:'Remada com Haltere',         muscle:'Costas',      equipment:'Halteres',     type:'compound'  },
  { id:'e016', name:'Remada na Máquina',          muscle:'Costas',      equipment:'Máquina',      type:'compound'  },
  { id:'e017', name:'Remada Cavalinho',           muscle:'Costas',      equipment:'Máquina',      type:'compound'  },
  { id:'e018', name:'Pulldown no Cabo',           muscle:'Costas',      equipment:'Cabo',         type:'compound'  },
  { id:'e019', name:'Barra Fixa',                 muscle:'Costas',      equipment:'Corpo',        type:'compound'  },
  { id:'e020', name:'Levantamento Terra',         muscle:'Costas',      equipment:'Barra',        type:'compound'  },
  { id:'e021', name:'Hiperextensão',              muscle:'Costas',      equipment:'Máquina',      type:'isolation' },
  { id:'e022', name:'Pullover',                   muscle:'Costas',      equipment:'Halteres',     type:'isolation' },
  { id:'e023', name:'Remada Unilateral no Cabo',  muscle:'Costas',      equipment:'Cabo',         type:'compound'  },
  // OMBRO
  { id:'e024', name:'Desenvolvimento c/ Barra',   muscle:'Ombro',       equipment:'Barra',        type:'compound'  },
  { id:'e025', name:'Desenvolvimento Halteres',   muscle:'Ombro',       equipment:'Halteres',     type:'compound'  },
  { id:'e026', name:'Elevação Lateral',           muscle:'Ombro',       equipment:'Halteres',     type:'isolation' },
  { id:'e027', name:'Elevação Frontal',           muscle:'Ombro',       equipment:'Halteres',     type:'isolation' },
  { id:'e028', name:'Elevação Posterior',         muscle:'Ombro',       equipment:'Halteres',     type:'isolation' },
  { id:'e029', name:'Elevação Lateral no Cabo',   muscle:'Ombro',       equipment:'Cabo',         type:'isolation' },
  { id:'e030', name:'Arnold Press',               muscle:'Ombro',       equipment:'Halteres',     type:'compound'  },
  { id:'e031', name:'Face Pull',                  muscle:'Ombro',       equipment:'Cabo',         type:'isolation' },
  { id:'e032', name:'Encolhimento de Ombros',     muscle:'Ombro',       equipment:'Halteres',     type:'isolation' },
  { id:'e033', name:'Remada Alta',                muscle:'Ombro',       equipment:'Barra',        type:'compound'  },
  // BÍCEPS
  { id:'e034', name:'Rosca Direta',               muscle:'Bíceps',      equipment:'Barra',        type:'isolation' },
  { id:'e035', name:'Rosca Alternada',            muscle:'Bíceps',      equipment:'Halteres',     type:'isolation' },
  { id:'e036', name:'Rosca Martelo',              muscle:'Bíceps',      equipment:'Halteres',     type:'isolation' },
  { id:'e037', name:'Rosca Scott',                muscle:'Bíceps',      equipment:'Barra',        type:'isolation' },
  { id:'e038', name:'Rosca Concentrada',          muscle:'Bíceps',      equipment:'Halteres',     type:'isolation' },
  { id:'e039', name:'Rosca no Cabo',              muscle:'Bíceps',      equipment:'Cabo',         type:'isolation' },
  { id:'e040', name:'Rosca 21',                   muscle:'Bíceps',      equipment:'Barra',        type:'isolation' },
  // TRÍCEPS
  { id:'e041', name:'Tríceps Pulley',             muscle:'Tríceps',     equipment:'Cabo',         type:'isolation' },
  { id:'e042', name:'Tríceps Testa',              muscle:'Tríceps',     equipment:'Barra',        type:'isolation' },
  { id:'e043', name:'Tríceps Francês',            muscle:'Tríceps',     equipment:'Halteres',     type:'isolation' },
  { id:'e044', name:'Fundos (Tríceps)',            muscle:'Tríceps',     equipment:'Corpo',        type:'compound'  },
  { id:'e045', name:'Tríceps Coice',              muscle:'Tríceps',     equipment:'Halteres',     type:'isolation' },
  { id:'e046', name:'Supino Fechado',             muscle:'Tríceps',     equipment:'Barra',        type:'compound'  },
  { id:'e047', name:'Extensão no Cabo Corda',     muscle:'Tríceps',     equipment:'Cabo',         type:'isolation' },
  // PERNAS / QUADRÍCEPS
  { id:'e048', name:'Agachamento Livre',          muscle:'Pernas',      equipment:'Barra',        type:'compound'  },
  { id:'e049', name:'Agachamento Hack',           muscle:'Pernas',      equipment:'Máquina',      type:'compound'  },
  { id:'e050', name:'Leg Press 45°',              muscle:'Pernas',      equipment:'Máquina',      type:'compound'  },
  { id:'e051', name:'Leg Press Horizontal',       muscle:'Pernas',      equipment:'Máquina',      type:'compound'  },
  { id:'e052', name:'Extensora',                  muscle:'Pernas',      equipment:'Máquina',      type:'isolation' },
  { id:'e053', name:'Flexora Deitada',            muscle:'Pernas',      equipment:'Máquina',      type:'isolation' },
  { id:'e054', name:'Flexora Em Pé',              muscle:'Pernas',      equipment:'Máquina',      type:'isolation' },
  { id:'e055', name:'Avanço (Lunge)',              muscle:'Pernas',      equipment:'Halteres',     type:'compound'  },
  { id:'e056', name:'Stiff',                      muscle:'Pernas',      equipment:'Barra',        type:'compound'  },
  { id:'e057', name:'Agachamento Sumô',           muscle:'Pernas',      equipment:'Halteres',     type:'compound'  },
  { id:'e058', name:'Cadeira Abdutora',           muscle:'Pernas',      equipment:'Máquina',      type:'isolation' },
  { id:'e059', name:'Cadeira Adutora',            muscle:'Pernas',      equipment:'Máquina',      type:'isolation' },
  { id:'e060', name:'Hip Thrust',                 muscle:'Pernas',      equipment:'Barra',        type:'compound'  },
  { id:'e061', name:'Agachamento Búlgaro',        muscle:'Pernas',      equipment:'Halteres',     type:'compound'  },
  { id:'e062', name:'Step Up',                    muscle:'Pernas',      equipment:'Corpo',        type:'compound'  },
  { id:'e063', name:'Agachamento Goblet',         muscle:'Pernas',      equipment:'Kettlebell',   type:'compound'  },
  { id:'e064', name:'Box Jump',                   muscle:'Pernas',      equipment:'Corpo',        type:'compound'  },
  { id:'e065', name:'Deadlift Romeno',            muscle:'Pernas',      equipment:'Barra',        type:'compound'  },
  // GLÚTEO
  { id:'e066', name:'Elevação Pélvica',           muscle:'Glúteo',      equipment:'Corpo',        type:'compound'  },
  { id:'e067', name:'Donkey Kick',                muscle:'Glúteo',      equipment:'Corpo',        type:'isolation' },
  { id:'e068', name:'Glúteo 4 Apoios no Cabo',    muscle:'Glúteo',      equipment:'Cabo',         type:'isolation' },
  { id:'e069', name:'Glúteo no Puxador',          muscle:'Glúteo',      equipment:'Cabo',         type:'isolation' },
  // PANTURRILHA
  { id:'e070', name:'Panturrilha Em Pé',          muscle:'Panturrilha', equipment:'Máquina',      type:'isolation' },
  { id:'e071', name:'Panturrilha Sentado',        muscle:'Panturrilha', equipment:'Máquina',      type:'isolation' },
  { id:'e072', name:'Panturrilha no Leg Press',   muscle:'Panturrilha', equipment:'Máquina',      type:'isolation' },
  // ABDÔMEN
  { id:'e073', name:'Abdominal Crunch',           muscle:'Abdômen',     equipment:'Corpo',        type:'isolation' },
  { id:'e074', name:'Abdominal no Cabo',          muscle:'Abdômen',     equipment:'Cabo',         type:'isolation' },
  { id:'e075', name:'Prancha',                    muscle:'Abdômen',     equipment:'Corpo',        type:'isolation' },
  { id:'e076', name:'Elevação de Pernas',         muscle:'Abdômen',     equipment:'Corpo',        type:'isolation' },
  { id:'e077', name:'Russian Twist',              muscle:'Abdômen',     equipment:'Corpo',        type:'isolation' },
  { id:'e078', name:'Abdominal Bicicleta',        muscle:'Abdômen',     equipment:'Corpo',        type:'isolation' },
  { id:'e079', name:'Abdominal Declinado',        muscle:'Abdômen',     equipment:'Máquina',      type:'isolation' },
  { id:'e080', name:'Prancha Lateral',            muscle:'Abdômen',     equipment:'Corpo',        type:'isolation' },
  // CARDIO
  { id:'e081', name:'Esteira',                    muscle:'Cardio',      equipment:'Máquina',      type:'cardio'    },
  { id:'e082', name:'Bicicleta Ergométrica',      muscle:'Cardio',      equipment:'Máquina',      type:'cardio'    },
  { id:'e083', name:'Elíptico',                   muscle:'Cardio',      equipment:'Máquina',      type:'cardio'    },
  { id:'e084', name:'Remo Ergométrico',           muscle:'Cardio',      equipment:'Máquina',      type:'cardio'    },
  { id:'e085', name:'Pular Corda',                muscle:'Cardio',      equipment:'Corpo',        type:'cardio'    },
  { id:'e086', name:'Burpee',                     muscle:'Cardio',      equipment:'Corpo',        type:'cardio'    },
  { id:'e087', name:'Polichinelo',                muscle:'Cardio',      equipment:'Corpo',        type:'cardio'    },
  // FUNCIONAL
  { id:'e088', name:'Kettlebell Swing',           muscle:'Funcional',   equipment:'Kettlebell',   type:'compound'  },
  { id:'e089', name:'Turkish Get Up',             muscle:'Funcional',   equipment:'Kettlebell',   type:'compound'  },
  { id:'e090', name:'Wall Ball',                  muscle:'Funcional',   equipment:'Medicine Ball',type:'compound'  },
  { id:'e091', name:'Battle Rope',                muscle:'Funcional',   equipment:'Rope',         type:'cardio'    },
  { id:'e092', name:'Clean',                      muscle:'Funcional',   equipment:'Barra',        type:'compound'  },
  { id:'e093', name:'Snatch',                     muscle:'Funcional',   equipment:'Barra',        type:'compound'  },
  // ANTEBRAÇO
  { id:'e094', name:'Rosca Inversa',              muscle:'Antebraço',   equipment:'Barra',        type:'isolation' },
  { id:'e095', name:'Rosca de Punho',             muscle:'Antebraço',   equipment:'Halteres',     type:'isolation' },
  // POSTERIOR / ISQUIO
  { id:'e096', name:'Mesa Flexora',               muscle:'Posterior',   equipment:'Máquina',      type:'isolation' },
  { id:'e097', name:'Leg Curl no Cabo',           muscle:'Posterior',   equipment:'Cabo',         type:'isolation' },
  // MOBILIDADE / OUTRO
  { id:'e098', name:'Passada Lateral',            muscle:'Mobilidade',  equipment:'Corpo',        type:'compound'  },
  { id:'e099', name:'Good Morning',               muscle:'Mobilidade',  equipment:'Barra',        type:'compound'  },
  { id:'e100', name:'Alongamento de Quadril',     muscle:'Mobilidade',  equipment:'Corpo',        type:'isolation' },
  // ── Adições — exercícios pesquisados e sugeridos pelo personal,
  // selecionados para não duplicar o que já existe na biblioteca (ex:
  // "Remada Curvada", "Crucifixo", "Levantamento Terra" etc já existiam).
  // PEITO
  { id:'e101', name:'Paralelas para Peito',       muscle:'Peito',       equipment:'Corpo',        type:'compound'  },
  { id:'e102', name:'Pullover com Halteres',      muscle:'Peito',       equipment:'Halteres',     type:'isolation' },
  { id:'e103', name:'Supino com Halteres Pegada Fechada', muscle:'Peito', equipment:'Halteres',   type:'compound'  },
  { id:'e104', name:'Crucifixo no Cabo Cruz de Ferro', muscle:'Peito',  equipment:'Cabo',         type:'isolation' },
  { id:'e105', name:'Flexão Pliométrica',         muscle:'Peito',       equipment:'Corpo',        type:'compound'  },
  // COSTAS
  { id:'e106', name:'Remada T na Máquina',        muscle:'Costas',      equipment:'Máquina',      type:'compound'  },
  { id:'e107', name:'Remada Renegade',            muscle:'Costas',      equipment:'Halteres',     type:'compound'  },
  { id:'e108', name:'Remada Pendlay',             muscle:'Costas',      equipment:'Barra',        type:'compound'  },
  { id:'e109', name:'Remada Invertida',           muscle:'Costas',      equipment:'Corpo',        type:'compound'  },
  { id:'e110', name:'Remada Meadows',             muscle:'Costas',      equipment:'Barra',        type:'compound'  },
  // OMBRO
  { id:'e111', name:'Desenvolvimento Militar',    muscle:'Ombro',       equipment:'Barra',        type:'compound'  },
  { id:'e112', name:'Crucifixo Inverso no Cabo',  muscle:'Ombro',       equipment:'Cabo',         type:'isolation' },
  { id:'e113', name:'Face Pull no Cabo',          muscle:'Ombro',       equipment:'Cabo',         type:'isolation' },
  { id:'e114', name:'Posterior de Ombro com Elástico', muscle:'Ombro',  equipment:'Elástico',     type:'isolation' },
  { id:'e115', name:'Z Press',                    muscle:'Ombro',       equipment:'Barra',        type:'compound'  },
  { id:'e116', name:'Rotação Externa no Cabo',    muscle:'Ombro',       equipment:'Cabo',         type:'isolation' },
  // BÍCEPS
  { id:'e117', name:'Rosca Inclinada com Halteres', muscle:'Bíceps',    equipment:'Halteres',     type:'isolation' },
  { id:'e118', name:'Rosca Spider',               muscle:'Bíceps',      equipment:'Halteres',     type:'isolation' },
  { id:'e119', name:'Rosca Zottman',              muscle:'Bíceps',      equipment:'Halteres',     type:'isolation' },
  { id:'e120', name:'Rosca Drag',                 muscle:'Bíceps',      equipment:'Halteres',     type:'isolation' },
  // TRÍCEPS
  { id:'e121', name:'Tríceps Testa com Barra EZ', muscle:'Tríceps',     equipment:'Barra',        type:'isolation' },
  { id:'e122', name:'Supino Fechado (Close Grip)', muscle:'Tríceps',    equipment:'Barra',        type:'compound'  },
  { id:'e123', name:'Paralelas com Peso',         muscle:'Tríceps',     equipment:'Corpo',        type:'compound'  },
  { id:'e124', name:'Tríceps Coice com Cabo',     muscle:'Tríceps',     equipment:'Cabo',         type:'isolation' },
  { id:'e125', name:'Tate Press',                 muscle:'Tríceps',     equipment:'Halteres',     type:'isolation' },
  // PERNAS — QUADRÍCEPS
  { id:'e126', name:'Agachamento Frontal',        muscle:'Pernas',      equipment:'Barra',        type:'compound'  },
  { id:'e127', name:'Agachamento na Parede com Bola', muscle:'Pernas',  equipment:'Bola Suíça',   type:'compound'  },
  { id:'e128', name:'Sissy Squat',                muscle:'Pernas',      equipment:'Corpo',        type:'isolation' },
  { id:'e129', name:'Avanço Búlgaro Unilateral',  muscle:'Pernas',      equipment:'Halteres',     type:'compound'  },
  // PERNAS — POSTERIOR
  { id:'e130', name:'Levantamento Terra Stiff (RDL)', muscle:'Posterior', equipment:'Barra',      type:'compound'  },
  { id:'e131', name:'Flexão Nórdica',             muscle:'Posterior',   equipment:'Corpo',        type:'isolation' },
  { id:'e132', name:'Levantamento Terra Sumô',    muscle:'Posterior',   equipment:'Barra',        type:'compound'  },
  // PANTURRILHA
  { id:'e133', name:'Panturrilha Burrinho (Donkey)', muscle:'Panturrilha', equipment:'Máquina',   type:'isolation' },
  // ABDÔMEN
  { id:'e134', name:'Pressão Pallof',             muscle:'Abdômen',     equipment:'Cabo',         type:'isolation' },
  { id:'e135', name:'Rolo Abdominal com Barra',   muscle:'Abdômen',     equipment:'Barra',        type:'isolation' },
  { id:'e137', name:'Dead Bug',                   muscle:'Abdômen',     equipment:'Corpo',        type:'isolation' },
]

// ANTES, MUSCLE_GROUPS vinha de [...new Set(...)].sort() — ordem
// alfabética (Abdômen, Bíceps, Cardio, Costas, Funcional...), que é
// confusa pra quem está escolhendo exercício durante o treino ou montando
// uma ficha (o personal relatou isso como "muito bagunçado"). Agora segue
// a ordem lógica que qualquer app de treino usa: peito → costas → ombro →
// braços → pernas/glúteo/posterior → core → categorias auxiliares por
// último. Grupos que existirem na biblioteca mas não estiverem nesta
// lista (caso alguém adicione um novo no futuro) ainda aparecem, só vão
// para o final, em vez de quebrar o filtro.
const MUSCLE_ORDER = [
  'Peito', 'Costas', 'Ombro',
  'Bíceps', 'Tríceps', 'Antebraço',
  'Pernas', 'Glúteo', 'Posterior', 'Panturrilha',
  'Abdômen',
  'Cardio', 'Funcional', 'Mobilidade',
]
const allMuscles = [...new Set(EXERCISE_LIBRARY.map(e => e.muscle))]
export const MUSCLE_GROUPS = [
  ...MUSCLE_ORDER.filter(m => allMuscles.includes(m)),
  ...allMuscles.filter(m => !MUSCLE_ORDER.includes(m)),
]

export function searchExercises(query = '', muscle = '') {
  const q = query.toLowerCase().trim()
  return EXERCISE_LIBRARY.filter(e => {
    const matchName   = !q || e.name.toLowerCase().includes(q)
    const matchMuscle = !muscle || e.muscle === muscle
    return matchName && matchMuscle
  })
}
