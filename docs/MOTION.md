# Movimento da interface

## Direção

Movimentos curtos e controlados, sem quique nos controles. A animação confirma uma ação ou orienta a atenção; o conteúdo e as ações devem estar disponíveis imediatamente.

- Tempos compartilhados: rápido 140 ms, padrão 240 ms e lento 400 ms.
- Entrada desacelera; saída acelera e termina antes da entrada equivalente.
- Tokens CSS em `src/index.css`; tempos em segundos e configuração dos diálogos em `src/utils/motion.js`.
- Preservar o sistema visual, os temas e as bibliotecas já utilizadas. GSAP atende a página inicial; Motion atende os diálogos; transições simples usam CSS.
- Não adicionar camadas ambientes, partículas ou loops apenas para cumprir uma receita de motion design.

## Implementação atual

- Página inicial: título e ações nunca começam ocultos; sequência inicial de até 700 ms, pequeno deslocamento e crescimento discreto das barras da escada de carga.
- Revelações abaixo da dobra: uma vez por elemento, até 480 ms (360 ms em telas pequenas). Elementos já na primeira tela permanecem visíveis.
- GSAP: seletores limitados ao componente, `useGSAP` e `gsap.matchMedia`; mudanças de viewport/preferência e desmontagem revertem animações e ScrollTriggers.
- Modal compartilhado: entrada 240 ms, saída 140 ms, sem mola; preservados foco, Escape e navegação por Tab.
- Notificações: deslocamento de 8 px, sem escala ou quique; somente opacidade e transform são animados.
- Entradas CSS compartilhadas e transição principal do app usam a mesma curva e duração padrão.
- Movimento reduzido: GSAP não cria animações; modais usam apenas fades curtos; notificações não se deslocam. A preferência também é atendida ao mudar com a página aberta.

## Skills instaladas

- `gsap-core`, `gsap-react`, `gsap-performance`, `gsap-timeline` e `gsap-scrolltrigger`: `greensock/gsap-skills`, revisão `aed9cfd3277740755f6bfc1155c7aa645403b760`.
- `motion-design`: `LottieFiles/motion-design-skill`, revisão `f9a8a041b85185ee4881b3471d3415e939aac772`.
- Instaladas no perfil do Codex. Motion Design recebeu uma nota local que prioriza acessibilidade e controles funcionais sobre a exigência de três camadas de movimento.
- Análise estática dos seis pacotes sem achados; isso não equivale a uma auditoria completa. Pacotes selecionados contêm apenas Markdown.
- Origens e hashes instalados estão no inventário global; origens também em `docs/skills-sources.json`.

## Validação

- Build de produção web e lint dos arquivos JavaScript alterados.
- Oito testes existentes de foco e teclado de diálogos.
- No navegador Edge em 390 px: menu mobile abre/fecha, mudança ao vivo para movimento reduzido revela todo o conteúdo, modal abre/fecha com Escape e devolve o foco, notificação respeita movimento reduzido e pode ser dispensada; salvar na fixture fecha o modal e mostra a confirmação. Asserções passaram, sem exceções JavaScript capturadas pelo roteiro.
- Capturas da página inicial em 1440, 768 e 390 px, sem overflow horizontal; o inspetor conservou alertas preexistentes de títulos longos e da cor roxa da marca.
- O console de desenvolvimento também registra avisos preexistentes de React Router/HTML e bloqueio do WebSocket de HMR na página interceptada de teste. A fixture é local ao navegador e não adiciona uma rota ao aplicativo.
- Evidências locais em `output/playwright/`: capturas antes/depois e roteiro de interação dos componentes reais em uma página isolada, sem conta ou escrita no backend.
- Não comprova APK ou funcionamento em aparelho Android, nem fluxos autenticados completos.
