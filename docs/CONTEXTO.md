# Continuidade do Voryn

Atualizado em 23/10/2026. Registro persistente para retomar o projeto em outra sessão.

## Preferências do usuário

- Conversar em português brasileiro.
- Consultar os registros disponíveis antes de pedir ao usuário que repita sessões anteriores.
- Registrar trabalho relevante e decisões para permitir continuidade entre sessões.

## Projeto

- Repositório: `C:/Users/Antonio Pedro/Downloads/voryn/voryn-app`.
- Aplicativo fitness para alunos e personal trainers, com React 18, Vite, Capacitor e Supabase.
- Arquitetura e regras de domínio: `../CLAUDE.md`; instruções operacionais: `../AGENTS.md`.
- Conferir o código e o estado do Git antes de assumir que uma descrição antiga continua atual.

## Instalação de skills recuperada dos registros

- Foram configuradas 26 skills novas: 19 externas globais, uma geral própria (`codex-evidence-check`) e seis próprias do Voryn.
- Lista e instruções de uso: `SKILLS.md`.
- Origens fixadas e adaptações: `skills-sources.json`.
- Inventário global com hashes: `C:/Users/Antonio Pedro/.codex/skills-installation.json`.
- Globais: `C:/Users/Antonio Pedro/.codex/skills`; específicas do projeto: `../.agents/skills`.
- Relatórios originais: `../../.skill-install-20261022/`, incluindo `validation-results.json` e `download-results.json`.
- A pesquisa `../../PESQUISA-SKILLS-VORYN-CODEX.md` foi escrita antes da instalação; não representa o estado atual.
- Os relatórios anteriores registram validação das 26 skills e verificações básicas de Playwright e PDF. Essas verificações não foram repetidas nesta sessão nem comprovam funcionamento do aplicativo em Android.

## Trabalho desta sessão

- Recuperados os registros anteriores de instalação, preservando a documentação existente.
- Criadas instruções de continuidade no perfil do Codex, na pasta do workspace e no repositório.
- Este arquivo passa a registrar o estado do projeto; `SKILLS.md` permanece a fonte da lista de skills, sem duplicação.
- Na tarefa inicial de continuidade, as alterações foram limitadas a instruções e documentação.

## Melhoria de movimento autorizada pelo usuário

- Instaladas seis skills adicionais de GSAP/Motion Design: agora 32 novas ao todo (25 externas globais, uma geral própria e seis do projeto), além das preexistentes.
- Origens, revisão estática e adaptações em `SKILLS.md`, `skills-sources.json` e `MOTION.md`.
- Aplicadas a `src/pages/LandingPage.jsx`, `src/components/ui/index.jsx`, `src/components/ui/Toast.jsx`, `src/index.css` e ao novo `src/utils/motion.js`.
- Página inicial mais rápida, conteúdo inicial sempre visível, modais/notificações sem quique e movimento reduzido respeitado também em mudanças ao vivo.
- Build web, lint dos arquivos JS alterados e oito testes de acessibilidade dos diálogos passaram.
- Roteiro no Edge passou para menu mobile, mudança ao vivo de movimento reduzido, foco/Escape do modal, confirmação e dispensa de notificação em fixture com componentes reais, sem backend.
- Capturas de 1440/768/390 px sem overflow horizontal; o inspetor mantém alertas de estilo preexistentes (títulos longos e roxo da marca).
- Evidências locais em `output/playwright/`; não houve publicação ou build/teste de APK.

## Envio ao Git solicitado pelo usuário

- Usuário autorizou commit/push das mudanças para testar no APK.
- Branch `main`, remoto `origin` em `Gabriel-Garabedian/Voryn`; sincronizados antes do commit.
- Java 21 e Node 24 disponíveis; Android SDK/Android Studio não encontrados nos locais usuais, sem `ANDROID_HOME`, `ANDROID_SDK_ROOT` ou `android/local.properties` configurados.
- Não há workflow `.github/workflows` para geração automática de APK. Configuração Capacitor usa `webDir: dist`, sem servidor remoto para atualizar a interface de um APK já instalado.
- Este envio contém código e documentação; o download público permanece em 1.6/código 7. A próxima compilação está preparada em 1.7/código 8. Um APK novo ainda precisa ser gerado e verificado em ambiente Android antes de atualizar o manifesto público.

