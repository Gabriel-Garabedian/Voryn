# 🔥 Voryn v4 — Guia Completo de Deploy

## Status do projeto: 9.0/10 — Pronto para lançamento com as etapas abaixo

---

## 1. PRÉ-REQUISITOS

- Node.js 18+ instalado
- Conta no [Supabase](https://supabase.com) (free tier funciona)
- Conta no [Vercel](https://vercel.com) (free tier funciona)
- Conta no [Mercado Pago](https://mercadopago.com.br) (conta PJ recomendada)
- Conta no [Resend](https://resend.com) para emails (3.000/mês grátis)
- CNPJ real registrado (para colocar no footer antes de escalar)

---

## 2. SUPABASE — BANCO DE DADOS

### 2.1 Criar projeto
1. Acesse https://supabase.com e crie um projeto
2. Escolha região **South America (São Paulo)**
3. Salve a senha do banco

### 2.2 Aplicar schema
1. No painel Supabase → SQL Editor → New query
2. Cole todo o conteúdo de `supabase/schema.sql` e execute
3. Cole todo o conteúdo de `supabase/fix_rls.sql` e execute (se existir)

> **Já tem um banco em produção com este projeto?** O `schema.sql` é
> seguro para rodar de novo por cima de um banco já existente — usa
> `create table if not exists`, `create or replace function`, `create
> index if not exists` e migrations idempotentes (blocos `do $$ ... $$`)
> em todo o arquivo, então não duplica nada nem apaga dados.
>
> Exceção que merece atenção antes de rodar: se você já tem alunos ou
> personais testando, rode esta query **antes** de reaplicar o schema,
> para confirmar que ninguém tem mais de uma linha em `subscriptions`:
> ```sql
> select user_id, count(*) from public.subscriptions
> group by user_id having count(*) > 1;
> ```
> Se retornar alguma linha, decida manualmente qual das assinaturas
> duplicadas manter (apague a outra) antes de continuar — o schema
> adiciona um `unique` em `subscriptions.user_id` que falha se houver
> duplicidade.

### 2.3 Configurar Rate Limiting (CRÍTICO — 2 minutos)
1. Painel Supabase → Authentication → Rate Limits
2. Ative: **"Enable signup rate limiting"** e **"Enable login rate limiting"**
3. Defina: Max 10 tentativas de login por hora por IP

### 2.3.1 Exigir confirmação de email (CRÍTICO — anti-abuso de trial)
1. Painel Supabase → Authentication → Providers → Email
2. Confirme que **"Confirm email"** está **ativado** (é o padrão, mas verifique)
3. Sem isso, o `handle_new_user` no schema.sql não tem efeito nenhum: o
   Supabase já entrega `email_confirmed_at` preenchido no cadastro, o
   trial de 14 dias libera na hora, e qualquer email descartável volta a
   funcionar para criar contas infinitas. **Verifique este passo antes de
   testar o cadastro** — se o EmailConfirmGate nunca aparecer para uma
   conta nova, é sinal de que esta opção está desligada.
4. Em Authentication → URL Configuration, confirme que **Site URL** aponta
   para o domínio real de produção (ex: `https://vorynapp.com.br`) — é
   esse domínio que vai no link de confirmação enviado por email.

### 2.4 Pegar as credenciais
- Painel → Settings → API
- Copie: `Project URL` e `anon public` key

---

## 2.5 SUPABASE STORAGE (Fotos de Progresso)

No painel Supabase → **Storage** → **New Bucket**:
- Nome: `progress-photos`
- Public: **Não** (privado — URLs assinadas)
- Max file size: 10MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

Depois vá em **Storage → Policies → progress-photos** e adicione:
```sql
-- SELECT (aluno vê suas próprias fotos, trainer vê fotos dos alunos)
create policy "photos_read" on storage.objects for select using (
  auth.uid()::text = (storage.foldername(name))[1]
  or exists (
    select 1 from public.trainer_students ts
    join public.trainers t on t.id = ts.trainer_id
    where ts.student_id::text = (storage.foldername(name))[1]
      and t.user_id = auth.uid()
  )
);

-- INSERT (apenas o próprio aluno)
create policy "photos_upload" on storage.objects for insert with check (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- DELETE (apenas o próprio aluno)
create policy "photos_delete" on storage.objects for delete using (
  auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 2.6 COMO ADICIONAR FOTOS/VÍDEOS DE EXERCÍCIOS

O bucket `exercise-media` já é criado automaticamente ao rodar o
`schema.sql` — diferente do `progress-photos` acima, não precisa criar
manualmente nem configurar policy nenhuma, já vem pronto e público.

**Passo a passo:**

1. Painel Supabase → **Storage** → clique no bucket `exercise-media`
2. Arraste os arquivos (foto ou vídeo) pra dentro — nome do arquivo não
   importa, mas ajuda nomear de forma reconhecível (ex: `supino-reto-1.jpg`)
3. Clique no arquivo já enviado → **Copy URL** (a URL pública, algo como
   `https://SEU-PROJETO.supabase.co/storage/v1/object/public/exercise-media/supino-reto-1.jpg`)
4. Abra `src/data/exercises.js` no seu código, ache o exercício pelo nome
   (ex: procure por `'Supino Reto'`) e cole a URL no campo `media`:
   ```js
   { id:'e001', name:'Supino Reto', ..., media:[
     { type:'image', url:'https://SEU-PROJETO.supabase.co/storage/v1/object/public/exercise-media/supino-reto-1.jpg' },
   ] },
   ```
5. `git add . && git commit -m "feat: fotos do supino reto" && git push`
   — a Vercel atualiza sozinha, sem precisar reaplicar nada no Supabase
   (o bucket já existe, isso é só o link apontando pra ele)

Pode adicionar quantas fotos/vídeos quiser por exercício, na ordem que
aparecem no array — e pode fazer aos poucos, exercício por exercício,
sem pressa. Os que não tiverem `media` continuam mostrando o estado
vazio normalmente, sem quebrar nada.

---

## 3. MERCADO PAGO

### 3.1 Credenciais
1. Acesse https://www.mercadopago.com.br/developers
2. Credenciais → Criar aplicação
3. Copie: `Public Key` e `Access Token`

### 3.2 Webhook (CRÍTICO — segurança)
1. Painel MP → Notificações → Webhooks
2. URL: `https://SEU-PROJETO.supabase.co/functions/v1/mercadopago-webhook`
3. Eventos: marque **Pagamentos** e **Assinaturas**
4. Salve e copie a **Chave secreta do webhook** (MP_WEBHOOK_SECRET)

### 3.3 Criar planos de assinatura
No painel MP ou via API, crie os planos:
- Aluno: R$14,90/mês
- Personal: R$59,90/mês
- Personal Pro: R$99,90/mês

Salve os `preapproval_plan_id` de cada um.

---

## 4. PUSH NOTIFICATIONS (PWA)

### 4.1 Gerar chaves VAPID
```bash
npx web-push generate-vapid-keys
```
Salve a `Public Key` (vai no .env) e a `Private Key` (vai nas Edge Functions).

### 4.2 Notificação automática de mensagem nova (CRÍTICO para o chat funcionar fora do app)

Quando um aluno ou personal envia uma mensagem no chat, uma trigger no banco
(`on_message_created`, em `schema.sql`) chama a Edge Function `send-push`
automaticamente para notificar quem recebeu. Sem este passo, o chat
continua funcionando em tempo real dentro do app, mas **ninguém é
notificado se estiver com o app fechado**.

A trigger lê dois segredos do **Supabase Vault** (não são variáveis de
ambiente normais — são armazenadas dentro do próprio banco, criptografadas).
Configure uma única vez, no painel do Supabase → **Project Settings →
Vault**:

| Nome | Valor |
|---|---|
| `app_url` | `https://SEU-PROJETO.supabase.co` (URL do seu projeto Supabase, não do app no Vercel) |
| `cron_secret` | o mesmo valor que você usou em `supabase secrets set CRON_SECRET=...` no passo 7.3 |

Sem essas duas entradas no Vault, a trigger simplesmente não envia a
notificação (não trava nem dá erro no envio da mensagem em si — só a parte
de notificar quem está fora do app deixa de funcionar).

---

## 5. RESEND (emails semanais)

1. Crie conta em https://resend.com
2. Adicione e verifique seu domínio (ex: vorynapp.com.br)
3. Crie uma API Key e salve como `RESEND_API_KEY`

---

## 5.5 CONFIGURAR SMTP PRÓPRIO NO SUPABASE AUTH (CRÍTICO — antes de testar com pessoas reais)

Isso é **diferente** do Resend acima — aquele é usado pelas Edge Functions
(welcome-email, weekly-email) para emails que O VORYN manda. Este aqui é
sobre os emails que o **Supabase manda sozinho**: confirmação de cadastro,
recuperação de senha. São dois sistemas de email completamente separados,
mesmo usando a mesma conta Resend por trás.

**Por que isso é crítico**: sem configurar isso, o Supabase usa um serviço
de email padrão, gratuito, que tem duas limitações sérias:
- **Só 2 emails por hora, pro projeto inteiro** — não é por pessoa, é
  global. Alguns cadastros de teste em sequência já estouram isso, e a
  mensagem "Muitas tentativas" aparece pra qualquer um tentando se
  cadastrar depois, mesmo com emails diferentes.
- **Só entrega email pra endereços cadastrados como membros da sua
  organização no Supabase** — um aluno ou personal real, com o Gmail
  dele, pode simplesmente nunca receber o email de confirmação, sem
  nenhum erro aparecer pra ninguém.

**Como resolver** (usa a mesma conta Resend que você já tem):
1. No painel do Resend → **SMTP** (na barra lateral) → copie **Host**,
   **Port**, **Username** e gere uma **Password** (é diferente da API Key
   usada nas Edge Functions)
2. Painel Supabase → **Authentication → Emails → SMTP Settings**
3. Ativa **"Enable Custom SMTP"** e preenche com os dados do Resend:
   - Sender email: algo como `noreply@vorynapp.com.br` (precisa ser do
     domínio que você já verificou no Resend)
   - Sender name: `Voryn`
   - Host / Port / Username / Password: os que o Resend te deu no passo 1
4. Salva

Depois disso, os emails de confirmação/recuperação de senha passam a sair
pelo Resend, sem o limite de 2/hora e entregando pra qualquer endereço
real, não só membros da equipe.

---

## 6. CONFIGURAR VARIÁVEIS DE AMBIENTE

### 6.1 Arquivo local (.env.local)
Copie `.env.example` para `.env.local` e preencha:
```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://XXXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_MP_PUBLIC_KEY=APP_USR-...
VITE_VAPID_PUBLIC_KEY=BNtKe...
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_APP_VERSION=4.0.0
```

---

## 7. EDGE FUNCTIONS (Supabase)

### 7.1 Instalar CLI
```bash
npm install -g supabase
supabase login
```

### 7.2 Linkar projeto
```bash
supabase link --project-ref SEU-PROJECT-REF
```
(Project ref: Settings → General no painel)

### 7.3 Configurar secrets das functions
```bash
# Pagamentos (Mercado Pago) — necessários para create-preference e cancel-subscription
supabase secrets set MP_ACCESS_TOKEN="seu-access-token-de-producao-do-mp"
supabase secrets set MP_WEBHOOK_SECRET="sua-chave-secreta-do-webhook"
supabase secrets set MP_PLAN_STUDENT="preapproval_plan_id-do-plano-aluno"
supabase secrets set MP_PLAN_PERSONAL="preapproval_plan_id-do-plano-personal"
supabase secrets set MP_PLAN_PRO="preapproval_plan_id-do-personal-pro"
supabase secrets set APP_URL="https://vorynapp.com.br"

# Autenticação das Edge Functions (validar JWT do usuário que chama create-preference/cancel-subscription)
# Pegue em: painel Supabase → Settings → API → Project API keys → anon public
supabase secrets set SUPABASE_ANON_KEY="eyJhbGci..."

# Email, notificações e push
supabase secrets set RESEND_API_KEY="re_xxx"
supabase secrets set CRON_SECRET="string-aleatoria-longa"
supabase secrets set VAPID_PUBLIC_KEY="a-mesma-public-key-usada-em-VITE_VAPID_PUBLIC_KEY"
supabase secrets set VAPID_PRIVATE_KEY="sua-private-key-vapid"
supabase secrets set VAPID_EMAIL="mailto:contato@vorynapp.com.br"
```

> **Atenção:** `VAPID_PUBLIC_KEY` (secret do servidor, usada por `send-push`) precisa ter o MESMO valor que `VITE_VAPID_PUBLIC_KEY` (variável do client, usada por `pushService.subscribe()`). São duas variáveis com nomes diferentes guardando o mesmo dado — uma del lado do navegador (prefixo `VITE_`, embutida no bundle), outra do lado do servidor (sem prefixo, secret do Supabase). Se elas não tiverem o mesmo valor, o protocolo Web Push rejeita a assinatura.

> **Nota de segurança:** `create-preference` e `cancel-subscription` validam o JWT do usuário que chama a função (via `SUPABASE_ANON_KEY` + token de sessão) antes de processar qualquer pagamento ou cancelamento. Isso impede que alguém forje requisições em nome de outro usuário. Sem essa variável configurada, as funções caem em um fallback usando a service key, que ainda funciona mas não é a configuração recomendada.

> **Importante — `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`:** essas duas são providas automaticamente pelo Supabase a TODA Edge Function do projeto — não precisam (e não devem) ser configuradas manualmente via `secrets set`. Se você não vê elas na lista acima, é intencional, não uma omissão.

### 7.4 Deploy das functions
```bash
supabase functions deploy create-preference
supabase functions deploy mercadopago-webhook
supabase functions deploy weekly-email
supabase functions deploy trial-reminder-email
supabase functions deploy send-push
supabase functions deploy welcome-email
supabase functions deploy cancel-subscription
supabase functions deploy delete-user
```

### 7.5 Criar planos de assinatura no Mercado Pago
1. Acesse: https://www.mercadopago.com.br/subscriptions
2. Criar plano "Voryn Aluno" — R$14,90/mês
3. Criar plano "Voryn Personal" — R$59,90/mês
4. Criar plano "Voryn Personal Pro" — R$99,90/mês
5. Copiar os `preapproval_plan_id` de cada plano e adicionar nos secrets acima

### 7.6 Configurar cron do email semanal
No painel Supabase → Edge Functions → Schedule:
- Function: `weekly-email`
- Schedule: `0 11 * * 1` (toda segunda às 08h BRT)
- Cron do lembrete diário de treino:
  - Function: `send-push`
  - Schedule: `0 14 * * *` (14h UTC = 11h BRT — lembrete de tarde)
- Cron do aviso de trial acabando (envia email + push 3 dias antes do fim
  do trial, uma única vez por pessoa — ver comentário de idempotência em
  `trial-reminder-email/index.ts`):
  - Function: `trial-reminder-email`
  - Schedule: `0 12 * * *` (12h UTC = 09h BRT — roda todo dia, mas só
    processa quem de fato está na janela dos 3 dias finais do trial)

> **Sem este cron configurado, o banner dentro do app (que avisa "seu
> trial acaba em X dias" quando a pessoa abre o Voryn) continua
> funcionando normalmente — ele não depende de cron nenhum, só do próprio
> perfil já carregado. Mas o email e o push, que alcançam quem não abriu
> o app nesses últimos dias, só disparam se este Schedule estiver ativo.**

> **Crítico, fácil de esquecer:** ao criar o Schedule no painel, é preciso configurar o **HTTP Header** `Authorization: Bearer SEU_CRON_SECRET` (o mesmo valor de `CRON_SECRET` configurado no passo 7.3) na própria tela de criação do agendamento. Sem isso, o cron aparece como "ativo" na lista do painel — dando a falsa impressão de que está funcionando — mas toda execução falha silenciosamente com `401 Unauthorized`, porque `send-push`, `weekly-email` e `trial-reminder-email` (indiretamente, via chamadas que ele faz) exigem essa autenticação. Verifique a aba de "Invocations" do Schedule após a primeira execução agendada para confirmar que o status retornado é 200, não 401.

---

## 8. SENTRY (monitoramento)

1. Crie conta em https://sentry.io (plano free: 5.000 errors/mês)
2. Novo projeto → React
3. Copie o DSN e adicione ao `.env.local` como `VITE_SENTRY_DSN`
4. Instale o pacote:
```bash
npm install @sentry/react
```

---

## 9. VERCEL — DEPLOY

### 9.1 Instalar e fazer login
```bash
npm install -g vercel
vercel login
```

### 9.2 Primeiro deploy
```bash
npm run build   # verifique se builda sem erros
vercel          # siga as instruções
```

### 9.3 Variáveis de ambiente no Vercel
Painel Vercel → Seu projeto → Settings → Environment Variables
Adicione todas as variáveis do `.env.local` (sem o prefixo VITE_ em algumas — manter como está).

### 9.4 Domínio customizado
Painel Vercel → Domains → Add → vorynapp.com.br

---

## 10. CHECKLIST PRÉ-LANÇAMENTO

### ✅ Obrigatório antes do primeiro cliente
- [ ] Schema aplicado no Supabase
- [ ] Rate limiting habilitado no Supabase
- [ ] Webhook MP configurado com chave secreta válida
- [ ] Edge Function `mercadopago-webhook` deployada e testada
- [ ] Fluxo completo testado: cadastro → trial → checkout → webhook → acesso ativo
- [ ] SMTP próprio configurado no Supabase Auth (ver seção 5.5) — sem
      isso, alunos/personais reais podem nunca receber o email de
      confirmação, e o limite de 2 emails/hora trava novos cadastros
- [ ] Trial de 14 dias funcionando (verificar `trial_ends_at` no banco após cadastro)
- [ ] Sentry recebendo erros (jogue um erro de teste)
- [ ] CNPJ real registrado e atualizado no footer de LandingPage.jsx
- [ ] Domínio próprio configurado no Vercel

### 🟡 Recomendado antes de escalar
- [ ] Edge Function `weekly-email` deployada e testada
- [ ] Edge Function `trial-reminder-email` deployada e cron ativo (aviso de trial acabando)
- [ ] Chaves VAPID geradas e push funcionando em prod
- [ ] Admin 2FA: Supabase → Auth → MFA (habilitar para admins)
- [ ] Status page: criar em https://instatus.com (grátis)
- [ ] Backup testado: Supabase → Database → Backups

### 🔵 Para quando tiver os primeiros pagantes
- [ ] Conta Resend com domínio verificado
- [ ] Cron de email semanal ativo
- [ ] Monitorar MRR no admin panel
- [ ] Confirmar que preços no adminService batem com MP

---

## 11. COMO TESTAR O FLUXO COMPLETO

```bash
# 1. Instalar dependências
npm install

# 2. Rodar local
npm run dev

# 3. Acessar http://localhost:5173
# 4. Criar conta de aluno → verificar onboarding
# 5. Criar conta de personal → verificar painel de alunos
# 6. Testar link de convite: /register?trainer=UUID-DO-PERSONAL
# 7. Testar checkout com cartão de teste do MP
# 8. Simular webhook do MP com curl:
```

```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=1234,v1=SEU_HASH" \
  -d '{"type":"subscription_preapproval","action":"updated","data":{"id":"SUB_ID"},"status":"active"}'
```

---

## 12. ARQUITETURA DO SISTEMA

```
Browser (React + Vite)
    │
    ├── Supabase Auth (JWT)          → autenticação
    ├── Supabase Database (PostgreSQL) → todos os dados
    │       ├── users
    │       ├── subscriptions
    │       ├── workout_logs
    │       ├── routines
    │       ├── trainer_students
    │       ├── push_subscriptions   ← novo v4
    │       ├── payment_events       ← novo v4
    │       └── audit_logs           ← novo v4
    │
    ├── Supabase Edge Functions (Deno)
    │       ├── mercadopago-webhook  ← valida assinatura HMAC
    │       └── weekly-email         ← cron semanal
    │
    ├── Mercado Pago                  → checkout + assinaturas
    ├── Resend                        → emails transacionais e semanais
    ├── Sentry                        → monitoramento de erros
    └── Vercel                        → hosting + CDN
```

---

## 13. SUPORTE E CONTATO

- Email: contato@vorynapp.com.br
- Status: https://status.vorynapp.com.br (a criar)

---

*Voryn v4 — Junho 2025*

---

## 14. RODANDO OS TESTES

```bash
# Rodar todos os testes uma vez
npm test

# Rodar em modo watch (desenvolvimento)
npm run test:watch

# Ver cobertura
npm run test:coverage
```

Os testes cobrem:
- `helpers.js`: translateError, formatDuration, calcStreak, PLAN_LIMITS, getPlanLimit
- `exercises.js`: 100 exercícios, sem duplicatas, busca por nome/grupo
- `pushNotifications.js`: isSupported, getPermission (mocks de browser API)

