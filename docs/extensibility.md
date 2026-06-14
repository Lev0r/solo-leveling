# Extensibility Guide

How the codebase and data model are shaped so future features land **without rewrites or migrations**. The near-term extensions on the radar:

- **Weight logs** — per-set weight × reps tracking for resistance exercises.
- **Charts** — historical progress (volume over time, PRs, completion streaks).
- **More users** — v1 ships with one; data model already supports many.
- **Sound + haptics** on the timer.
- **Routine sharing** between whitelisted users.

All of these are out of scope for v1, but v1 must not paint itself into a corner.

## Guiding Principles

1. **Additive over breaking.** New fields are optional; old data keeps working.
2. **Versioned schemas.** Every persisted document carries `schemaVersion: number`. Bump when shape changes; readers handle the union.
3. **Discriminated unions, not flags.** Exercise behavior is determined by `kind`, not booleans.
4. **Multi-user from day one.** All per-user data lives under `/users/{uid}/...`; never assume a single user.
5. **i18n from day one.** Default locale is `uk`; never inline strings — see [features/i18n.md](./features/i18n.md).
6. **Pluggable feature folders.** Each feature owns its UI, hooks, and types so it can be added or removed surgically.
7. **Repository pattern.** Components never import `firebase/firestore` directly — they go through `src/data/*`. This lets us add caching, optimistic writes, or a different backend later.
8. **One-shot reads in v1, but design fields for future listeners.** Add `updatedAt: Timestamp` on documents that might want change notifications later. Free now, useful later.

---

## Schema Versioning

Every Firestore document includes:

```json
{ "schemaVersion": 1, "...": "..." }
```

When you change a schema:

1. Define the new shape.
2. Bump `schemaVersion`.
3. Write a reader that handles **all known versions** (v1 → v2 upgrade can happen lazily on read or on next write).
4. Document the change in [data-model.md](./data-model.md) under "Migrations".
5. Prefer "tolerated as-is" — read old documents, write new shape. Avoid backfill scripts unless required.

## Discriminated Exercise Kinds

```typescript
type Exercise =
  | { kind: 'checklist'; id: string; name: string; notes?: string }
  | { kind: 'timed';     id: string; name: string; timer: TimerConfig; notes?: string }
  | { kind: 'weighted';  id: string; name: string; target?: WeightedTarget; notes?: string } // v2
  | { kind: 'distance';  id: string; name: string; target?: DistanceTarget; notes?: string }; // v2
```

TypeScript forces every consumer to handle each case. Adding `weighted` later is a union extension, not a refactor.

## Daily Log: Per-Entry Extensibility

```typescript
interface BaseLogEntry {
  exerciseId: string;
  isCompleted: boolean;
  completedVia?: 'manual' | 'timer';
}

// v2 additions, all optional:
interface WeightedLogEntry extends BaseLogEntry {
  sets?: { weight: number; reps: number; rpe?: number }[];
}
interface TimedLogEntry extends BaseLogEntry {
  roundsCompleted?: number;
  totalWorkSeconds?: number;
}
```

v1 readers ignore unknown fields. v2 readers opportunistically display them when present.

## Multi-User Headroom

Already documented in [features/multi-user.md](./features/multi-user.md). Concretely, this means v1 must:

- Always namespace user data under `/users/{uid}/...`.
- Always read the current uid from auth, never a constant.
- Render admin screens behind an `isAdmin` check (which works for one admin or many).
- Treat `/defaults/routine` as a separate document, not the same path as the user's routine.

When a second user shows up, the only changes are: (a) add their email to `/allowedUsers/{email}` via the admin UI, (b) they sign in. No code changes needed.

## Feature Folder Layout

```
src/
├── app/                 — routing, providers, layout shell
├── ui/                  — shared primitives (Button, Card, BigNumber)
├── i18n/                — i18next setup + locale bundles
├── data/                — Firestore repositories + types
│   ├── auth.ts
│   ├── allowedUsers.ts
│   ├── routine.ts
│   ├── dailyLog.ts
│   ├── archive.ts
│   └── schema.ts
├── features/
│   ├── today/           — Today's Workout screen
│   ├── timer/           — Full-screen interval timer
│   ├── config/          — JSON import/export
│   ├── settings/        — User settings (timezone, language)
│   ├── welcome/         — First-run choice between default / import / empty
│   ├── admin/           — Whitelist + default-routine editor
│   ├── weights/         — FUTURE: weight log entry UI
│   └── charts/          — FUTURE: history visualizations
└── lib/                 — date math, cycle calculation, utils
```

