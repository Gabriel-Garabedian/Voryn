# Voryn agent instructions

## Session continuity

- At session start, read [docs/CONTEXTO.md](docs/CONTEXTO.md) before asking the user to repeat prior work.
- After meaningful work, update that file with decisions, changed files, checks actually performed, and remaining tasks. Preserve unrelated history and never store credentials.
- For past skill setup, consult [docs/SKILLS.md](docs/SKILLS.md) and `docs/skills-sources.json`; verify installed files before claiming their current state.

- Product language: Brazilian Portuguese. Preserve existing themes, design tokens, and mobile behavior.
- Use npm and `package-lock.json`. Detect installed dependency versions before using newer APIs; this is React + Vite + Capacitor, not Next.js or React Native.
- Read the relevant section of [CLAUDE.md](CLAUDE.md) for architecture and domain invariants. Preserve that file as project memory; do not replace it with a symlink.

## Commands

Run from the repository root and choose checks relevant to the change.

| Purpose | Command |
| --- | --- |
| Development | `npm run dev` |
| Focused tests | `npm test -- src/__tests__/<file>` |
| Lint errors | `npm run lint -- --quiet` |
| Web build | `npm run build` |
| Native sync | `npm run android:sync` |
| Debug APK | `npm run android:apk` |

## Domain boundaries

- Reuse services in `src/services/`; keep UI gates and database authorization separate.
- Use `localDateKey`/`localDateStart` from `src/utils/helpers.js` for local calendar dates.
- Keep user ownership and pending local edits intact during synchronization. Do not clear storage or uninstall the app as a routine debugging step.
- Keep secrets out of browser code, logs, examples, and commits. Check credential presence without printing values.
- Database changes use reviewed files in `supabase/migrations/` plus the canonical `supabase/schema.sql`. Do not mutate a remote database solely to generate a migration.
- A web build or mocked plugin does not verify an Android build/device. Report the actual platform boundary tested.

## References

- Native setup: [ANDROID.md](ANDROID.md).
- APK distribution and update notices: [docs/ANDROID-UPDATES.md](docs/ANDROID-UPDATES.md).
- Health measurement boundaries: [docs/SAUDE-CELULAR.md](docs/SAUDE-CELULAR.md).
- Agent skill setup and dependency status: [docs/SKILLS.md](docs/SKILLS.md).
