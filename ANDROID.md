# Voryn Android + Health Connect

O projeto Android usa Capacitor 8, Java 21 e SDK Android 36. A interface existente continua disponível na web. O aplicativo inclui um plugin Kotlin local, sem dependência de serviços de sincronização pagos.

## Configurar e gerar APK

### Produção: Voryn 1.8

O usuário confirmou a migração para uma nova instalação principal porque a chave da versão 1.6 ficou indisponível no computador do curso. O identificador de produção passa a ser `com.voryn.mobile`, com nome **Voryn**; o namespace Java/Kotlin continua `com.voryn.app`. Isso permite manter instalados o Voryn 1.6 e o Voryn Teste durante a transição, sem desinstalar ou apagar seus dados locais. A versão 1.8 usa código 10 e a chave permanente descrita abaixo.

O script `npm run android:release` exige uma chave dedicada e executa `assembleRelease`, sem assinatura de debug. A chave e a configuração privada foram criadas em `~/.android/voryn-production/`, fora do repositório, com acesso restrito ao usuário Windows. A configuração é `signing.json`; a localização alternativa pode ser informada por `VORYN_SIGNING_CONFIG`. O script carrega os dados somente no processo do build e restaura o ambiente ao terminar. Nunca versionar os arquivos dessa pasta. Guarde uma cópia completa em armazenamento privado externo; perder essa chave impede futuras atualizações dessa nova instalação.

O APK assinado fica em `android/app/build/outputs/apk/release/app-release.apk`. Conferir identificador, versão, assinatura e conteúdo antes de atualizar o manifesto e a página pública. Guarde uma cópia da chave fora deste computador. Distribua a nova instalação ao lado dos apps antigos até confirmar que os dados locais pendentes foram sincronizados.

Na migração, entrar com a mesma conta recupera os dados já sincronizados. Registros locais pendentes dos apps antigos precisam ser sincronizados neles; não existe cópia automática entre identificadores Android.

### APK de teste das animações (1.7.1-preview)

O arquivo `public/downloads/voryn-1.7.1-preview.apk` é uma compilação debug identificada como **Voryn Teste**, pacote `com.voryn.app.preview`, código 9. Instala separadamente do Voryn 1.6 e atualiza por cima do Voryn Teste anterior (código 8), pois mantém seu identificador e certificado. Entre com sua conta e conceda as permissões necessárias nessa instalação. Registros locais pendentes do aplicativo original não são copiados para o app de teste.

A primeira preview saiu incorretamente com o servidor `http://127.0.0.1:54321` de `.env.local`, causando erro de conexão no login. A 1.7.1-preview contém a URL e a chave pública do projeto real; o endpoint de autenticação e o CORS para `https://localhost` foram verificados. O link web antigo redireciona para o APK corrigido.

A chave original da versão 1.6 não estava disponível nesta máquina. O certificado local difere do APK publicado; por isso o arquivo de teste usa outro identificador e não substitui a versão instalada. O manifesto de atualização e a página principal de download continuam em 1.6. Para atualizar o app original por cima, é necessária a chave original.

Para reproduzir o teste no Windows, com Java 21 e Android SDK configurados:

```powershell
npm run android:sync
Push-Location android
try { ./gradlew.bat assembleDebug -I ../scripts/android-preview.init.gradle } finally { Pop-Location }
```

O resultado fica em `android/app/build/outputs/apk/debug/app-debug.apk`. O init script muda somente o build solicitado; a configuração normal permanece `com.voryn.app`. Preserve a chave de debug local para futuras atualizações da instalação de teste; ela não é versionada no repositório.

Metadados, SHA-256 e verificações: `docs/android-preview.json`. Build nativo, assinatura v2, versão, identificador e conteúdo do ZIP foram conferidos. Verificou-se também a configuração realmente empacotada e a resposta da API de autenticação à chave pública. Instalação e login com conta real em celular físico ainda dependem do teste do usuário.

### Ambiente de compilação

