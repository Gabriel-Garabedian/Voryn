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

Use Node.js 22+ for the Android/Capacitor 8 toolchain and the package scripts from `package.json`:

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

## Android and health delivery — 2026-10-22

### Startup correction — Android 1.6

#### Website APK distribution

- `/download` is a public installation page, linked from the landing hero,
  login card, and authenticated web profile. `AndroidDownloadLink` hides these
  promotions inside native Capacitor. The page labels the APK as a test build,
  explains Android 9+, same-account login, installing over the existing app,
  and phone-only health limitations.
- `public/downloads/voryn-1.6.apk` is an intentional distribution artifact,
  byte-identical to the validated local debug APK. This is the sole exception
  to the general rule below against committing generated APKs. No signing
  keystore, private credentials, or environment files should be committed.
- Website builds serve this static file. Vercel headers specify Android APK
  MIME and attachment disposition. Workbox excludes `/downloads/` from SPA
  navigation fallback; APKs are outside its precache glob.
- `android:sync` now runs `scripts/prepare-native-assets.mjs` after Capacitor
  sync to remove website downloads from generated native assets. This prevents
  recursive APK embedding/size growth. Keep this step for future native builds.
- To publish a newer APK, update the versioned file and download page together.
  Git push alone does not establish whether Vercel finished deploying.
- Download validation: nine focused download/startup tests and ESLint passed;
  production web build passed. Browser download from the production preview
  matched the original APK SHA-256, with no JS errors or horizontal overflow
  at mobile/desktop sizes. Verified the APK exists in web build output and is
  absent from native generated assets and the Workbox precache.

- The root route previously rendered LandingPage even after restoring a valid
  session, so reopening the installed app showed the public site. `App.jsx`
  now waits for AuthContext loading as before, then redirects `/` to `/app`
  for authenticated users on web and native. Native users without a session
  go to `/login`; anonymous web visitors still see the landing page.
  Redirects use replacement, preserving existing profile/access checks.
- Android versionName is now **1.6**, versionCode **7**. Install over the
  existing app to preserve local pending records; no SQL changes are needed.
- Six startup regression tests plus six authentication lifecycle tests passed,
  and focused ESLint passed. This fix changes navigation, not session expiry,
  subscriptions, or the sensor-validation limitations documented below.
- Version 1.5 implementation/history follows; use the newest generated APK
  `android/app/build/outputs/apk/debug/voryn-1.6.apk` for the startup fix.

The project now includes a Capacitor 8.5.3 Android app (`com.voryn.app`),
versionName **1.5**, versionCode **6**. The existing web app remains deployed
on Vercel. The user uses a Samsung phone only, without a watch or ring. Do not
promise complete Samsung Health parity or sensor readings the phone cannot
provide. Keep health cards at the **end of Home**, after workout metrics,
and preserve separate screens for steps, sleep, nutrition, water, and weight.

Read [Android setup and behavior](ANDROID.md) and
[research, implemented features, and limitations](docs/SAUDE-CELULAR.md)
before extending this module. These documents are part of project memory.

### Android packaging and authentication fixes

- Android builds require Java 21 and SDK 36; minSdk is 28, targetSdk 36.
  `npm run android:apk` builds the web bundle, syncs Capacitor, and assembles
  the debug APK. `android/local.properties` is machine-specific and ignored.
- Bundle current local web assets in the APK; do not point Capacitor to an
  old remote build. Native Android disables the web Service Worker.
- Launcher icons use the existing logo on an opaque purple adaptive
  background. Preserve normal/round and older Android fallbacks.
- `AuthContext` defers profile loading outside `onAuthStateChange` to avoid
  the Supabase session lock. Authentication/profile requests have deadlines;
  missing profiles show `AuthRecoveryScreen` instead of an endless spinner.
  Optional trainer checks/invites must not block account opening indefinitely.
- A confirmed Auth account can lack its `public.users` profile.
  `supabase/repair_student_profile.sql` is a manually targeted repair template;
  it must not recreate existing subscriptions or reactivate canceled plans.
  Email delivery/SMTP and production Auth configuration remain dashboard work;
  an audit event requesting confirmation does not prove email delivery.

### Health structure and source rules

- `/app/health` is the connection/source hub. Independent routes are
  `/app/health/steps`, `/sleep`, `/nutrition`, `/water`, `/weight`.
- `HealthConnectPlugin.kt` reads authorized totals for the last seven local
  days. Steps/sleep/nutrition/hydration use daily aggregation; weight uses
  paginated records and the latest measurement. Empty pagination tokens stop
  iteration. Resume refresh, deadlines, provider/settings handling, and a
  raw-record availability diagnostic are included.
- Permissions alone do not prove data exists. The user's earlier screenshots
  showed active permissions and empty readings; the underlying cause was not
  established. Samsung Health must write into Health Connect. Never report
  the user's actual synchronization as validated without a device test.
- Imported Health Connect summaries are uploaded only by an explicit Save
  action. Empty readings cannot be uploaded. Health REST responses are excluded
  from the Workbox runtime cache. RLS restricts both health tables to their owner;
  this module does not give trainers access to health records.
