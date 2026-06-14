# Data Model

Every persisted document carries a `schemaVersion` integer. Readers must tolerate any version `≤ CURRENT_SCHEMA_VERSION`. Writers always emit the current version. See [extensibility.md](./extensibility.md) for the versioning policy.

**Current versions (v1):**

| Document | `schemaVersion` |
|----------|-----------------|
| `users/{uid}` | 1 |
| `users/{uid}/routine/active` | 1 |
| `users/{uid}/dailyLogs/{date}` | 1 |
| `users/{uid}/archives/{year}` | 1 |
| `defaults/routine` | 1 |
| `allowedUsers/{email}` | 1 |
| `admins/{uid}` | 1 |

## Collection Layout

```
/users/{uid}                       — profile: email, displayName, timezone, language
  /routine/active                  — per-user routine (singleton)
  /dailyLogs/{YYYY-MM-DD}          — completion log per local day
  /archives/{YYYY}                 — yearly summary

/defaults/routine                  — shared default routine
/allowedUsers/{email}              — whitelist
/admins/{uid}                      — admin role
```

All per-user collections live under `/users/{uid}/...`. Code never assumes a single user; always derive `uid` from the auth context.

---

## `users/{uid}`

User profile and settings. Created on first successful sign-in (after the whitelist check passes).