1. Instale Node.js 22+, Java 21 e Android Studio 2025.2.1 ou superior com SDK 36.
2. Execute `npm ci`.
3. Crie `.env` a partir de `.env.example` e preencha a URL e a chave pública do Supabase. Nunca use a chave service-role no aplicativo.
   O Vite também carrega `.env.local` em produção. Se esse arquivo aponta para um servidor de desenvolvimento, configure os valores reais em `.env.production.local` (ignorado pelo Git), que tem prioridade. O script Android valida o ambiente antes do build e rejeita URLs locais, placeholders e chaves não públicas. Verificação: `node scripts/validate-native-env.mjs`; testes da proteção: `node --test scripts/__tests__/native-config.test.mjs`.
4. No SQL Editor do projeto Supabase existente, copie de `supabase/schema.sql` apenas o bloco **SAÚDE — HEALTH CONNECT (ANDROID)**, até **FIM SAÚDE — HEALTH CONNECT**, e execute. Ele pode ser reaplicado sem apagar registros. Para um projeto novo, esse bloco já faz parte do schema completo. O arquivo `supabase/migrations/20261022_health_connect.sql` contém o mesmo SQL como alternativa; não é necessário executar os dois.
   Para a versão 1.4, execute também o bloco **REGISTROS MANUAIS DE SAÚDE**, até **FIM REGISTROS MANUAIS DE SAÚDE**, no final do mesmo `schema.sql`. A alternativa equivalente é `supabase/migrations/20261022_health_manual_entries.sql`.
5. Execute `npm run android:sync` e `npm run android:open`.
6. No Android Studio, gere um APK debug ou, no Windows, execute `npm run android:apk` com o SDK configurado em `ANDROID_HOME` ou `android/local.properties`.

O APK debug estará em `android/app/build/outputs/apk/debug/app-debug.apk`. É uma versão de teste, não uma distribuição assinada de produção. A geração pelo script Android é bloqueada se a configuração efetiva não contém um backend HTTPS público e uma chave pública Supabase.

### Versão 1.6: abertura do aplicativo

Ao iniciar pela rota `/`, uma sessão recuperada abre diretamente `/app`.
Sem sessão, o aplicativo Android abre `/login`. A landing page continua
disponível para visitantes anônimos do site. A recuperação da sessão termina
antes da escolha da tela. Instale o APK 1.6 por cima da versão anterior para
preservar registros locais. Esta correção não exige alterações no Supabase.

### Download pelo site

A página pública `/download` oferece `public/downloads/voryn-1.6.apk`, com
instruções e identificação de versão de teste. Links aparecem na landing,
login e perfil web; a promoção fica oculta no app nativo. O arquivo é a mesma
compilação debug 1.6 já validada, não uma versão assinada de produção.
O deploy web normal copia o APK para `dist/downloads`. A Vercel configura
MIME Android e download como anexo; o Service Worker não trata essa pasta
como navegação e não inclui APKs no precache.

Para disponibilizar outra versão, copie o APK validado para
`public/downloads/voryn-VERSAO.apk`, atualize a página de download e publique
ambos juntos. Arquivos APK dessa pasta são artefatos de distribuição
intencionalmente versionados; não publique keystores nem arquivos `.env`.
`npm run android:sync` remove os downloads web dos assets gerados do Android,
evitando embutir um APK dentro de outro. Prefira esse script a chamar `cap sync`
diretamente. O download depende da conclusão do deploy da Vercel.

## Usar a integração

No Android, abra **Mais → Saúde → Conectar / alterar permissões**. Escolha as categorias desejadas no Health Connect. No Samsung Health, autorize o compartilhamento com o Health Connect. Em Android 9–13, instale o provedor Health Connect; em Android 14+, ele integra o sistema, sujeito à compatibilidade do dispositivo.

O Voryn lê passos, duração de sono, energia de alimentação, hidratação e último peso de cada dia dos últimos sete dias. Valores ausentes aparecem como “—”, sem inventar registros. Passos e demais totais usam a API de agregação; peso usa paginação e seleciona a medição mais recente. O sono é distribuído pelo intervalo diário do fuso do celular, não agrupado pela noite de despertar.