A new feature: add a folder under `features/`, register its route in `src/app/`, consume data via `src/data/*`. No cross-feature imports.

## Charts: What to Prepare Now

Charts will read `dailyLogs/*` (for the current year) and `archives/{year}` (for past years) — see [features/yearly-archive.md](./features/yearly-archive.md).

- **Indexable IDs.** `dailyLogs` doc IDs are `YYYY-MM-DD`, sortable; range queries are trivial.
- **Self-describing entries.** Each log entry has `exerciseId`; no joins needed for grouping.
- **No aggregate caches in v1.** Compute client-side; yearly archives are the only precomputed aggregate.
- **Timezone discipline.** Date strings use the user's timezone at write time; archives record `userTimezoneAtSummary`. Charts must respect both.

Library choice when the time comes: `recharts` (small, declarative) or `visx` (more powerful, larger). Defer the decision.

## Weight Logs: What to Prepare Now

- Don't force a UI in v1, but the JSON import accepts `sets[]` on log entries — power users can hand-edit before the UI exists.
- Keep `dailyLog` writes as full-document overwrites (or use Firestore field updates) — both tolerate added fields cleanly.
- `units` is a routine-level setting (`"kg" | "lb"`), not per-exercise.
- Add a `target` block to weighted exercises now (advisory only) — see [data-model.md](./data-model.md).

## Yearly Archives

Archives let v1 grow into a long-lived dataset without scaling read costs. See [features/yearly-archive.md](./features/yearly-archive.md). v1 builds the archive document shape and the client-side summarizer; v2 can layer charts on top without changing storage.

## Sound + Haptics

Not in v1. The timer hook's contract is:

```ts
useIntervalTimer(session, { onPhaseChange?: (phase, round) => void });
```

`onPhaseChange` is a no-op in v1. v2 wires it to `Audio` / `navigator.vibrate(...)`. Settings persist on `/users/{uid}.preferences.timer = { sound, haptics }` — `preferences` is reserved as an additive object.

## Routine Sharing (future)

A future `/sharedRoutines/{id}` collection plus a "subscribe (copy-on-write)" action on the welcome screen will let users start from each other's routines. v1's split between `/defaults/routine` and `/users/{uid}/routine/active` is already the right shape — sharing is just "copy any source routine, not just the default".

## Avoid in v1

- **Embedding the routine snapshot inside daily logs.** Tempting for historical fidelity, but it duplicates data and complicates edits. Reference by `exerciseId` only. (If historical fidelity matters later, snapshot the routine document under `users/{uid}/routineHistory/{date}` once per program change.)
- **Auto-generated Firestore IDs for `dailyLogs`.** Date string IDs are essential for range queries and idempotent writes.
- **Tight coupling between timer and exercise components.** The timer takes a `TimerSession` prop, not the whole exercise — so a future "standalone timer" feature can launch it with arbitrary values.
- **Bundling a chart library before charts ship.** Don't pay the bytes.
- **Hardcoding the owner email anywhere.** Always read from `/allowedUsers` and auth.
- **Hardcoded English/Ukrainian strings in components.** Goes through i18n.

## Test Hooks Worth Investing In Early

- `cycleIndex(currentDate, anchorDate, routineLength, timezone)` — date math is tricky around DST.
- `normalizeTimer(input)` — uniform shorthand vs. variable array.
- Schema readers — given v1 doc, v2 doc, malformed doc, do the right thing.
- JSON import validator — invalid files rejected before any write.
- Whitelist gate — non-whitelisted user blocked at both UI and rule layer.

## Summary Checklist for New Features

- [ ] New persisted shape? Add `schemaVersion` and document the change.
- [ ] New exercise behavior? Add a `kind` to the union, not a boolean.
- [ ] New screen? New folder under `src/features/`.
- [ ] New data dependency? New function in `src/data/`, not a direct Firestore call.
- [ ] All user-visible strings via i18n.
- [ ] Multi-user safe (no hardcoded uid/email).
- [ ] New doc page linked from `docs/README.md` and root `README.md`.
