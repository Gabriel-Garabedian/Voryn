# Continuação: atividades ao ar livre do Voryn

## Pedido do usuário

Adicionar corrida, caminhada e ciclismo ao Voryn, com gravação GPS, mapa do trajeto, distância, tempo, ritmo/velocidade e resumo/histórico. Usar REA para investigar a funcionalidade do Strava e construir uma implementação própria integrada ao design existente do Voryn. O usuário pediu para continuar no Codex Cloud antes de terminarem os testes locais.

## Estado desta entrega

**Trabalho em andamento, ainda não aprovado para distribuição.** O código foi preparado localmente e transferido para uma branch exclusiva. Não houve alteração no banco, publicação do site, instalação de novo APK no celular, merge ou alteração na conta do Strava.

Leia `CLAUDE.md` para as convenções do projeto e `docs/ATIVIDADES-AO-AR-LIVRE.md` para as observações reais do REA, IDs de evidência, identidade do APK e limites da análise. Não afirmar que se recuperou o código original do Strava ou seu processamento de servidor.

## O que já existe nesta branch

- Leaflet 1.9.4 adicionado a package.json/lockfile.
- Tela `/app/outdoor`, seleção de modalidade, iniciar/pausar/retomar/finalizar, métricas, mapa e histórico local com exclusão confirmada.
- Entradas na Home, menu Mais e Histórico. Tela carregada por lazy import, mapa em chunk próprio; tokens visuais do Voryn.
- Plugin Capacitor Kotlin, serviço de localização em primeiro plano, notificações, persistência atômica por conta, recuperação pausada após interrupção do processo.
- Permissões de localização aproximada/precisa e serviço location; registro do plugin em MainActivity. Versão Android 1.7/code 8.
- Pausa ao sair da conta e tentativa de limpeza local na exclusão da conta. Política de privacidade descreve o comportamento.
- Testes JS das métricas, segmentos e tela; testes Kotlin puros do filtro GPS.

A persistência apenas neste aparelho foi a escolha de escopo inicial do implementador, não uma preferência confirmada pelo usuário. O usuário quer a experiência de atividade ao ar livre; não pediu duplicar todas as funções sociais, autopausa ou rankings. Não confundir os percursos com os logs de musculação existentes. Nenhum código decompilado do Strava foi incorporado ao app.

## Próximo trabalho obrigatório

1. Revisar o código como implementação inicial, corrigindo os problemas encontrados antes de expandir o escopo. Examinar especialmente lifecycle do serviço/ResultReceiver, consentimento de localização precisa, transições de pausa/finalização, troca de conta, gravação interrompida, falha de armazenamento e exclusão de dados.
2. Executar `npm ci`, `npm run lint -- --quiet`, `npm test`, `npm run build`. O ambiente Windows restrito negou leitura de diretório ao esbuild, então a execução anterior de Vitest/build não validou o código. `git diff --check` passou; houve uma execução de lint sem erros antes dos últimos ajustes de integração. Não tratar isso como validação final.
3. Com Java 21 e Android SDK 36: `npm run android:sync`, depois, em android, `./gradlew testDebugUnitTest assembleDebug` no Linux (`gradlew.bat` no Windows). Não commitar arquivos de build/SDK/configuração local gerados.
4. Revisar os testes novos e adicionar somente casos que cubram riscos reais. Na tela, verificar ações assíncronas e polling, recuperação de erros e isolamento por conta. No Android, garantir que não se perca o checkpoint se o processo morrer ou o usuário finalizar logo após pausar.
5. Corrigir a política de privacidade/implementação se a remoção de dados na exclusão de conta puder falhar sem aviso visível. Não apresentar limpeza completa quando ela não ocorreu.
6. Produzir um APK de teste e informar o caminho/link do artefato disponível. Não publicar/deployar/mesclar em produção sem solicitação do usuário.
7. Relatar claramente que GPS, precisão, bateria e tela bloqueada ainda precisam de teste real no Samsung. Não inventar execução de testes físicos ou comparação lado a lado com Strava.

## Limites do Cloud

O celular do usuário estava conectado via USB ao Windows local. Ele não está automaticamente acessível ao container Cloud. Os APKs e JSONs integrais do REA ficaram no Windows, em `.local/share/rea/targets/strava`, fora do repositório. A documentação desta branch preserva os achados necessários para continuar a implementação. Não enviar APKs proprietários, dados privados do aparelho, `.env.local`, credenciais ou tokens para o repositório público.

Para ampliar a engenharia reversa no Cloud, seria necessário fornecer artefatos autorizados e configurar REA/JADX/Java nesse ambiente. Isso não é necessário para revisar e concluir a implementação já iniciada. Não analisar o código-fonte do Voryn usando REA: para isso, ler os arquivos normalmente.
