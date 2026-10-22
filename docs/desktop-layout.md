# Ajustes de desktop mantendo o visual anterior

O visual anterior, do commit `c3f1d6a`, é a base novamente. O redesign
`64d47c6` foi revertido sem reescrever o histórico do repositório.

## Escopo

Os ajustes novos ficam em `src/styles/desktop.css`, dentro de
`@media (min-width: 1024px)`. As únicas regras fora desse breakpoint
ocultam os elementos exclusivos do desktop no celular e no tablet.

As cores, fontes, componentes, navegação mobile, páginas públicas e regras
de negócio do visual anterior foram preservados. As alterações nos
componentes de Perfil, Evolução e Treino acrescentam classes para layout;
não modificam estados, serviços ou cálculos.

## Padrão do desktop

- Navegação de 224px, com os recursos complementares acessíveis diretamente.
- Cabeçalho e conteúdo alinhados na mesma largura máxima de 1120px.
- Margens mínimas de 32px e intervalo de 24px entre os painéis.
- Início com linhas compactas de cards e métricas, sem áreas reservadas
  para blocos que não têm dados.
- Rotina com edição em linhas completas e seletor semanal sem rolagem lateral.
- Evolução com carga e volume lado a lado.
- Perfil com resumo e seções em duas colunas.
- Treino ativo com resumo fixo ao lado do registro de séries.

## Verificação

Capturas com dados simulados e backend interceptado ficam em
`.taste-skill/desktop-revision/`, ignorado pelo Git. A revisão inclui
390, 768, 1024, 1280, 1440 e 1920px, nos temas claro e escuro.

O visual mobile é comparado às capturas feitas imediatamente após
restaurar `c3f1d6a`, antes de implementar os ajustes de desktop.
