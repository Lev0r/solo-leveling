# Backlog

Source of truth for "what's done, in flight, and next" on SoloLeveling. Lightweight on purpose — bugs and small follow-ups live here too, until/unless we adopt GitHub Issues.

## Conventions

- `[x]` done · `[/]` in progress · `[ ]` planned · `[~]` deferred / out of v1
- Reference commits as `(abc1234)`; multiple commits comma-separated.
- A **Phase** is a cohesive vertical slice — usually one subagent dispatch + verification + commit.
- Smaller fixes and chores go under **Nits & follow-ups** under each phase.
- When a phase ships: update its section to `[x]`, append the commit hash, add any follow-up bugs that surfaced, and move scope from "Next" up to "Done".

---

## Done

### Phase 0 — Repo & infrastructure (Jun 13–14, 2026)

- [x] Documentation tree: MOU, AGENTS, architecture, data-model, extensibility, features (interval-timer, multi-user, i18n, yearly-archive), design (theme, icon), dev (deploy, emulator, testing) `(31dcd95)`
- [x] Firebase project `solo-leveling-fa230` created, `eur3` region (manual via console)
- [x] GitHub repo `Lev0r/solo-leveling`, MIT, public (manual)
- [x] WSL `~/.ssh/` copied from Windows with correct perms; git remote on `github.com-personal`
- [x] Firestore rules deployed (whitelist + admin role) via `firebase deploy --only firestore:rules`
- [x] `/allowedUsers/kir.matienko@gmail.com` seeded (manual via console)
- [x] Global skill `delegate-to-composer` created at `~/.cursor/skills/`; mirrored to Windows `C:\Users\kirma\.cursor\skills\` `(391008e)`

### Phase 1 — Vite + React + TS toolchain (Jun 14, 2026)

- [x] `package.json`, `tsconfig` (strict), `vite.config.ts`, `eslint.config.js` (flat), `.prettierrc`, `vitest` setup `(d2443fa)`
- [x] Smoke test green: typecheck / lint / build / 1 passing test
- [x] Versions: vite 8.0.16, react 19.2.7, typescript 6.0.3, vitest 4.1.8, eslint 9.39.4

### Phase 2 — Firebase auth + whitelist gate (Jun 14, 2026)

- [x] `src/data/firebase.ts` (lazy init, emulator-aware, HMR-safe), `auth.ts`, `allowedUsers.ts` `(aa1d6ea)`
- [x] `App.tsx` 4-state shell: loading / signed-out / not-whitelisted / welcome (uid visible for bootstrap)
- [x] `/admins/{kir-uid}` seeded (manual via console)
- [x] Real Google sign-in verified end-to-end against production Firebase

#### Nits & follow-ups (Phase 2)

- [x] Emulator made opt-in (v1 dev = production Firebase by default) `(7e10b4e)`

---

### Phase 3 — Routing, i18n, user profile, first real screens (Jun 15, 2026)

- [x] React Router v7 with v1 routes: `/`, `/welcome`, `/settings`, `/admin/users`, `/timer` `(8c3c225)`
- [x] `i18next` + `react-i18next` + `i18next-browser-languagedetector`; namespaces: `common`, `auth`, `welcome`, `settings`, `admin`; default `uk`, fallback `en`; resolution order localStorage → navigator → default `(8c3c225)`
- [x] All existing English placeholders moved into `uk`/`en` bundles `(8c3c225)`
- [x] `AppShell` layout: top bar + nav + UID debug footer, 48 dp touch targets, `100dvh` `(8c3c225)`
- [x] `/users/{uid}` auto-created on first sign-in (timezone from `Intl`, language `'uk'`, `schemaVersion: 1`); `lastSignInAt` updated once per session
- [x] `useUserProfile()` hook + `UserProfileProvider`/`useUserProfileContext()` (one-shot read, create-if-missing, StrictMode-safe write guard, imperative `updateLanguage`)
- [x] Settings screen: language switcher (writes profile + `localStorage['lang']` + `i18n.changeLanguage`) + read-only timezone
- [x] Welcome screen stub: title/description + two buttons (Use default / Import JSON) wired to `console.log`
- [x] Vitest unit tests for `useUserProfile` (create, update, StrictMode dedupe, `updateLanguage`)

#### Nits & follow-ups (Phase 3)

- [ ] `UserProfileProvider` uses `createElement` because `userProfile.ts` is `.ts`; consider renaming to `.tsx` if/when more JSX-bearing helpers land in the same file.
- [ ] Visual polish: AppShell is unstyled placeholder; theme tokens land in a later phase.

---

### Phase 4 — PWA shell (Jun 15, 2026)

- [x] `vite-plugin-pwa` 1.3.0 wired: `generateSW`, `registerType: 'prompt'`, dev SW disabled
- [x] Web manifest per `architecture.md` (uk, standalone, portrait, `#13141B` bg/theme); SVG icon placeholders at `public/icons/{icon,icon-maskable}.svg` and `public/favicon.svg` (PNG export deferred to Phase 10)
- [x] `index.html`: `<html lang="uk">`, manifest link, theme-color meta, SVG favicon
- [x] `UpdatePrompt` component (uses `useRegisterSW` tuple correctly after fix); `InstallPrompt` + `useInstallPrompt` hook capturing `beforeinstallprompt` with 7-day dismissal and standalone-mode suppression; both mounted in `AppShell`
- [x] `useWakeLock(enabled)` hook in `src/lib/wakeLock.ts` — silent no-op when API absent; re-acquires on `visibilitychange → visible`. Unused until Phase 6.
- [x] Vitest mock for `virtual:pwa-register/react` in `src/test/setup.ts` (tuple shape)

