# Voryn Copilot Context

Voryn is a Portuguese (Brazil) fitness-tracking SaaS built with React 18, Vite,
Tailwind CSS, Supabase, and Vitest. The primary student experience lives under
`src/views`, reusable UI under `src/components`, Supabase access under
`src/services` and `src/lib`, and database changes under `supabase/`.

## Project invariants

- Keep user-facing copy in Brazilian Portuguese unless the task explicitly
  requests another language.
- Keep Supabase service-role keys and other secrets in Edge Functions or
  environment variables; never put them in browser code.
- Preserve the existing mobile-first visual language and CSS variables.
- Reuse existing services and helpers before adding new data access patterns.
- Treat workout, body, and health data as sensitive. Do not infer medical
  diagnoses; escalate medical guidance to a qualified professional.
- Run the smallest relevant checks after changes: `npm run lint`, `npm test`,
  or `npm run build`.

## Included Agency agents

The complete set of 267 agent files currently present in the source divisions
is available under `.github/agents/`. These project-local agents are adapted from
[`msitarzewski/agency-agents`](https://github.com/msitarzewski/agency-agents),
which is MIT-licensed:

Use any agent by its frontmatter `name`; the catalog includes engineering,
design, product, research, security, testing, healthcare, marketing, and other
specialized divisions. The files remain development instructions only and are
not bundled into the Voryn application.

Activate one explicitly when useful, for example:

> Activate Frontend Developer and implement this React view in Voryn.

> Use the Behavioral Nudge Engine to design a single actionable reminder for
> the home screen, respecting the user's notification preferences.

The included agents are guidance for development and product decisions. They
are not a runtime dependency and must not be exposed as an in-app health
advisor without an appropriate backend, consent, and safety review.