## Pendências e limites

### Voryn 1.8 de produção publicado

- Usuário confirmou que não consegue recuperar a chave da versão 1.6 no computador do curso e autorizou tornar uma nova instalação o Voryn principal.
- Configurada a nova identidade `com.voryn.mobile` (namespace nativo continua `com.voryn.app`), versão 1.8/código 10. Nome Voryn; separada tanto da 1.6 quanto da antiga preview `com.voryn.app.preview`.
- Chave RSA de produção criada em `C:/Users/Antonio Pedro/.android/voryn-production/voryn-production.p12`; configuração privada `signing.json` na mesma pasta, ACL restrita ao usuário. Não imprimir nem versionar a configuração. A chave é nova, intencionalmente destinada à nova identidade autorizada.
- Novo comando `npm run android:release` usa `scripts/build-android-release.ps1`, exige a configuração privada, roda validação do backend/sync e `assembleRelease`; restaura variáveis privadas ao concluir. Gradle recusa release sem variáveis de assinatura.
- O usuário liberou espaço em disco. `npm run android:release` concluiu com sucesso; o build web e o Gradle release passaram. O arquivo final é `public/downloads/voryn-1.8.apk`, pacote `com.voryn.mobile`, código 10, versão 1.8, 17.914.718 bytes, SHA-256 `fc58d82827171a313cf23a03d91230073fbeaf1e8f6572bd70a80de72c0eb709`; assinatura v2 e certificado SHA-256 `086b27a7a44b1819958edc9d4dbda4d25573c843053d2212c997898a12930098`. `debuggable=false`.
- Confirmadas integridade ZIP, URL/chave pública corretas dentro do APK, ausência do endpoint local e de APK aninhado. Supabase Auth settings respondeu 200, CORS `https://localhost`, email ativo. Seis testes focados de página de download e atualização passaram; build web final passou.
- Página e manifesto apontam para 1.8 e explicam instalação paralela: a mesma conta recupera dados sincronizados; registros locais pendentes precisam ser sincronizados no app antigo antes de removê-lo. O plugin de atualização agora confere `applicationId`, evitando avisar o Voryn Teste sobre a instalação principal.
- Commit `1bcd66c` enviado para `main`. Deploy Vercel conferido: manifesto público anuncia código 10/versão 1.8/pacote `com.voryn.mobile`; APK baixado do domínio tem 17.914.718 bytes e o mesmo SHA-256 do artefato local. Página web publicada contém o link e a explicação da nova instalação.
- Preservar os apps antigos e seus dados locais. A nova instalação requer login e permissões; só dados já sincronizados aparecem pela conta. Não anunciar atualização por cima do Voryn 1.6 ou da preview antiga.
- Pendências: usuário testar instalação/login no aparelho; guardar uma cópia privada da pasta da chave em outro local seguro. A instalação e o login com conta real no aparelho físico ainda não foram testados nesta 1.8. O usuário confirmou o login na preview 1.7.1; não inferir isso como teste físico da versão de produção.

### Correção do login na preview

- Usuário relatou erro de conexão ao fazer login na primeira preview. Causa comprovada no APK: `.env.local` sobrescrevia `.env` com `http://127.0.0.1:54321` e chave de desenvolvimento.
- Criado `.env.production.local` local/ignorado a partir da configuração real de `.env`, preservando o ambiente de desenvolvimento. Credenciais não foram adicionadas ao Git.
- `scripts/validate-native-env.mjs` passou a rodar antes de `android:sync`: bloqueia backend local, placeholders e chaves não públicas. Quatro testes de regressão em `scripts/__tests__/native-config.test.mjs` passaram; a proteção também foi demonstrada recusando o ambiente defeituoso antes da correção.
- APK corrigido: `public/downloads/voryn-1.7.1-preview.apk`, pacote `com.voryn.app.preview`, código 9, mesmo certificado da preview anterior. Instalar por cima do **Voryn Teste**, sem desinstalar.
- Build web/nativo e assinatura passaram. Conferidas URL/chave efetivamente empacotadas, ausência do endereço defeituoso e integridade do ZIP. API `/auth/v1/settings` respondeu 200 com a chave empacotada e CORS `https://localhost`; POST vazio à rota de senha respondeu 400 de validação, sem tentar uma conta real.
- Metadados atualizados em `android-preview.json`. Não foi testado login com conta real no aparelho. Link antigo da preview redireciona para o arquivo corrigido; versão estável 1.6 permanece.

