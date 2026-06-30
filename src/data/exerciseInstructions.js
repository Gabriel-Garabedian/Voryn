// ──────────────────────────────────────────────────────────
//  Voryn — Instruções de execução + busca de vídeo
//  Gera instruções por padrão de movimento (equipment + type)
//  e complementa com dicas específicas para os exercícios
//  mais comuns/sensíveis (risco de lesão, erro de execução).
//  Vídeo: link de busca no YouTube gerado dinamicamente —
//  sempre atualizado, sem custo de hospedagem, sem curadoria manual de 100 URLs.
// ──────────────────────────────────────────────────────────

// Dicas específicas — sobrescrevem o genérico quando existir
const SPECIFIC_TIPS = {
  'Supino Reto': {
    setup: 'Deite no banco com os pés firmes no chão. Pegada um pouco mais larga que os ombros.',
    steps: [
      'Retraia as escápulas, formando um pequeno arco lombar natural',
      'Desça a barra controlada até tocar levemente o peito',
      'Empurre a barra de volta em linha reta, sem travar o cotovelo',
    ],
    caution: 'Não rebote a barra no peito. Mantenha os pulsos alinhados ao antebraço.',
  },
  'Agachamento Livre': {
    setup: 'Barra apoiada no trapézio (não no pescoço). Pés na largura dos ombros, pontas levemente para fora.',
    steps: [
      'Inspire e contraia o abdômen antes de descer',
      'Desça flexionando quadril e joelhos juntos, como sentar numa cadeira',
      'Mantenha o peso nos calcanhares e o joelho alinhado com a ponta do pé',
      'Suba expirando, sem perder a curvatura natural da lombar',
    ],
    caution: 'Joelho não deve "cair" para dentro. Se sentir dor lombar, reduza a carga.',
  },
  'Levantamento Terra': {
    setup: 'Barra próxima às canelas. Pés na largura do quadril, pegada pronada.',
    steps: [
      'Quadril abaixado, peito aberto, olhar para frente',
      'Puxe a barra junto ao corpo, estendendo quadril e joelhos juntos',
      'No topo, contraia o glúteo sem hiperextender a lombar',
      'Desça controlado, voltando ao ponto inicial',
    ],
    caution: 'Nunca arredonde a lombar durante o movimento. Este é o exercício com maior risco de lesão se mal executado — comece com carga leve.',
  },
  'Barra Fixa': {
    setup: 'Pegada pronada, um pouco mais larga que os ombros. Ombros ativos antes de iniciar.',
    steps: [
      'Inicie do dead hang (braços estendidos)',
      'Puxe o corpo levando o peito até a barra, cotovelos para baixo',
      'Desça controlado até a extensão completa',
    ],
    caution: 'Evite "balançar" o corpo para compensar força. Se não conseguir nenhuma repetição, use elástico de assistência.',
  },
  'Desenvolvimento com Barra': {
    setup: 'Em pé ou sentado, barra na altura dos ombros, pegada pronada.',
    steps: [
      'Contraia o abdômen e glúteo para estabilizar o tronco',
      'Empurre a barra para cima até estender os braços, sem travar',
      'Desça controlado até a altura do queixo',
    ],
    caution: 'Não arqueie excessivamente a lombar para compensar amplitude.',
  },
  'Rosca Direta': {
    setup: 'Em pé, cotovelos junto ao corpo, pegada supinada.',
    steps: [
      'Flexione o cotovelo levando a barra até o peito',
      'Contraia o bíceps no topo do movimento',
      'Desça controlado até a extensão completa',
    ],
    caution: 'Evite usar o tronco para "jogar" o peso — isole o movimento no cotovelo.',
  },
  'Puxada Frontal': {
    setup: 'Sentado, pegada pronada mais larga que os ombros.',
    steps: [
      'Incline levemente o tronco para trás',
      'Puxe a barra até a altura do peito, levando os cotovelos para baixo e trás',
      'Retorne controlado até a extensão completa dos braços',
    ],
    caution: 'Não use o impulso do corpo para puxar — o movimento vem das costas, não dos braços.',
  },
  'Leg Press 45°': {
    setup: 'Pés na largura dos ombros, na parte média da plataforma.',
    steps: [
      'Destrave o carro e controle a descida',
      'Desça até o joelho formar ~90°, sem a lombar descolar do encosto',
      'Empurre de volta sem travar totalmente o joelho no topo',
    ],
    caution: 'Não deixe a lombar arredondar no fundo do movimento — reduza a amplitude se necessário.',
  },
}