A Home inclui os cartões de saúde no final, depois das métricas de treino. Cada categoria possui uma rota independente: `/app/health/steps`, `/app/health/sleep`, `/app/health/nutrition`, `/app/health/water` e `/app/health/weight`. A rota `/app/health` concentra apenas conexão, fontes e ações sobre os resumos importados. Os valores de hoje são separados dos dias anteriores; peso mostra o registro mais recente disponível. As metas pessoais de passos, água e sono são editáveis e ficam localmente por usuário.

Cada categoria permite adicionar, editar e excluir registros manuais dos últimos 30 dias. Água tem atalhos de +250/+500 ml; alimentação registra refeições, calorias, descrição e nutrientes opcionais; sono registra início e fim (até 24 horas); passos registra o total diário; peso registra medições. Os formulários informam que os dados serão salvos na conta. IDs estáveis evitam duplicações ao repetir um envio que falhou na rede.

Quando existem registros manuais para uma categoria/data, eles substituem seu total importado, sem somar as duas fontes. Água e alimentação somam os lançamentos manuais; passos, sono e peso usam o lançamento manual mais recente. Excluir todos os lançamentos manuais da categoria/data faz reaparecer o dado importado. Esse comportamento é informado nas telas. Os registros manuais não são escritos de volta no Health Connect.

Na versão 1.3, as quatro categorias de totais são agregadas em uma chamada por dia para reduzir limites do provedor. A leitura de peso encerra a paginação tanto com token nulo quanto vazio. Em Android 14+, “Abrir Health Connect” leva às permissões do próprio Voryn. Erros informam a etapa de conexão/leitura; há limite de tempo e opções para tentar novamente, instalar/atualizar o provedor ou abrir permissões.

A leitura do Health Connect ocorre ao entrar nas telas de saúde, voltar a elas e tocar em sincronizar. A contagem própria de passos da versão 1.5 pode continuar em segundo plano quando ativada pelo usuário. Alimentação, água e peso não são detectados automaticamente pelo celular.

Os dados importados são exibidos em memória por padrão. O botão **Salvar resumos importados na conta** autoriza o envio daquele conjunto ao Supabase. Consultas sem valores não habilitam o salvamento. As duas tabelas de saúde têm RLS por proprietário; este módulo não fornece leitura para treinadores. Resumos já salvos são consultados quando necessário. Uma gravação substitui os resumos da janela de sete dias, inclusive valores ausentes e categorias revogadas; registros manuais são mantidos separadamente. As respostas das duas tabelas são excluídas do cache persistente do Service Worker.

**Excluir resumos importados** remove os resumos da conta, preservando os lançamentos manuais e o Health Connect. Cada lançamento manual é excluído na tela da categoria. Para revogar o acesso, use **Abrir Health Connect**.

Na versão 1.4, **Verificar dados na fonte** consulta amostras de registros brutos por categoria nos últimos sete dias, mostrando se a permissão existe, se há registros e de qual aplicativo vieram. A presença de permissões não garante dados. Em caso de retorno vazio, confira a autorização de escrita do Samsung Health e os registros disponíveis dentro do próprio Health Connect. Esse diagnóstico não grava os registros brutos na nuvem.

## Validação em dispositivo

### Versão 1.5: uso apenas com celular