- Posteriormente ao primeiro push, o usuário pediu geração do APK. O ambiente Android foi preparado e `npm run android:apk` gerou a versão 1.7/código 8 com sucesso.
- SDK local: `C:/Users/Antonio Pedro/.codex/skill-tools/android-sdk`; JDK 21: `C:/Program Files/Java/jdk-21.0.11`. Definir `JAVA_HOME`, `ANDROID_HOME` e `ANDROID_SDK_ROOT` no processo antes de compilar. Não foi instalado Android Studio.
- A chave original do APK 1.6 não foi localizada. Seu certificado SHA-256 é `a155ea8915b785abcdec2c44185a9a5be20127f0f94cdb9f8f1dba05cb01e5c5`; o debug local usa outro certificado. Não distribuir o novo `com.voryn.app` como atualização compatível.
- Gerada e validada a variante separada **Voryn Teste**, pacote `com.voryn.app.preview`, versão 1.7-preview/código 8. Artefato `public/downloads/voryn-1.7-preview.apk`; metadados em `android-preview.json`; reprodução em `../ANDROID.md`.
- Verificados build nativo, assinatura, identificador/versão/rótulo, integridade do ZIP, CSS de movimento empacotado e ausência de APKs aninhados. Não houve instalação em aparelho.
- Download estável e manifesto continuam em 1.6 para não anunciar uma atualização incompatível. A variante de teste instala separadamente, requer login próprio e não migra dados locais pendentes.

- A melhoria aplicada abrange movimento compartilhado e página inicial; não é um redesign completo das telas autenticadas.
- A continuidade depende de os arquivos estarem acessíveis e serem lidos; este registro não é uma transcrição completa das conversas anteriores.
- GitHub/Sentry autenticados e validação em aparelho Android não foram conferidos nesta sessão.

## Etapa inicial de foto, conversas e Spotify — 23/10/2026

Registro histórico: a parte Spotify abaixo foi substituída pelo áudio local, conforme a seção seguinte.

