# Voryn — Project Memory for Claude

## Project identity

Voryn is a Brazilian Portuguese fitness-tracking SaaS for students and
personal trainers. It combines workout logging, routines, progress tracking,
goals, personal-trainer management, communities, friends, messaging,
notifications, subscriptions, and admin operations.

Product language is Brazilian Portuguese (`pt-BR`). Preserve the existing
mobile-first premium visual language, CSS variables, dark/light themes, and
accessible interaction patterns.

## Stack and runtime

- React 18 with Vite and React Router 6.
- Tailwind CSS plus the existing custom CSS/design tokens in
  `src/index.css`.
- Supabase Auth, PostgreSQL, Row Level Security, Storage, Realtime, RPCs, and
  Edge Functions.
- Mercado Pago recurring subscriptions.
- Vercel or Netlify deployment.
- Vitest, Testing Library, ESLint, and Vite production builds.
- PWA support through `vite-plugin-pwa` and Workbox.
- Sentry is optional and configured through environment variables.

Use Node.js 18+ and the package scripts from `package.json`:

```powershell
npm install
npm run dev
npm run lint
npm test
npm run build
```

For a focused validation, prefer `npm run lint -- --quiet`, targeted Vitest
tests, then `npm run build` when bundling or routing changes.

## Repository map

```text
src/
  App.jsx                 Public and protected top-level routes
  components/             Reusable UI, layout, admin, and workout components
  context/                AuthContext and application-wide auth/theme state
  data/                   Static exercise catalog and exercise media metadata
  lib/                    Supabase client and low-level integration helpers
  pages/                  Public pages: landing, auth, pricing, checkout, legal
  services/               Supabase-facing domain services and payment services
  utils/                  Date, streak, formatting, plan-limit, and error helpers
  views/                  Authenticated student, trainer, and admin screens
supabase/
  schema.sql              Canonical complete schema, policies, triggers, RPCs
  migrations/              Incremental migrations for an existing database
  functions/               Supabase Edge Functions
.openclaude/agents/       Voryn-specific Claude/OpenClaude specialist agents
.github/agents/            Agency Agents catalog for development workflows
```

Authenticated application routes are mounted under `/app/*` by
`src/components/layout/AppShell.jsx`. Admin routes are under `/admin/*`.
`AppShell` lazy-loads authenticated views so charts and other heavy code are
not sent to anonymous visitors or users who never open those screens.

## Main domain flows

### Student

1. Register and confirm email.
2. Complete onboarding with training objective and schedule.
3. Use routines, live workout tracking, history, evolution, goals,
   achievements, progress photos, communities, friends, and messaging.
4. Subscription/trial access is enforced by `AuthContext` and `PaywallGate`.

### Personal trainer

1. Register as `personal`.
2. Manage students, routines, assessments, programs, messages, and dashboards.
3. Student access can be granted through an active trainer subscription and the
   `student_has_trainer_access` RPC.
4. Student limits are enforced in PostgreSQL, not only in the UI.

### Admin

Admin access is based on `public.users.role = 'admin'` and protected routes.
Public signup metadata must never be allowed to create an admin. Admin role
changes are intentional database/admin operations.

## Data and service conventions

Use existing services in `src/services/index.js` before adding direct Supabase
queries. Important service areas include:

- `workoutLogService`: logs, metrics, dates, streak inputs, offline queue
- `routineService`: student and trainer routines
- `prService`: personal records
- `assessmentService`: physical assessments
- `messageService`: trainer/student and friend messaging
- `programService`: trainer programs
- `subscriptionService`: subscription operations
- `trainerService` and `trainerDashboardService`
- `communityService` and `friendService`
- `notificationService`, `pushService`, and `offlineSyncService`

Supabase service-role keys, Mercado Pago access tokens, cron secrets, Resend
keys, VAPID private keys, and webhook secrets belong only in Edge Function
secrets/environment variables. Browser code may use only the Supabase URL and
anon key.

## Dates, streaks, and fitness calculations

- Never use `toISOString().split('T')[0]` for a user-facing calendar date.
- Use `localDateKey()` from `src/utils/helpers.js`.
- Use `localDateStart()` for parsing a `YYYY-MM-DD` database date locally.
- Use `calcStreak()` and `calcBestStreak()` as the single streak
  implementation.
- Pass eligible routine dates when rest days should not break a streak.
- Keep date comparisons in the user's local calendar; do not mix UTC
  midnight parsing with local midnight calculations.
- Workout data can be sensitive health/body data. Do not turn product
  features into medical diagnosis or treatment.

