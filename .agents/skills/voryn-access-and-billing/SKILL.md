---
name: voryn-access-and-billing
description: Review or modify Voryn student, trainer, and admin access, trial and subscription entitlements, Supabase RLS, or Mercado Pago recurring-payment and webhook behavior. Use for access bugs and billing integration changes.
---

# Voryn access and billing

Start from the reported access decision or payment transition. Read the relevant code and current provider documentation before changing contracts. The Supabase functions run on Deno; Node/Express snippets need adaptation.

## Map the decision

- Session/profile/plan: `src/context/AuthContext.jsx`.
- Route and UI gates: `src/App.jsx` and `src/components/PaywallGate.jsx`.
- Student-through-trainer access: locate `student_has_trainer_access` in `supabase/schema.sql` and callers before changing entitlements.
- Client payment requests: `src/services/payment.js`; database services: `src/services/index.js`.
- Recurring flow: `supabase/functions/create-preference/index.ts`, `mercadopago-webhook/index.ts`, and `cancel-subscription/index.ts`.
- Canonical database: `supabase/schema.sql`; incremental changes: `supabase/migrations/`.

## Preserve the trust boundaries

- Route visibility is not database authorization. Check RLS/RPCs with the actual caller's identity, including ownership and trainer/student relationship.
- Public signup metadata must not grant administrator access. Service-role and payment secrets stay server-side; never put them in `VITE_*` configuration or print credential values.
- A checkout redirect, locally selected plan, or unsigned webhook is not proof of an active subscription. Trace the provider status lookup and mapping to stored entitlements.
- Verify webhook signature parsing, canonicalization, and comparison against current official documentation for the product in use. Treat a secret's absence as failure. Do not copy a generic payment example over an existing recurring-subscription handler.
- Examine retries, duplicate delivery, out-of-order events, and partial failures. Recording an event before processing is not by itself proof that retrying a failed handler is safe; trace event status and deduplication keys through completion.
- Cancellation and upgrades must not leave duplicate recurring agreements or silently restore a trial. Do not alter prices, existing subscriptions, or trial policy outside the requested change.

## Validate

Write an access matrix for the changed behavior using synthetic identities: student owner, unrelated student, linked trainer, unrelated trainer, admin, and anonymous caller. Add active/trial/expired/pending/canceled states only where relevant to the feature.

Use isolated local/test database fixtures or provider test accounts for integration checks. If credentials or a test database are unavailable, test pure mapping/validation logic and explicitly mark RLS/provider delivery unverified; mocked query success does not prove RLS. Do not trigger real charges, cancel real subscriptions, apply production SQL, or send notifications unless that operation is part of the current authorization.

For schema changes, keep migrations and the canonical schema aligned. Report the concrete failing access/payment transition, its fix, and evidence at each verified boundary. This workflow does not certify LGPD compliance.