// Templates genéricos por combinação tipo + equipamento
// Cobrem os 100 exercícios que não têm dica específica acima
function genericInstructions(ex) {
  const { type, equipment, muscle } = ex

  const setups = {
    'Barra':         'Posicione-se com a barra firme, pegada alinhada aos ombros e postura neutra da coluna.',
    'Halteres':      'Segure um halter em cada mão, com pegada firme e cotovelos levemente flexionados.',
    'Cabo':          'Ajuste a polia na altura indicada, segure o cabo com pegada firme e dê um passo atrás para criar tensão.',
    'Máquina':       'Ajuste o banco/encosto para a sua altura antes de iniciar, garantindo alinhamento articular correto.',
    'Corpo':         'Posicione-se de forma estável, ativando o core antes de iniciar o movimento.',
    'Kettlebell':    'Segure o kettlebell com firmeza, mantendo o pulso neutro durante todo o movimento.',
    'Medicine Ball': 'Segure a bola com as duas mãos, próxima ao corpo, antes de iniciar o movimento explosivo.',
    'Rope':          'Posicione-se com os pés afastados, segurando uma extremidade da corda em cada mão.',
  }

  const stepsByType = {
    compound: [
      'Execute o movimento de forma controlada na fase excêntrica (descida)',
      'Aplique força na fase concêntrica (subida/empurrão) sem perder a postura',
      'Mantenha a respiração: expire no esforço, inspire no retorno',
    ],
    isolation: [
      'Isole o grupo muscular alvo, evitando compensação de outras articulações',
      'Contraia o músculo no ponto de maior tensão por 1 segundo',
      'Retorne controlado até a posição inicial, sem soltar o peso de forma brusca',
    ],
    cardio: [
      'Mantenha um ritmo constante durante toda a série',
      'Ajuste a intensidade conforme sua percepção de esforço',
      'Hidrate-se entre os blocos de exercício',
    ],
  }

  const cautionByMuscle = {
    'Pernas':   'Mantenha o joelho alinhado com a ponta do pé. Evite valgismo (joelho para dentro).',
    'Costas':   'Evite arredondar a lombar. O movimento deve vir da escápula, não do braço.',
    'Ombro':    'Articulação sensível — evite cargas excessivas e amplitude além do confortável.',
    'Peito':    'Controle a descida; evitar rebote da carga sobre o peito.',
  }

  return {
    setup: setups[equipment] || 'Posicione-se de forma estável antes de iniciar o movimento.',
    steps: stepsByType[type] || stepsByType.compound,
    caution: cautionByMuscle[muscle] || 'Priorize execução controlada sobre carga elevada, especialmente nas primeiras semanas.',
  }
}

/** Retorna { setup, steps[], caution } para qualquer exercício da biblioteca */
export function getExerciseInstructions(exercise) {
  return SPECIFIC_TIPS[exercise.name] || genericInstructions(exercise)
}

/** Gera URL de busca de vídeo no YouTube para o exercício (sempre atualizado, zero manutenção) */
export function getExerciseVideoSearchUrl(exerciseName) {
  const query = encodeURIComponent(`${exerciseName} execução correta`)
  return `https://www.youtube.com/results?search_query=${query}`
}

/** Gera URL de embed do primeiro resultado — usamos busca incorporada via youtube-nocookie quando o usuário clicar */
export function getYoutubeEmbedSearchUrl(exerciseName) {
  // Sem API key, não é possível obter o primeiro video_id automaticamente no client.
  // Solução sem custo: abrir a busca do YouTube em nova aba (link acima) é o caminho seguro.
  return getExerciseVideoSearchUrl(exerciseName)
}
