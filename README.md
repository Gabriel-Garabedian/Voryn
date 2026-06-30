# ⚡ VORYN SAAS — Guia Completo de Setup

---

## O QUE É ESTE PROJETO

**Voryn** é um aplicativo de academia completo construído com:
- **React + Vite** — interface moderna e rápida
- **Supabase** — autenticação, banco PostgreSQL na nuvem, realtime
- **Tailwind CSS** — design system premium
- **Mercado Pago** — pagamentos recorrentes
- **Vercel/Netlify** — hospedagem gratuita

---

## PASSO A PASSO — DO ZERO AO AR

### PASSO 1 — Instale o Node.js
Baixe em https://nodejs.org (versão 18 ou superior)
Verifique: `node --version`

---

### PASSO 2 — Crie conta no Supabase (grátis)
1. Acesse https://supabase.com e crie uma conta
2. Clique em **"New Project"**
3. Escolha nome (ex: forge-saas), senha forte, região São Paulo
4. Aguarde ~2 minutos para inicializar
5. Vá em **Settings → API** e copie:
   - **Project URL** → vai no VITE_SUPABASE_URL
   - **anon public** → vai no VITE_SUPABASE_ANON_KEY

---

### PASSO 3 — Configure o banco de dados

No Supabase, vá em **SQL Editor → New Query**.

**Primeiro**, cole o conteúdo completo do arquivo:
```
supabase/schema.sql
```
Clique em **Run** e aguarde.

**Depois**, cole o conteúdo de:
```
supabase/migrations.sql
```
Clique em **Run** novamente.

Isso cria todas as tabelas, índices, políticas de segurança e triggers.

---

### PASSO 4 — Configure as variáveis de ambiente

Na pasta do projeto, copie o arquivo de exemplo:
```bash
cp .env.example .env
```

Abra `.env` e preencha:
```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_AQUI
```

---

### PASSO 5 — Desative confirmação de email (IMPORTANTE)

No Supabase, vá em:
**Authentication → Settings → Email Auth**

Desative **"Enable email confirmations"** e salve.

Sem isso, os usuários não conseguem fazer login após o cadastro.

---

### PASSO 6 — Instale e rode localmente

```bash
cd forge-saas
npm install
npm run dev
```

Acesse: http://localhost:5173

A landing page vai abrir. Crie sua conta em /register.

---

### PASSO 7 — Torne-se admin

1. Crie sua conta em http://localhost:5173/register
2. No Supabase, vá em **SQL Editor** e rode:

```sql
UPDATE public.users
SET role = 'admin'
WHERE email = 'SEU_EMAIL@aqui.com';
```

3. Faça logout e login novamente
4. Acesse http://localhost:5173/admin

---

## PUBLICAR ONLINE (deploy gratuito)

### Opção A — Vercel (recomendado)
```bash
npm install -g vercel
npm run build
vercel --prod
```

No painel da Vercel, adicione as variáveis de ambiente:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

### Opção B — Netlify
```bash
npm run build
```
Arraste a pasta `/dist` em https://netlify.com → "Deploy manually"

Adicione as variáveis em **Site settings → Environment variables**.

---

## CONFIGURAR PAGAMENTOS (Mercado Pago)

### 1. Crie conta de desenvolvedor
Acesse: https://www.mercadopago.com.br/developers
Crie um aplicativo e pegue as chaves.

### 2. Crie Edge Function no Supabase
No Supabase, vá em **Edge Functions → New Function**.
Crie uma função chamada `create-payment-preference`.