- `PhoneHealthPlugin.kt`/`StepTrackingService.kt` implement opt-in phone steps
  with `TYPE_STEP_COUNTER`, ACTIVITY_RECOGNITION, a health foreground service,
  persistent pause notification, private per-account daily storage, and boot
  resume attempt. Initial activation establishes a baseline. Ambiguous midnight
  gaps are discarded, not fabricated. Android battery restrictions/force-stop
  can interrupt recording. Signing out pauses the service.
- For each date, phone steps replace Health Connect steps; an explicit manual
  daily total overrides either. Never sum overlapping sources. Phone sensor
  totals remain local and are not included in the imported-summary upload.
- Phone-only sleep uses optional Usage Access screen timestamps to suggest a
  longest overnight interval of 3–14 hours, ending by noon. It does not store
  app names. Suggestions require confirmation/editing before saving. An offline
  bedtime/wake timer is also available. No sleep stages, oxygen, snoring, heart
  rate, or clinical score are inferred from screen inactivity.

### Manual records, nutrition, offline behavior, and goals

- `healthRecords.js` validates records and merges sources. Manual water and
  food entries sum per local date. Steps, sleep, and weight use the latest
  manual entry. Manual entries override imported totals for that category/date;
  deleting all manual entries restores the available underlying source.
- `healthOffline.js` persists manual entries and deletion tombstones per user
  in WebView localStorage. Stable IDs, operation tokens, and revision checks
  prevent duplicate retries, acknowledgement of newer edits by older requests,
  and resurrection by stale cloud reads. Sync requires the same authenticated
  user. Reattempts occur on health refresh and the browser online event.
- Local saves happen before network writes; pending synchronization is shown.
  Storage failures must be surfaced. Clearing app data loses unsynced records.
  Initial login/profile loading still requires internet; expired offline
  sessions and offline cold starts are not guaranteed. Native step recording,
  once enabled, does not require internet or the web interface to remain open.
- Nutrition supports six meal slots, calories, optional protein/carbs/fat,
  descriptions, create/edit/delete, repeat recent meals, and a per-account local
  food library. Values entered per 100 g scale to portions; multiple foods can
  fill a meal form. Unknown nutrients remain null, never zero estimates.
  This is a user-created library, not Samsung's proprietary food database.
- Goals for steps, water, sleep duration, calories, and desired weight are
  personal editable examples, stored locally by account. Historical charts
  support 7/30 days of available data; Health Connect imports remain seven days.
- Not yet implemented: external food catalog, barcode/photo recognition,
  micronutrients, detailed recipes, scheduled reminders, direct scale
  integrations, body composition, automatic measured sleep, or full parity.

### Database, validation, and release status

- `supabase/schema.sql` includes both idempotent health blocks:
  **SAÚDE — HEALTH CONNECT (ANDROID)** and **REGISTROS MANUAIS DE SAÚDE**.
  Matching incremental migrations are `20261022_health_connect.sql` and
  `20261022_health_manual_entries.sql`. Existing production installations should
  apply these blocks/migrations, not blindly rerun unrelated schema setup.
- Tables are `health_daily_summaries` and `health_manual_entries`, with owner
  RLS, numeric/date/sleep constraints, and no anonymous access. Version 1.5
  adds no extra SQL beyond these blocks. No production database write or SQL
  migration execution was performed by the agent; user execution is unconfirmed.
- The local ignored `.env.local` uses the production Supabase URL and public
  publishable key supplied by the user. Never add this file, real keys, SDK
  paths, keystores, build directories, or generated APKs to Git. Configure
  environment variables separately on another computer and in hosting.
- Latest validation: **103 Vitest tests passed**, ESLint with `--quiet`, Vite
  production build, Gradle debug build, APK signature and package/version checks.
  Mocked browser tests covered separate routes, manual create/edit/delete,
  overnight sleep, source precedence, Home ordering, mobile/desktop overflow,
  offline enqueue/reconnect, food portions/unknown macros, and goal saving.
  SQL was previously checked in temporary local PostgreSQL-compatible PGlite
  for reapplication, constraints, owner isolation, anonymous denial, and cascade.
- APK available locally at
  `android/app/build/outputs/apk/debug/voryn-1.5.apk` (debug signing).
  Sensors, background battery behavior, restart, and special permissions have
  **not** been tested on the user's physical Samsung. No Play Store release,
  production signing, SMTP setup, or production deployment was performed.

### Git handoff status

- Implementation and memory committed locally as `c95e1cd` on `main`.
- The initial push returned HTTP 403 because `andre-w-dev` lacked write access.
  The user subsequently authenticated `Gabriel-Garabedian`. Pushing with
  `git -c credential.username=Gabriel-Garabedian push origin main` succeeded:
  implementation `c95e1cd` and handoff `6138635` reached remote `main`.
  Prefer that explicit credential username for future pushes from this computer.
  Do not request passwords/tokens in chat. Vercel deployment status has not
  been checked; a successful Git push does not confirm a successful deployment.
- A portable Git bundle backup is saved locally on the Desktop as
  `Voryn-backup-2026-10-22.bundle`. It contains committed source/history, not
  ignored `.env.local`, signing keys, build outputs, or APKs. Preserve the
  current checkout and its ignored environment configuration separately.