- **Passos → Ativar contagem automática:** usa `TYPE_STEP_COUNTER`, com autorização de atividade física e serviço Android do tipo `health`. Uma notificação permite pausar. Não usa GPS nem internet. Os totais ficam no armazenamento privado do Android, separados por conta. O primeiro evento estabelece uma referência; não importa passos anteriores à ativação. Em uma mudança de dia, o intervalo sem eventos suficientes é descartado, sem distribuir passos inventados. Há tentativa de retomada após reinício; restrições do Android/Samsung ou forçar parada podem exigir reabrir o aplicativo. Sair da conta pausa o serviço.
- A fonte telefone substitui o total do Health Connect nas datas em que há contagem local. Um total manual substitui ambos. Não são somadas fontes sobrepostas. Os passos nativos permanecem neste aparelho; o botão de salvar resumos importados envia somente os dados do Health Connect.
- **Sono → Autorizar sugestões:** requer acesso especial aos dados de uso nas configurações do Android. Examina somente eventos de tela ligada/desligada dos últimos oito dias, buscando o maior intervalo noturno de 3–14 horas, encerrado até meio-dia. Não retém nomes de aplicativos. A sugestão aparece como estimativa e precisa ser conferida no formulário; não vira sono automaticamente. Não mede estágios, ronco, frequência cardíaca ou oxigenação. O temporizador “Vou dormir/Acordei” guarda os horários mesmo offline.
- **Registros offline:** lançamentos manuais e exclusões ficam no armazenamento local da WebView por usuário. Uma fila com IDs estáveis sincroniza apenas sob a sessão do mesmo usuário; novas tentativas não duplicam registros. Exclusões pendentes têm prioridade sobre respostas antigas do banco. A fila tenta novamente ao abrir/atualizar uma tela de saúde e quando a internet retorna. A sessão autenticada e a tela já acessível são necessárias; o login inicial e a recuperação do perfil continuam dependendo da conexão. Não se promete abrir uma sessão expirada sem internet. Limpar os dados do aplicativo apaga registros locais ainda não sincronizados.
- **Alimentação:** seis refeições, calorias e macronutrientes, biblioteca pessoal de alimentos por 100 g, cálculo por porção, composição com vários alimentos e repetição de refeições recentes. A biblioteca é local e contém dados cadastrados pelo próprio usuário; não é o catálogo proprietário da Samsung. Não há leitura de rótulos/fotos, câmera de código de barras nem base externa nesta versão.
- **Metas:** passos, sono, água, calorias e peso desejado, editáveis nas próprias telas e guardadas por usuário neste aparelho. Histórico de 7/30 dias mostra somente os dados disponíveis; a importação do Health Connect permanece limitada a 7 dias.
- Não exige um novo bloco SQL além dos dois blocos de saúde já existentes no `schema.sql`. O armazenamento nativo, a fila, a biblioteca e as metas são locais.

Compilação e testes automatizados não substituem validar os sensores, permissões, reinício e bateria no Samsung físico. Não há garantia de paridade integral com Samsung Health. Veja [pesquisa e limites](docs/SAUDE-CELULAR.md).

- Instalar o APK e entrar com uma conta real; conferir a migração e a configuração do Supabase.
- Conceder apenas passos; confirmar que as demais categorias ficam sem dados. Depois autorizar outras categorias.
- Comparar totais com Health Connect, incluindo duas fontes de passos e sono que atravessa meia-noite.
- Revogar uma categoria, voltar ao aplicativo e confirmar que ela não é lida.
- Testar ausência/atualização do provedor e ausência de registros.
- Autorizar gravação na conta e verificar que outra conta não consegue ler, atualizar ou apagar esses resumos pelas APIs.
- Excluir os resumos e confirmar que os registros no Health Connect continuam presentes.

## Publicação

O launcher usa o logo existente com fundo roxo opaco em um ícone adaptativo Android, com variantes normal e redonda. As imagens de compatibilidade usam o mesmo logo; o símbolo branco transparente não é utilizado sozinho como ícone do launcher.

Antes da distribuição de produção, configure a assinatura e o identificador definitivo do aplicativo. Configure no Supabase as origens e URLs de redirecionamento utilizadas pelo APK, inclusive os fluxos de email e recuperação de senha. Links recebidos fora do aplicativo continuam usando o fluxo web existente; universal/app links não foram configurados.

Para Google Play, declare as permissões de saúde utilizadas e publique uma política de privacidade que corresponda ao tratamento implementado. A Activity nativa `HealthPrivacyActivity` atende aos intents de justificativa de permissões do Android 9–13 e Android 14+. Mantenha seu texto alinhado à política publicada. O cadastro e a aprovação no Google Play não são realizados por esta implementação.

Referências: [Capacitor](https://capacitorjs.com/docs/getting-started), [Health Connect](https://developer.android.com/health-and-fitness/health-connect/get-started), [Samsung Health](https://developer.samsung.com/health/health-connect-faq.html).
