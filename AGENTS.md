# AGENTS.md — Working Agreement for AI Contributors

This file is the contract for any AI agent (Cursor, Codex, Claude Code, Copilot, etc.) working in this repository. Human contributors should follow it too. Read this file **before** doing anything else.

## 1. Documentation Is Source of Truth

The `docs/` folder and `MOU.md` describe what we are building. Code should match the documentation; if they disagree, the documentation wins **and the code is the bug**.

## 2. Always Update Documentation

Any change that affects **any** of the following **MUST** include documentation updates in the same change set (commit / PR):

- Data schemas (Firestore documents, JSON import/export shape)
- Architecture decisions (tech stack, hosting, auth, routing)
- User-visible behavior (screens, controls, flows)
- Feature specs (anything in `docs/features/`)
- Open questions resolved → move them from `docs/open-questions.md` into the relevant doc

**Rule of thumb:** if a future contributor would be surprised by your change after reading the docs, you owe a docs update.

### Where things live

| Topic | File to update |
|-------|----------------|
| Tech stack, hosting, PWA, routing, theme | `docs/architecture.md`, `docs/design/theme.md` |
| Firestore / JSON schemas | `docs/data-model.md` |
| New feature behavior | `docs/features/<name>.md` (create if needed) |
| Patterns for future growth | `docs/extensibility.md` |
| Decisions still pending | `docs/open-questions.md` |
| Dev workflow (emulator, deploy, tests) | `docs/dev/*.md` |
| Working agreement (this file) | `AGENTS.md` |

When adding a new doc, link it from `docs/README.md` and from the root `README.md` table.

## 3. Don't Silently Decide Open Questions

If you encounter an open question while implementing:

1. Check `docs/open-questions.md`.
2. If it's listed and unresolved, **stop and ask the human** (use a chat question, not a guess).
3. If you must pick a default to keep moving, document the chosen default in the relevant doc **and** note it in the PR description.

## 4. Mobile-First, PWA, **Android Primary**

This app targets **Android Chrome / WebView** first. iOS support is incidental — do not spend effort on Safari-only quirks unless the fix is free. Desktop is incidental too.

- Default to portrait, mobile layouts; the manifest locks orientation to portrait.
- Touch targets ≥ 48 dp.
- Never rely on hover.
- Don't break the installed/standalone display mode.
- If a feature requires Wake Lock and Wake Lock isn't supported, **do nothing** (no banner, no warning) — see [docs/architecture.md](docs/architecture.md).
- Default UI language is **Ukrainian (uk)**. All user-visible strings live in the i18n bundle — never inline. See [docs/features/i18n.md](docs/features/i18n.md).

## 5. Multi-User Ready, Single-User in v1

v1 ships with one authorized user, but **the data model is multi-user from day one**:

- All per-user data lives under `/users/{uid}/...`.
- Access is controlled by a `/allowedUsers/{email}` whitelist collection (a list, not a hardcoded email).
- Don't write code or rules that assume only one user. Pattern is `currentUid`, never a hardcoded identity.

See [docs/features/multi-user.md](docs/features/multi-user.md).

## 6. Forward-Compatible Schemas

Every persisted document carries a `schemaVersion` integer. When you change a schema:

- Bump the version.
- Add a migration note in `docs/data-model.md` (even if the migration is "tolerated as-is").
- Prefer **additive** changes over breaking ones.
- Prefer **discriminated unions** (`kind: "timed" | "weighted" | ...`) over boolean flags so new variants don't require touching old code.

See [docs/extensibility.md](docs/extensibility.md) for the patterns we follow.

## 7. Code Style (when code exists)

The repo is pre-implementation. Once code lands, expect:

- TypeScript with `strict: true`. Default lint preset is the industry-standard `eslint` + `@typescript-eslint` + `eslint-config-prettier`.
- Feature folders under `src/features/<name>/` (components, hooks, types colocated).
- Shared primitives in `src/ui/`.
- Firestore access wrapped in `src/data/` repositories — no direct `firebase/firestore` calls in components.
- Tests: Vitest (unit) colocated as `*.test.ts(x)`; Playwright (e2e) under `e2e/`.

Update this section when standards are formalized.

---

## 8. Token-Efficient Development Workflow (IMPORTANT)