- Implementação local autorizada pelo usuário para as três funcionalidades. Guia e ativação em [COMUNIDADE-E-SPOTIFY.md](COMUNIDADE-E-SPOTIFY.md).
- Perfil permite enviar/trocar/remover foto (JPG/PNG/WebP, até 5 MB), com rollback quando salvar o perfil falha. Avatar reutilizado no cabeçalho, amigos e mensagens. Componentes/serviço novos: Avatar, ProfilePhotoEditor, socialProfiles; integração em ProfileView, AppShell e CommunityView.
- SocialChat substitui os chats duplicados de amigos/comunidades: nome, foto, data/hora, rascunho preservado na falha, bloqueio de envio concorrente e merge do histórico com Realtime sem duplicação. Consulta de identidade restrita a contatos e comunidades, incluindo autores de mensagens antigas.
- TrainingMusic em ProfileView e WorkoutView salva faixa/trecho; serviço Spotify usa OAuth PKCE e estado vinculado à conta. Retorno web em /spotify/callback e Android via página HTTPS /spotify/android-callback → voryn://spotify-callback, com SpotifyAuthPlugin registrado no MainActivity e manifesto. Token curto em sessionStorage, sem Client Secret/refresh persistente; reconectar ao expirar. Supabase não tenta consumir o código OAuth dessas rotas.
- Migração criada pela CLI: supabase/migrations/20261023130746_social_profiles_and_training_music.sql, também refletida em schema.sql: training_music validado, bucket privado avatars e RPC com implementação privilegiada no schema private e entrada pública invoker. delete-user inclui limpeza dos avatares em lotes. .env.example documenta VITE_SPOTIFY_CLIENT_ID; artefatos de banco em output/db-check ignorados.
- Verificações: 24 testes passaram (18 novos e seis existentes de carregamento de autenticação); lint sem erros; build web passou. Código Android/manifesto compilado por :app:compileDebugJavaWithJavac, sem gerar/distribuir APK novo. Sintaxe TypeScript da Edge Function validada por esbuild; runtime Deno não testado.
- SQL executado e reaplicado em PostgreSQL isolado/PGlite 0.5.11 com schemas de apoio mínimos. Testados isolamento de perfis, acesso às fotos, autoria antiga, gravação/remoção própria, bloqueio de anon e validação da música. Script reproduzível: scripts/__tests__/socialProfiles.db.mjs; não é validação integrada do Supabase remoto.
- Fixture no Edge com componentes reais e serviços simulados passou para autoria/foto, falha preservando rascunho, envio sem duplicação e salvar trecho. Capturas 390/768/1440 px nos temas claro/escuro sem overflow. Inspetor final: zero falhas/alertas, com exceção explícita para a cor roxa existente; horários aumentados para 12 px. Evidências em output/playwright/social-*.
- Pendências reais: CLI Supabase retornou AccessTokenRequiredError; migração e Edge Function NÃO foram aplicadas no projeto remoto. Posteriormente, o usuário criou o aplicativo Spotify e forneceu o Client ID público, configurado em .env.local e .env.production.local (ignorados pelo Git); carregamento confirmado nos modos development e production. Novo build web com esse ID concluído; identificador conferido no bundle gerado. Spotify exige Premium para controle e novos apps em desenvolvimento limitam-se a cinco usuários autorizados; aprovação para ampliar é externa. Validar retornos e contas autorizadas no painel Spotify, teste real de OAuth/reprodução/Storage/chat com duas contas, publicação e novo APK continuam pendentes. iOS nativo não implementado. Não houve commit/push/deploy nesta tarefa.

## Música local no aparelho — implementação atual

- Após conhecer as restrições do Spotify, o usuário aprovou substituir a reprodução integrada por arquivo de áudio do celular. Uso e limites em [MUSICA-LOCAL.md](MUSICA-LOCAL.md); o guia antigo COMUNIDADE-E-SPOTIFY.md agora aponta para o fluxo atual.
- Novo src/services/localMusic.js armazena Blob/nome/duração/trecho no IndexedDB por conta, sem upload ou dependência do Supabase. Player compartilhado toca no início escolhido, pausa e reinicia; App.jsx limpa a reprodução ao sair/trocar de conta. AuthContext tenta remover o arquivo local ao excluir a conta.
- TrainingMusic foi adaptado em Perfil/Treino: seletor de áudio até 50 MB, início minutos:segundos validado contra a duração, controles de tocar/pausar/reiniciar/remover e aviso de armazenamento somente neste aparelho. Falha ao salvar preserva a seleção anterior.
- Removidos serviço/testes/callbacks/plugin nativo OAuth Spotify e Client ID dos ambientes locais. Playlist social preexistente permanece. Cadastro externo do Spotify não foi alterado ou excluído.
- A migração social ainda não aplicada em produção foi ajustada, juntamente com schema.sql, para remover a coluna Spotify training_music. Música local não precisa de migração; avatares/chat continuam precisando da migração social e publicação da Edge Function. Teste SQL de escopo/permissões novamente passou em PGlite.
- Verificação real no Edge com WAV de dez segundos e autenticação simulada: persistência após reload, áudio offline com currentTime=1 e paused=false, pausa/reinício, continuidade ao abrir treino e remoção persistente. Seis capturas 390/768/1440 nos dois temas sem overflow. Corrigido aviso indevido de falha ao pausar durante a promise de play; regressão testada. Evidências output/playwright/local-music-*.
- Verificação final desta adaptação: 28 testes passaram (música, chat, fotos e carregamento da autenticação); lint sem erros; build web concluído.
- Não houve publicação, novo APK nem teste físico. Reprodução em segundo plano/tela bloqueada, interrupções e codecs específicos de aparelhos continuam sem validação. O arquivo é local por aparelho/conta e pode ser perdido ao limpar dados ou por políticas de armazenamento do sistema.

