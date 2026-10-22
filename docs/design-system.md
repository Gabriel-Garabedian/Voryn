# Interface do Voryn

## Direção

Precisão no treino: sessão do dia em primeiro plano, números tabulares,
controles confortáveis e metadados próximos da ação que explicam.

A direção `true-black-flat` da skill design-taste-frontend (seed 502215632)
foi adaptada ao grafite neutro e ao roxo já usado pelo Voryn. O acento
continua personalizável conforme o plano. A ação principal usa inversão de
contraste; gráficos e registros de treino carregam a cor.

A navegação inicialmente sorteada sem sidebar foi substituída uma vez por
`ruled-t-frame`: o aplicativo tem mais destinos do que uma barra superior
comporta. Desktop usa sidebar com rótulos; celular usa cinco destinos e um
menu complementar. Histórico permanece disponível no menu e na sidebar.

## Organização dos estilos

- `src/index.css`: tokens globais, primitivas e páginas públicas.
- `src/styles/app-system.css`: tema, tipografia, navegação e composição do app.
- `src/styles/training-screens.css`: Início e Rotina.
- `src/styles/workout-screen.css`: registro de séries e descanso.
- `src/styles/insights-screens.css`: análises, perfil e telas complementares.

As antigas camadas de overrides no fim de index.css foram removidas.
Componentes novos devem usar os tokens semânticos e a composição da tela,
em vez de acrescentar outra camada global de exceções.

## Perguntas das telas

| Tela | Pergunta principal |
| --- | --- |
| Início | Qual sessão vou fazer agora? |
| Rotina | O que está planejado para este dia? |
| Treino | Qual série vou registrar e como foi a última execução? |
| Evolução | Como minha carga, volume e frequência mudaram? |
| Histórico | O que fiz neste período? |
| Perfil | Como configuro minha conta e preferências? |
| Personal | Quais alunos precisam de acompanhamento? |

## Verificação

Os dados usados nas capturas de revisão são fixtures locais, interceptados
no navegador. Nenhuma conta de produção ou autenticação especial foi
adicionada ao produto. Os scripts e relatórios de revisão ficam em
`.taste-skill/`, ignorado pelo Git.

As verificações cobrem celular (390px), tablet (768px) e desktop (1440px),
temas claro e escuro, navegação, menu por teclado e sessão de treino.

As exceções visuais deliberadas são títulos de app entre 24 e 30px,
rótulos compactos na navegação e nos gráficos, e painéis com altura natural
quando os conteúdos têm quantidades diferentes. Isso evita ampliar textos
secundários ou preencher painéis com espaço vazio para equalizar alturas.

Serviços, permissões, planos, autenticação e sincronização permanecem nas
implementações existentes. O redesign altera apresentação e acessibilidade.