## Supabase database and security

`supabase/schema.sql` is the canonical full schema for a fresh or reconstructed
database. Incremental changes belong in numbered files under
`supabase/migrations/` and must be applied to an existing project in order.

Current security invariants:

- New auth users can only become `student` or `personal` through signup
  metadata; `admin` is never accepted from the client.
- End users cannot insert arbitrary `subscriptions`; trusted trigger/Edge
  Function flows create or update them.
- Ownership policies must include both `USING` and `WITH CHECK` where writes
  are allowed.
- Trainer-student updates must preserve trainer ownership.
- Payment events are deduplicated by provider/event type/external ID.
- `payment_events` and `audit_logs` use forced RLS.
- Community membership self-insert is limited to `role = 'member'`.
- Friend invite codes use 16-character hex values; do not reintroduce short,
  enumerable codes.
- RPCs exposed to anonymous users must return the minimum necessary data and
  must not expose complete user/trainer rows.

Security-sensitive database changes require reviewing both `schema.sql` and the
corresponding migration. Do not rely on frontend role checks or hidden UI
controls for authorization.

## Payments

Plans are `student`, `personal`, and `personal_pro`. Display prices are read
from:

```text
VITE_PLAN_STUDENT_PRICE
VITE_PLAN_PERSONAL_PRICE
VITE_PLAN_PRO_PRICE
```

The `create-preference` Edge Function uses trusted server-side values:

```text
MP_PRICE_STUDENT
MP_PRICE_PERSONAL
MP_PRICE_PRO
```

The client never sends or controls the charged price. The Edge Function also
requires configured Mercado Pago preapproval plan IDs and fails closed when a
price or plan is missing. `mercadopago-webhook` validates the webhook
signature, re-fetches the Mercado Pago resource, and ignores duplicate events.

When changing plans or prices, update `.env.example`, frontend deployment
variables, Supabase Edge Function secrets, and Mercado Pago configuration
together. Never commit actual credentials or production secrets.

## Edge Functions and deployment

Edge Functions live in `supabase/functions/<function-name>/index.ts`.
Functions currently include payment, webhook, account deletion, email, push,
and subscription flows. Deploy individual functions after their code changes,
for example:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy create-preference
supabase functions deploy mercadopago-webhook
```

Before `supabase db push`:

1. Confirm the target project with `supabase projects list` or the linked ref.
2. Review pending migrations and database backups.
3. Check for duplicate subscriptions/payment events if a migration changes a
   unique constraint.
4. Apply migrations before deploying functions that depend on them.
5. Configure required secrets in Supabase; do not put them in `.env` committed
   to Git.

## Change and review rules

- Make surgical changes and preserve existing behavior.
- Search for existing helpers/services before adding new logic.
- Keep user-facing copy in Portuguese.
- Surface errors; do not silently convert failures into successful-looking
  results.
- Async effects must have rejection handling and unmount-safe cleanup.
- Timers, animation frames, subscriptions, and event listeners require cleanup.
- Keep heavy views and libraries lazy where possible.
- Avoid adding dependencies unless the dependency manifest must change.
- Do not rewrite unrelated worktree changes.
- Do not reset, checkout, or amend commits without explicit instruction.
- For security reviews, inspect RLS, RPC privileges, triggers, Edge Function
  authentication, and client-controlled metadata together.

## Current project agents

Use the project-local specialists under `.openclaude/agents/` when appropriate:

- `voryn-security-architect`
- `voryn-appsec-engineer`
- `voryn-penetration-tester`
- `voryn-database-optimizer`
- `voryn-backend-architect`
- `voryn-payments-engineer`
- `voryn-api-tester`
- `voryn-performance-benchmarker`
- `voryn-accessibility-auditor`
- `voryn-code-reviewer`
- `voryn-reality-checker`
- `voryn-minimal-change-engineer`

The larger `.github/agents/` Agency Agents collection is development guidance
only. Agents are not runtime dependencies and must never be presented to
Voryn users as medical or financial professionals.

## Important source-of-truth notes

- `src/services/payment.js` is the frontend plan display/configuration.
- `supabase/functions/create-preference/index.ts` is the trusted charge-side
  payment configuration.
- `supabase/schema.sql` is the complete schema source.
- `supabase/migrations/` is the production upgrade path.
- `SETUP.md` contains useful deployment details but may contain older manual
  instructions; prefer the current migration files and package scripts when
  they disagree.
- `.env.example` documents required variable names but contains no secrets.