## APK 1.9 gerado — aguardando publicação

- Usuário pediu gerar novo APK e perguntou sobre o aviso na versão atual. Gerada release assinada 1.9/código 11 como com.voryn.mobile, mantendo o certificado da 1.8. Arquivo: public/downloads/voryn-1.9.apk; 17.920.202 bytes; SHA-256 3d47ec06c11be71e68472daa4a8e8c8ae8b5e6af2d4b99f91afd71bf9285e32b. Metadados em docs/android-candidate.json; docs/android-production.json continua descrevendo a 1.8 publicada.
- npm run android:release concluiu (build web, validação de ambiente, sync Capacitor, assets sem APK aninhado e assembleRelease). apksigner verificou v2 e certificado SHA-256 086b27a7a44b1819958edc9d4dbda4d25573c843053d2212c997898a12930098, igual ao APK 1.8 conferido. aapt confirmou pacote, versão, rótulo Voryn, Android mínimo 9 e ausência de debuggable.
- Integridade ZIP, backend/chave pública de produção empacotados, ausência do backend local, presença da música local e ausência do OAuth Spotify verificados no APK. Nove testes de atualização/download passaram nesta etapa. Nenhum aparelho conectado no adb; instalação por cima e áudio físico não testados.
- APK 1.8 inspecionado contém endpoint e botão de atualização. Endpoint público consultado ainda anuncia 1.8/código 10. A 1.9 só aparecerá no aviso depois de publicar seu APK e atualizar public/android-release.json e a página de download. Aviso é interno, autenticado, ao abrir/retomar app, com intervalo mínimo de cinco minutos e oculto durante treino; não é notificação com app fechado. Apps legados 1.6/preview não são a mesma instalação.
- Não houve commit/push/deploy nesta etapa. Manifesto e página públicos foram preservados em 1.8; candidato pronto localmente. Fotos/identidade ainda dependem da migração social/Edge Function pendentes no Supabase; música local não depende disso. Não anunciar o conjunto como plenamente operacional em produção antes de resolver essas pendências.

## Deploy 1.9 autorizado

- Usuário pediu publicar a versão para teste. Manifesto e página de download preparados para 1.9/código 11 com o APK já verificado. Instalação por cima da 1.8, preservando pacote/certificado.
- Corrigida a política de conteúdo do Vercel para permitir media-src self/blob, necessária à música local na web. APK nativo não depende desse cabeçalho HTTP.
- Migração/Edge Function social continuam pendentes por falta de autenticação Supabase; publicar frontend/APK não aplica SQL. Música local está disponível para teste sem essa dependência.
- Commit 7fc6740 enviado a main e deploy confirmado: manifesto 1.9/código 11/pacote com.voryn.mobile com cache no-store e CORS *. Download público respondeu 200, 17.920.202 bytes e SHA-256 3d47ec06c11be71e68472daa4a8e8c8ae8b5e6af2d4b99f91afd71bf9285e32b, igual ao APK local. Página de download oferece 1.9; CSP de áudio publicada e conferida. Evidência local: output/playwright/deploy-1.9.json. Metadados de produção/candidato atualizados.
- Link para teste: https://voryn-liard.vercel.app/downloads/voryn-1.9.apk. Na instalação 1.8, o aviso será elegível ao abrir/retomar a área autenticada com internet (intervalo mínimo de cinco minutos; oculto no treino). Não testado em aparelho físico. Fotos e identidade ainda dependem do backend pendente.

## Como manter

- Ao concluir trabalho relevante, atualizar data, decisões, resultado e pendências.
- Separar fatos verificados agora de evidências herdadas de relatórios anteriores.
- Registrar verificações e seus limites; nunca registrar senhas, tokens ou dados pessoais de terceiros.
- Substituir informação obsoleta e manter o resumo curto; detalhes devem permanecer na documentação específica.