The maintainer pays per token and wants to learn token-efficient patterns. **Follow these defaults; deviating costs real money.**

> **Canonical reference:** the global `delegate-to-composer` skill (`~/.cursor/skills/delegate-to-composer/SKILL.md`) is the source of truth for the dispatch + verification methodology. The rules below are this project's application of it.

### 8.1 Delegate execution work to a cheaper subagent

Use the `Task` tool to spawn a **`composer-2.5-fast`** subagent (model slug: `composer-2.5-fast`) for:

- Bulk edits across files (renames, mechanical refactors).
- Running test suites and reporting results.
- Searching the codebase for occurrences when you already know what to look for.
- Writing boilerplate from a clear spec (components, hooks, data fetchers).
- Drafting docs from bullet points you provide.

Reserve the expensive model (the one reading this file) for:

- Decisions that affect architecture or data shape.
- Diagnosing failures the subagent could not resolve.
- Reviewing the subagent's output before accepting it.

### 8.2 Prepare clear, self-contained prompts

A good subagent prompt has these parts, in order:

1. **Goal** — one sentence. ("Add a `useTimer` hook that takes `TimerSession` and returns `{phase, round, secondsLeft}`.")
2. **Context** — file paths to read, types involved, related docs. Paste short snippets only; reference files by path.
3. **Constraints** — TypeScript strict, no new dependencies, must export from `src/features/timer/index.ts`.
4. **Deliverable** — exact files to create/modify. ("Create `src/features/timer/useTimer.ts`. Do not modify other files.")
5. **Verification** — how the subagent should self-check before returning. ("Run `npm run typecheck`. Report any errors.")
6. **Return format** — what the subagent should include in its final message. ("List files changed and any TODOs left.")

### 8.3 Verify after every subagent run

Don't trust, verify — cheaply:

- Read only the files the subagent claims it changed.
- Run `npm run typecheck` and `npm run lint` (fast, cheap, deterministic).
- Spot-check one critical path with `Grep` rather than re-reading large files.
- If verification fails, prefer a **focused fix prompt** (resume the same subagent with the specific error) over starting over.

### 8.4 Other token-saving habits

- **Batch independent tool calls** in a single message (parallel reads, parallel searches).
- **Use `Grep` and `Glob` before `Read`** — never read a whole file to find one symbol.
- **Use readonly subagents** (`readonly: true` on Task) for research questions; they can't accidentally modify anything and they don't need to plan edits.
- **Don't re-explain context** that is already in `AGENTS.md`, skills, or open files — point to it.
- **Skip the `TodoWrite` tool for tasks that take < 3 steps.** It costs tokens.
- **Don't `cat` or paste large files** into chat. Reference by path + line range.
- **Stop talking when the work is done.** No summaries-of-summaries.

### 8.5 When NOT to use a subagent

- The task is one tool call. Just do it.
- You need to make a judgment call that requires the full project context the subagent doesn't have.
- The user is asking *you* a question; don't delegate the answer.

---

## 9. PR / Commit Checklist

Before declaring a change complete:

- [ ] Code matches documentation (or docs are updated to match)
- [ ] `schemaVersion` bumped if any persisted shape changed
- [ ] New / changed feature has a `docs/features/*.md` entry
- [ ] Resolved open questions removed from `docs/open-questions.md`
- [ ] New docs linked from `docs/README.md`
- [ ] All user-visible strings go through i18n (no hardcoded English/Ukrainian in JSX)
- [ ] Mobile portrait layout sanity-checked on Android (or noted as deferred)
- [ ] Subagent output (if any) was verified, not blindly accepted

## 10. Things Not to Do

- Do not migrate to a different framework, hosting, or DB without an explicit human decision recorded in `docs/architecture.md`.
- Do not hardcode a single owner identity. The whitelist is a collection.
- Do not commit real Firebase credentials, owner emails outside the whitelist collection, or any user data.
- Do not bypass the whitelist in security rules "for development". If you need isolation from production data, start the Firestore emulator (opt-in; see [docs/dev/firebase-emulator.md](docs/dev/firebase-emulator.md)). v1 dev runs against production Firebase by default.
- Do not inline user-visible strings — Ukrainian is the default but everything goes through i18n.
- Do not invent new dependencies when the standard library or an already-installed package will do — every dep is bytes in the service worker precache.