Código da função (crie o arquivo localmente):
```typescript
// supabase/functions/create-payment-preference/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { planId, userId, userEmail, userName } = await req.json()

  const PRICES = {
    student:      { title: 'Voryn Aluno',       price: 9.90  },
    personal:     { title: 'Voryn Personal',     price: 39.90 },
    personal_pro: { title: 'Voryn Personal Pro', price: 79.90 },
  }
  const plan = PRICES[planId]
  if (!plan) return new Response('Plan not found', { status: 400 })

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`,
    },
    body: JSON.stringify({
      items: [{ title: plan.title, quantity: 1, unit_price: plan.price, currency_id: 'BRL' }],
      payer: { email: userEmail, name: userName },
      metadata: { user_id: userId, plan_id: planId },
      back_urls: {
        success: `${Deno.env.get('APP_URL')}/app?payment=success`,
        failure: `${Deno.env.get('APP_URL')}/app/subscription?payment=failed`,
      },
      auto_return: 'approved',
    }),
  })
  const data = await res.json()
  return new Response(JSON.stringify({ init_point: data.init_point }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 3. Configure secrets na Edge Function
No Supabase → Edge Functions → Secrets:
- `MP_ACCESS_TOKEN` = seu token de produção do Mercado Pago
- `APP_URL` = URL do seu site (ex: https://forge.vercel.app)

### 4. Webhook (para ativar assinaturas automaticamente)
No Mercado Pago, configure o webhook apontando para:
`https://SEU_PROJETO.supabase.co/functions/v1/mercadopago-webhook`

---

## COMO O SISTEMA FUNCIONA

### Fluxo do aluno
1. Acessa a landing page → clica em "Começar grátis"
2. Cria conta (nome, email, senha) → aceita LGPD
3. **Onboarding de 3 passos**: objetivo + dias de treino + confirmação
4. Trial de 7 dias começa automaticamente
5. Usa todas as funcionalidades do plano Aluno durante o trial
6. Recebe aviso antes do trial expirar → assina via Mercado Pago
7. Acesso liberado imediatamente após pagamento

### Fluxo do personal trainer
1. Cria conta escolhendo "Personal Trainer"
2. No admin, você pode mudar o plano para `personal` ou `personal_pro`
3. No app, vai para a aba "Alunos" (em vez de Home)
4. Adiciona alunos pelo email deles
5. Aluno precisa ter conta no Voryn para ser adicionado
6. Personal vê dashboard com todos os alunos, pode criar treinos, avaliações e chat

### Fluxo do admin (você)
1. Acesse /admin com sua conta de administrador
2. Veja métricas: total de usuários, MRR, assinaturas ativas
3. Gerencie usuários: mude roles e planos manualmente
4. Monitore assinaturas e receita

---

## ESTRUTURA DO PROJETO

```
forge-saas/
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx      ← Página inicial comercial completa
│   │   ├── LoginPage.jsx        ← Login + Registro + Reset senha (LGPD)
│   │   ├── PricingPage.jsx      ← Página de preços
│   │   ├── CheckoutPage.jsx     ← Checkout Mercado Pago
│   │   └── legal/
│   │       └── LegalPages.jsx   ← Privacidade + Termos (LGPD)
│   ├── views/
│   │   ├── OnboardingView.jsx   ← 3 passos após cadastro
│   │   ├── HomeView.jsx         ← Dashboard + calendário + quick actions
│   │   ├── RoutineView.jsx      ← Planejador semanal com save na nuvem
│   │   ├── WorkoutView.jsx      ← Tracker ao vivo com rest timer configurável
│   │   ├── EvolutionView.jsx    ← Gráficos de carga, volume e frequência
│   │   ├── HistoryView.jsx      ← Histórico com busca e filtros
│   │   ├── GoalsView.jsx        ← Metas semanais + peso corporal
│   │   ├── AchievementsView.jsx ← 12 conquistas desbloqueáveis
│   │   ├── PersonalView.jsx     ← Área do aluno com personal
│   │   ├── PersonalDashboardView.jsx ← Dashboard do personal trainer
│   │   ├── ProfileView.jsx      ← Perfil + PRs + tema + histórico
│   │   └── SubscriptionView.jsx ← Gerenciar assinatura e planos
│   ├── components/
│   │   ├── ui/                  ← Button, Input, Card, Badge, Modal, etc.
│   │   ├── layout/
│   │   │   └── AppShell.jsx     ← Nav bar + sheet "Mais"
│   │   ├── admin/
│   │   │   └── AdminShell.jsx   ← Dashboard admin completo
│   │   └── PostWorkoutModal.jsx ← Celebração pós-treino
│   ├── context/
│   │   └── AuthContext.jsx      ← Auth global (login, perfil, tema)
│   ├── services/
│   │   ├── index.js             ← Todas as queries Supabase
│   │   └── payment.js           ← Integração Mercado Pago
│   ├── lib/
│   │   └── supabase.js          ← Cliente Supabase configurado
│   ├── utils/
│   │   └── helpers.js           ← Erros PT, formatação, helpers
│   └── App.jsx                  ← Roteamento principal
├── supabase/
│   ├── schema.sql               ← Schema completo (rode PRIMEIRO)
│   ├── migrations.sql           ← Migrações e fix RLS (rode DEPOIS)
│   └── fix_rls.sql              ← Fix de RLS se precisar
├── public/
│   └── manifest.json            ← PWA manifest
├── .env.example                 ← Template variáveis de ambiente
└── README.md                    ← Este arquivo
```

---

## PLANOS E PREÇOS

| Plano        | Preço    | Alunos | Público                    |
|-------------|---------|--------|---------------------------|
| Aluno       | R$9,90  | —      | Quem treina sozinho        |
| Personal    | R$39,90 | 20     | Personal trainer iniciante |
| Personal Pro| R$79,90 | 100    | Personal consolidado       |

---

## FUNCIONALIDADES IMPLEMENTADAS

### ✅ Aluno
- Onboarding guiado (3 passos)
- Dashboard com estatísticas e quick actions
- Calendário de consistência visual
- Visão semanal de treinos
- Planejador semanal (salvo na nuvem)
- Tracker de treino ao vivo
- Timer de descanso configurável (30s–5min)
- Modal de celebração pós-treino
- Gráficos de evolução (carga, volume, frequência)
- Histórico com busca e filtros
- Metas semanais com anel visual
- Peso e composição corporal
- 12 conquistas desbloqueáveis
- Recordes Pessoais (PRs)
- Chat com personal trainer
- Avaliações físicas
- Programas de treino
- Tema claro/escuro
- PWA (instala no celular)

### ✅ Personal Trainer
- Dashboard de alunos
- Adicionar/remover alunos por email
- Chat com alunos
- Registro de avaliações físicas
- Criação de programas de treino

### ✅ Admin
- Dashboard com MRR, usuários, assinaturas
- Tabela de usuários com filtro
- Mudar role e plano de qualquer usuário
- Excluir usuários

### ✅ Sistema
- Autenticação Supabase (login, registro, recuperação de senha)
- LGPD: consentimento no cadastro, política e termos
- Erros traduzidos para português
- Row Level Security no banco
- Trial automático de 7 dias
- Landing page comercial completa

---

## O QUE AINDA FALTA (manual)

### Notificações Push
Para adicionar lembretes de treino, você precisaria:
1. Configurar Firebase Cloud Messaging (FCM) ou OneSignal
2. Solicitar permissão no app
3. Salvar token do dispositivo no Supabase
4. Enviar push via Edge Function agendada

### Exportação CSV
Adicionar botão em HistoryView que gera CSV dos logs usando `papaparse`.

### Relatório PDF automático
Usar biblioteca `jsPDF` ou `react-pdf` para gerar PDF mensal.

### App nativo
Se quiser app na Play Store/App Store no futuro, migre para React Native
usando a mesma estrutura e os mesmos serviços Supabase.

---

## NOTAS TÉCNICAS

- O treino ativo fica em **localStorage** (não Supabase) para velocidade máxima durante o treino
- Todos os outros dados ficam no **Supabase** — sincroniza entre dispositivos
- O chat usa **Supabase Realtime** — mensagens chegam em tempo real
- As políticas RLS garantem que cada usuário vê apenas seus dados
- O admin não tem restrição RLS (acesso total)

---

## SUPORTE

Dúvidas técnicas: abra uma issue ou entre em contato.
Voryn v2.0 · React + Vite + Supabase + Mercado Pago
