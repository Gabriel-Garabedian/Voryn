---
name: voryn-validation
description: Choose and report proportionate validation for Voryn code changes or release readiness. Use when deciding relevant tests, checking a fix, or distinguishing web, database, and Android verification results.
---

# Voryn validation

Read `package.json` for current scripts and installed versions. Use npm/package-lock and existing Vitest/Testing Library tests; the current project is React 18 + Vite with Vitest 1.x. Do not introduce React 19, Next.js, or newer Vitest APIs without an intentional compatibility change.

Select checks by the changed boundary:

| Change | Useful evidence |
| --- | --- |
| Service, date, fitness calculation | Relevant existing Vitest tests; a regression case when the bug warrants it. |
| Component interaction | Focused Testing Library checks; browser interaction for rendered behavior. |
| Routing, imports, dependencies, packaging | Relevant tests plus `npm run build`. |
| Native plugin/manifest/Gradle | Web checks where relevant, native build, and device check for the changed API. |
| RLS/schema/function permissions | Test against an isolated database with representative caller identities. |
| Public APK/update release | Native version/signature, public metadata/download, and installation continuity. |
| Documentation/skills only | Frontmatter/links/path checks and execution of newly added helper scripts; no app build solely for prose. |

Useful commands from the repository root:

```powershell
npm test -- src/__tests__/healthOffline.test.js
npm run lint -- --quiet
npm run build
```

Substitute the relevant test files. Once required checks pass, reuse that evidence until changes or unresolved concerns justify rerunning. Do not run the full suite repeatedly to support an unrelated documentation edit.

Before closing a task, inspect `git diff --check` and the diff for unintended edits. State the changed behavior, checks actually run and their results, and any material unverified boundary. A web build, mocked native bridge, passing lint, and actual APK installation prove different things. Do not convert a previous task's check into evidence for new code.

For reversible low-impact edits, a direct inspection can be sufficient; avoid adding tests that merely compare generated wording or repeat the implementation. New reusable helper scripts must be executed, including a meaningful failure mode when applicable.
