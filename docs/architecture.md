# Architecture

## Summary

**SoloLeveling** is a mobile-first installable PWA built with React + Vite + TypeScript, hosted on Firebase. v1 ships for a single authorized user (the owner), but the data model, auth, and routing are designed multi-user from day one so that adding more users later is a configuration change, not a rewrite.

The app computes which workout day to show from a fixed anchor date and a repeating routine cycle. The cycle advances by **calendar day**: skipping a day still moves you forward in the cycle. Missed workouts are not logged in v1.

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| UI | React 18 + TypeScript (`strict: true`) | Component model + type safety for evolving schemas |
| Build | Vite | Fast dev server and production builds |
| PWA | `vite-plugin-pwa` (Workbox) | Manifest, service worker, offline app shell |
| i18n | `i18next` + `react-i18next` | Industry-standard, light, supports lazy-loaded locales |
| Hosting | Firebase Hosting | Free tier, simple SPA deploy, HTTPS (required for PWA) |
| Database | Firestore (Native mode) | Document model, security rules, free tier sufficient |
| Auth | Firebase Authentication (Google) | Low-friction sign-in, integrates with Firestore rules |
| Lint/Format | ESLint + `@typescript-eslint` + Prettier | Industry-standard defaults |
| Tests | Vitest (unit) + Playwright (e2e) | Vitest pairs with Vite; Playwright is for learning |

TypeScript is chosen up-front because future features (weight logs, charts, exercise variants) will rely on discriminated unions over the exercise schema; getting that right at compile time prevents data corruption later.

## Target Platform

- **Primary:** Android Chrome (and Chromium-based WebView), portrait orientation, installed as a PWA from the home screen.
- **Secondary:** desktop Chrome/Firefox for development and admin tasks.
- **Incidental:** iOS Safari. Things that work for free are kept; iOS-only workarounds are explicitly out of scope.

## Authentication & Authorization

### Identity

- Provider: Google Sign-In via Firebase Authentication.
- After sign-in, the app reads `request.auth.token.email` and the user's `uid`.

### Whitelist (multi-user ready)

Access is gated by a Firestore collection — **not** a hardcoded email. This is the single source of truth and is editable from the app by admins.

```
/allowedUsers/{email}   → { addedAt: Timestamp, addedBy: uid }
/admins/{uid}           → { email: string, addedAt: Timestamp }
```

- A signed-in user has access if `/allowedUsers/{their email}` exists.
- Admins can add/remove entries in `/allowedUsers` and `/admins`.
- v1 seeds: `/allowedUsers/kir.matienko@gmail.com` and `/admins/{owner-uid}` (created manually after first sign-in).

The app reads `/allowedUsers/{my email}` on boot. If absent → show a friendly "you're not invited yet" screen and a sign-out button.

Full security rules and per-user paths are in [features/multi-user.md](./features/multi-user.md).

## Routing & Screens

| Route | Screen | Purpose |
|-------|--------|---------|
| `/` | Today's Workout | Exercises for the current local date |
| `/timer` | Interval Timer | Full-screen work/rest countdown (see [features/interval-timer.md](./features/interval-timer.md)) |
| `/config` | Program Config | JSON import/export for the user's routine |
| `/settings` | User Settings | Timezone, language, theme overrides |
| `/admin/users` | Whitelist (admins only) | Manage `/allowedUsers` |
| `/admin/default-routine` | Default routine (admins only) | Edit the shared default routine |
| `/welcome` | First-run | Shown when no per-user routine exists; offers "use default" or "import JSON" |

## Core Logic: Daily Workout Selection

