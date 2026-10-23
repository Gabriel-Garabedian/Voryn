# Continuidade do Voryn

Atualizado em 22/10/2026. Registro persistente para retomar o projeto em outra sessão.

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

## Como manter

- Ao concluir trabalho relevante, atualizar data, decisões, resultado e pendências.
- Separar fatos verificados agora de evidências herdadas de relatórios anteriores.
- Registrar verificações e seus limites; nunca registrar senhas, tokens ou dados pessoais de terceiros.
- Substituir informação obsoleta e manter o resumo curto; detalhes devem permanecer na documentação específica.