```json
{
  "schemaVersion": 1,
  "email": "kir.matienko@gmail.com",
  "displayName": "Kir Matienko",
  "timezone": "Europe/Warsaw",
  "language": "uk",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "lastSignInAt": "2026-06-13T18:00:00.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | number | yes | Currently `1` |
| `email` | string | yes | From Google auth |
| `displayName` | string | no | From Google auth profile |
| `timezone` | string (IANA TZ) | yes | Used for cycle math and `dailyLogs` IDs. Defaults to browser `Intl.DateTimeFormat().resolvedOptions().timeZone` on first sign-in. |
| `language` | `"uk"` \| `"en"` | yes | UI language. Defaults to `"uk"`. |
| `createdAt` | ISO 8601 string | yes | UTC |
| `lastSignInAt` | ISO 8601 string | yes | UTC |

All timestamps in Firestore are UTC. The `timezone` field is the only thing that determines the user's "today" boundary.

---

## `users/{uid}/routine/active`

The user's program definition: anchor date, cycle of workout days, and exercise definitions. If absent, the app falls back to `/defaults/routine`.

```json
{
  "schemaVersion": 1,
  "name": "Відновлення форми",
  "anchorDate": "2026-01-01",
  "units": "kg",
  "days": [
    {
      "id": "day_a_legs_pull",
      "label": "День 1 — Ноги та тягові",
      "exercises": [
        {
          "kind": "checklist",
          "id": "warmup_skipping",
          "name": "Скакалка",
          "notes": "5 хв безперервно, помірний темп"
        },
        {
          "kind": "timed",
          "id": "kb_swings",
          "name": "Махи гірею",
          "timer": {
            "workSeconds": 40,
            "restSeconds": 20,
            "rounds": 4
          }
        },
        {
          "kind": "timed",
          "id": "kb_row",
          "name": "Тяга гірі в нахилі (унілатерально)",
          "timer": {
            "rounds": [
              { "workSeconds": 30, "restSeconds": 30 },
              { "workSeconds": 30, "restSeconds": 30 },
              { "workSeconds": 30, "restSeconds": 0 }
            ]
          },
          "notes": "30 с на кожну руку"
        }
      ]
    }
  ]
}
```

### Routine fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | number | yes | Currently `1` |
| `name` | string | no | Display name (e.g. `"Відновлення форми"`) |
| `anchorDate` | string (ISO date `YYYY-MM-DD`) | yes | Cycle index `0` corresponds to this date in the user's timezone. Default: `2026-01-01`. |
| `units` | `"kg"` \| `"lb"` | no | Default unit for future weight logs. Defaults to `"kg"`. |
| `days` | array | yes | Ordered day configurations forming the cycle |

### Exercise fields (common)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | `"checklist"` \| `"timed"` (v1) | yes | Discriminator. Future: `"weighted"`, `"distance"`. |
| `id` | string | yes | Stable identifier; unique within the day |
| `name` | string | yes | Display name |
| `notes` | string | no | Free-text coaching notes |

**Backward compatibility:** if `kind` is missing on import, the reader infers it (`timer` present → `"timed"`, else `"checklist"`). New documents always include `kind` explicitly.

### `kind: "timed"` — timer config

The timer supports **two equivalent forms**, chosen by ergonomics:

**Uniform shorthand** — all rounds identical:

```json
"timer": {
  "workSeconds": 40,
  "restSeconds": 20,
  "rounds": 4
}
```

**Variable per-round** — different intervals per round (e.g. set 1: 40 s, set 2: 30 s):

```json
"timer": {
  "rounds": [
    { "workSeconds": 40, "restSeconds": 20 },
    { "workSeconds": 30, "restSeconds": 20 },
    { "workSeconds": 30, "restSeconds": 0 }
  ]
}
```

#### Normalization (reader behavior)

On read, the uniform form is expanded to the array form internally. The runtime always sees:

```typescript
type NormalizedTimer = {
  rounds: Array<{ workSeconds: number; restSeconds: number }>;
};
```

Rules:

- The **last round's `restSeconds` is ignored** — the timer ends after the final work interval.
- `workSeconds ≥ 1`; `restSeconds ≥ 0` (0 = no rest between this round and the next); `rounds` length ≥ 1.

#### Validation (writer / importer)

A timer block is valid if **exactly one** of these is true:

- It has `workSeconds`, `restSeconds`, and `rounds` (a number) → uniform.
- It has `rounds` (an array) with each entry having `workSeconds` and `restSeconds` → variable.

Mixing the two (e.g. providing `workSeconds` *and* an array `rounds`) is a validation error.

### `kind: "weighted"` — reserved for v2

Documented so JSON files can be hand-edited ahead of UI support.

```json
{
  "kind": "weighted",
  "id": "bench_press",
  "name": "Жим лежачи",
  "target": { "sets": 3, "reps": 8, "weight": 100 }
}
```

`target` is advisory in v1; the UI does not consume it yet.

---

## `users/{uid}/dailyLogs/{YYYY-MM-DD}`

Document ID is the local calendar date in the user's `timezone`. Lexicographically sortable for cheap range queries (future charts).

```json
{
  "schemaVersion": 1,
  "date": "2026-06-13",
  "dayId": "day_a_legs_pull",
  "exercises": [
    { "exerciseId": "warmup_skipping", "isCompleted": true },
    { "exerciseId": "kb_swings", "isCompleted": true, "completedVia": "timer" },
    { "exerciseId": "kb_row", "isCompleted": false }
  ],
  "completedAt": "2026-06-13T19:42:00.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | number | yes | Currently `1` |
| `date` | string (`YYYY-MM-DD`) | yes | Matches the doc ID |
| `dayId` | string | yes | Which routine day was active |
| `exercises[].exerciseId` | string | yes | References routine entry |
| `exercises[].isCompleted` | boolean | yes | v1 completion flag |
| `exercises[].completedVia` | `"manual"` \| `"timer"` | no | Audit hint (timer auto-marks complete) |
| `completedAt` | ISO 8601 UTC | no | First time `all exercises completed` became true |

**Missed-day policy:** documents are created **only when the user touches at least one exercise**. Days with zero interaction leave no doc — by design, no logging for missed workouts. Future charts must tolerate gaps.

### v2 extensibility (reserved, optional fields)

Readers ignore unknown fields; writers may add these without migration:

```json
{ "exerciseId": "bench_press", "isCompleted": true, "sets": [{ "weight": 100, "reps": 8, "rpe": 8 }] }
{ "exerciseId": "kb_swings", "isCompleted": true, "roundsCompleted": 4, "totalWorkSeconds": 160 }
```

---

## `users/{uid}/archives/{YYYY}`

Yearly summary. Generated by the user (or automatically on first access of a new year) after the year completes. Once an archive exists, raw `dailyLogs` for that year may be deleted to save space and read quotas.

```json
{
  "schemaVersion": 1,
  "year": 2026,
  "summarizedAt": "2027-01-05T10:00:00.000Z",
  "totals": {
    "daysTrained": 142,
    "workoutsByDayId": { "day_a_legs_pull": 48, "day_b_press_ballistic": 47 }
  },
  "exerciseTotals": {
    "kb_swings": { "completedSessions": 47, "totalWorkSeconds": 7520 }
  },
  "rawLogsDeletedAt": null
}
```

Full design and lifecycle in [features/yearly-archive.md](./features/yearly-archive.md).

---

## `defaults/routine`

The shared default routine, readable by any whitelisted user. Used as the fallback when a user has no per-user routine and as the seed for `Welcome → Use default`.

Same shape as `users/{uid}/routine/active`. Admins (`/admins/{uid}`) are the only writers.

---

## `allowedUsers/{email}`

```json
{
  "schemaVersion": 1,
  "email": "kir.matienko@gmail.com",
  "addedAt": "2026-01-01T00:00:00.000Z",
  "addedBy": "owner-uid-here"
}
```

Document ID is the email address (lowercased). Used by Firestore security rules and by the app to render the admin "Whitelist" screen.

## `admins/{uid}`

```json
{
  "schemaVersion": 1,
  "email": "kir.matienko@gmail.com",
  "addedAt": "2026-01-01T00:00:00.000Z"
}
```

Document ID is the Firebase Auth `uid`. Presence grants write access to `/defaults`, `/allowedUsers`, and `/admins`.

---

## JSON Import / Export

The Config screen serializes the user's `routine/active` to a downloadable `.json` file and accepts an uploaded file to overwrite it. The default routine has its own import/export under the admin screen.

**Validation rules:**

- `schemaVersion` must be present and `≤ CURRENT_SCHEMA_VERSION`.
- `anchorDate` must parse as a valid ISO date.
- `days` must be a non-empty array; each day's `id` is unique within the file.
- Each exercise's `id` is unique within its day.
- `kind` must be `"checklist"` or `"timed"` (v1). Missing `kind` tolerated for backward compatibility.
- If `kind: "timed"`: `timer` must validate per the rules above (uniform XOR variable).

Invalid files are rejected with a human-readable error; Firestore is not updated on validation failure.

---

## Migrations

Lazy on read, non-destructive. Writers emit current shape; readers tolerate older shapes.

### Routine v0 → v1

"v0" is shorthand for documents written before `schemaVersion` existed (the original MOU shape).

| Old | New | Rule |
|-----|-----|------|
| (missing `schemaVersion`) | `schemaVersion: 1` | Add on read |
| (missing `units`) | `units: "kg"` | Default |
| Exercise without `kind` | `kind: "timed"` if `timer` present, else `"checklist"` | Infer |

### DailyLog v0 → v1

| Old | New | Rule |
|-----|-----|------|
| (missing `schemaVersion`) | `schemaVersion: 1` | Add on read |

No structural changes; v0 logs are valid v1 logs with the version stamp.