The cycle advances by **calendar day** so a missed day still moves you to the next workout (this matches the user's preference; "cycle pauses when missed" is not the model).

```typescript
const MS_PER_DAY = 86400000;
const todayInUserTZ = startOfDayInTimezone(new Date(), user.timezone);
const anchorInUserTZ = startOfDayInTimezone(routine.anchorDate, user.timezone);
const cycleIndex = Math.floor((todayInUserTZ - anchorInUserTZ) / MS_PER_DAY) % routine.days.length;
const todaysDay = routine.days[cycleIndex];
```

- **Anchor date:** `2026-01-01` by default; stored per-routine.
- **Timezone:** the user's IANA timezone string (e.g. `Europe/Warsaw`). All date math happens in the user's local timezone; storage is UTC.
- **"Today" boundary:** local midnight in the user's timezone.

## Time & Timezone Policy

| Stored as | Where | Why |
|-----------|-------|-----|
| **UTC** (`Timestamp` or ISO string) | All Firestore timestamps | Single canonical reference |
| **Local date string** `YYYY-MM-DD` | `dailyLogs/{date}` document ID | Stable per-day key in user's timezone |
| **IANA TZ name** | `/users/{uid}.timezone` | Per-user setting, configurable |

Implementation uses `Intl.DateTimeFormat` + `date-fns-tz` (or equivalent) to convert UTC ↔ user's local day boundary. The cycle index is computed from local-day differences, never UTC differences.

## Mobile-First & PWA

### Layout Rules

- Single column.
- Touch targets ≥ 48 dp.
- Bottom-aligned primary actions (thumb reach) when feasible.
- Use `100dvh` (dynamic viewport) instead of `100vh`.
- Respect safe areas: `env(safe-area-inset-top/bottom/left/right)`.
- No hover-only interactions.
- Typography uses Google web fonts (Manrope body + Oswald display) loaded via `<link>` in `index.html` with `display=swap` and `preconnect` to `fonts.gstatic.com`. The system font stack remains the fallback chain via `--font-body` / `--font-display`. Trade-off accepted in Phase 5.6 for the fitness-app brand feel; the original "no web fonts" guidance is superseded. See [design/theme.md](./design/theme.md).

### PWA Manifest

```json
{
  "name": "SoloLeveling",
  "short_name": "SoloLeveling",
  "description": "Personal home workout tracker",
  "lang": "uk",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "scope": "/",
  "background_color": "#13141B",
  "theme_color": "#13141B",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

See [design/theme.md](./design/theme.md) and [design/icon.md](./design/icon.md) for the source colors and asset spec.

### Service Worker

- Precache the built app shell (HTML, JS, CSS, icons).
- No runtime caching of Firestore reads in v1 (one-shot reads only — see below).
- Prompt for update when a new SW is available; do **not** silently reload during a workout or active timer.

### Wake Lock

- Request `navigator.wakeLock.request('screen')` when the timer mounts; release on unmount or `visibilitychange → hidden`.
- If Wake Lock is unavailable → **do nothing** (no banner, no warning). Resolved per user preference.

### Orientation

- Manifest sets `orientation: portrait`.
- CSS does not need a landscape layout in v1; the timer and Today's screen are portrait-only.

## State & Data Access

### One-shot reads (no real-time listeners)

v1 uses `getDoc` / `getDocs` only. No `onSnapshot`. This keeps the data layer simple, reduces Firestore read quotas, and matches the user's confirmation that real-time multi-device sync isn't needed.

If a refresh is wanted (e.g. after the timer finishes and auto-marks the exercise complete), the screen explicitly re-reads.

### Repository pattern

All Firestore access lives in `src/data/`. Components consume hooks that wrap these repositories. This makes it possible to swap in caching, optimistic writes, or even a different backend later without touching UI.

```
src/
├── data/
│   ├── auth.ts              // currentUser hook, sign-in/out
│   ├── allowedUsers.ts      // whitelist read/write
│   ├── routine.ts           // per-user routine + default routine
│   ├── dailyLog.ts          // today's log + range queries (future)
│   ├── archive.ts           // yearly summaries
│   └── schema.ts            // shared types, schemaVersion constants
├── features/
│   ├── today/
│   ├── timer/
│   ├── config/
│   ├── settings/
│   ├── admin/
│   └── welcome/
├── i18n/                    // i18next setup + locale bundles
├── ui/                      // shared primitives
├── lib/                     // date math, cycle calculation, utils
└── app/                     // routing, providers, layout shell
```

## Firebase Project

- **Project ID:** `solo-leveling-fa230`
- **Region:** `eur3` (Europe multi-region: Belgium + Netherlands) — higher durability than single-region. Permanent.
- **Console:** https://console.firebase.google.com/u/0/project/solo-leveling-fa230

## Firebase Collection Layout

```
/users/{uid}                       — profile: email, displayName, timezone, language, schemaVersion
  /routine/active                  — per-user routine (singleton subcollection doc)
  /dailyLogs/{YYYY-MM-DD}          — completion log per local day
  /archives/{YYYY}                 — yearly summary (see features/yearly-archive.md)

/defaults/routine                  — shared default routine, readable by all allowed users
/allowedUsers/{email}              — whitelist
/admins/{uid}                      — admin role assignments
```

Full schemas and security rules in [data-model.md](./data-model.md) and [features/multi-user.md](./features/multi-user.md).

## Offline Behavior (v1)

- **App shell:** works offline (loads the UI).
- **Data:** requires network. If Firestore is unreachable, show an offline banner. No write queue, no stale fallback.
- **Timer:** fully functional offline once the screen is loaded.

Offline-first sync is deferred (see [extensibility.md](./extensibility.md)).

## Deployment

```bash
npm run build           # vite build → dist/
npm run deploy          # firebase deploy --only hosting,firestore
npm run deploy:hosting  # firebase deploy --only hosting
npm run deploy:rules    # firebase deploy --only firestore:rules
```

See [dev/deploy.md](./dev/deploy.md) for the full setup. No CI/CD in v1 — manual `npm run deploy` from the developer's machine.

## Backups

Firestore's durability is excellent (multi-region replication, point-in-time recovery on paid tier). For a personal app on the free tier:

- **Trusted for primary storage.** No scheduled exports — those require Blaze (pay-as-you-go) and Cloud Storage.
- **Manual safety net:** the Config screen's JSON export covers the routine. A planned "Download all my data" admin action will dump per-user routines + logs + archives to a single JSON file (one Firestore read per doc; effectively free). Recommended cadence: monthly, by hand.

If at some point the data feels valuable enough, switch to scheduled exports — that decision belongs in [open-questions.md](./open-questions.md) when it arises.

## Non-Goals (v1)

- Multi-user **UI** (data model supports it; just no signup flow yet)
- Visual program editor (JSON import/export only)
- Offline-first **data writes** (app shell is offline-capable; Firestore writes are not queued)
- Real-time multi-device sync (one-shot reads only)
- Push notifications / reminders (FCM not wired)
- Native mobile apps (PWA is the install path)
- iOS-specific quirk fixes
- Charts, weight logs, progression tracking UI (data hooks reserved — see [extensibility.md](./extensibility.md))
- Logging of missed workouts