#### Nits & follow-ups (Phase 4)

- [ ] Real raster icons (192/512/maskable-512 PNGs) — Phase 10
- [ ] Gate `UpdatePrompt`'s auto-reload by "is a timer / workout active?" once Phase 6 lands (architecture.md service-worker note)
- [ ] Lighthouse PWA audit pass (deferred — needs real icons + HTTPS deploy)

---

## In Progress

_(nothing dispatched)_

---

---

## Rough roadmap (post Phase 3)

Order subject to change. Each phase is one subagent dispatch + verification.

- [ ] **Phase 4 — PWA shell**: `vite-plugin-pwa`, manifest, service worker, "add to home screen" hint for Android, Wake Lock helper.
- [ ] **Phase 5 — Routine loading + Today's Workout**: read `/defaults/routine` and `/users/{uid}/routine/active`, cycle calculation in user timezone, render exercise list, write `/dailyLogs/{date}` on completion.
- [ ] **Phase 6 — Interval Timer**: full-screen, normalized variable intervals, auto-complete-on-finish, theme colors from `design/theme.md`, Wake Lock.
- [ ] **Phase 7 — JSON Import/Export**: serialize/parse routines with schema validation per `data-model.md`.
- [ ] **Phase 8 — Admin screens**: whitelist CRUD + default routine editor.
- [ ] **Phase 9 — Yearly archive**: summarizer + raw-log deletion + first-of-year banner trigger.
- [ ] **Phase 10 — Production icon export**: square 1024, 192 / 512 / maskable-512, hooked into manifest.
- [ ] **Phase 11 — Playwright e2e**: 1 happy-path per primary screen.

---

## Unscheduled backlog (small + free-floating)

- [ ] "Download all my data" admin button (per `architecture.md` backups discussion)
- [ ] `short_name` choice for the PWA manifest (open-question #4)
- [ ] Get-ready lead-in default toggle (open-question #1)
- [ ] Variable timer hint format on workout rows (open-question #2)
- [ ] First-time language detection rule (open-question #3) — currently spec says always `uk`
- [ ] CI/CD via GitHub Actions (currently manual `npm run deploy`)
- [ ] Add `.editorconfig` so non-Cursor editors get consistent indent

---

## Deferred — v2 or later

These are documented as out of scope but the data model / contracts already make room for them. See [extensibility.md](./extensibility.md).

- [~] Multi-user signup UI (data layer is ready; no UI)
- [~] Weight logs UI (`kind: "weighted"` exercise variant)
- [~] Charts (volume, streaks, PRs)
- [~] Sound + haptics on timer phase change
- [~] Routine sharing between whitelisted users
- [~] Apple Watch / Wear OS companion
- [~] Push notifications / reminders (FCM)
- [~] iOS Safari-specific polish
- [~] Offline-first data writes (queue + conflict resolution)

---

## Bugs / Issues

_(none open)_

---

## Related

- [open-questions.md](./open-questions.md) — decisions still pending
- [extensibility.md](./extensibility.md) — patterns for adding deferred features later
- [README.md (../README.md)](../README.md) — project overview + resource URLs
