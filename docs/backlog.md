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

### Phase 5 — Routine loading + Today's Workout (Jun 15, 2026)

- [x] Schema types: `NormalizedRoutine`, `Exercise` discriminated union (`checklist | timed`), `NormalizedTimer`, `DailyLog`; `ROUTINE_SCHEMA_VERSION = 1`, `DAILY_LOG_SCHEMA_VERSION = 1` `(9339a53)`
- [x] `src/data/routine.ts`: `parseRoutine` (validate + normalize uniform→array, infer missing `kind`), `getDefaultRoutine` (reads `/defaults/routine`, falls back to built-in), `getUserRoutine` / `setUserRoutine` / `useUserRoutine` `(9339a53)`
- [x] `src/data/defaultRoutine.ts`: `BUILTIN_DEFAULT_ROUTINE` encoding `docs/basic-program-template.md` (Day A 11, Day B 11, Day C 5) `(9339a53)`
- [x] `src/data/dailyLog.ts`: `getTodayLog`, `setExerciseCompletion` (read-modify-write, never clears `completedAt`, stamps only on first all-complete), `useTodayLog` with imperative `reload()` `(9339a53)`
- [x] `src/lib/cycle.ts`: timezone-safe `todayDateStringInTimezone` via `Intl.DateTimeFormat('en-CA')`, `daysBetweenLocal`, `computeCycleIndex` (negative-safe), `getTodaysDay` `(9339a53)`
- [x] `TodayPage`: routine load → `<Navigate to="/welcome">` if missing; resolves today's day, renders checklist with per-row pending flag, completion banner, ▶ button placeholder for timed exercises (row-hint: `N×W/R` uniform, slash-joined work seconds variable, mixed-fallback >24 chars) `(18d0089)`
- [x] `WelcomePage`: "Use default" copies `getDefaultRoutine()` → `setUserRoutine(uid)` → navigates home; "Import JSON" still stubbed for Phase 7 `(18d0089)`
- [x] New `today` i18n namespace (uk + en) with plural-aware `hint.mixed` `(18d0089)`
- [x] 31 tests across 6 files green (cycle math, routine parse/validate/normalize, dailyLog read-modify-write semantics)

#### Nits & follow-ups (Phase 5)

- [ ] Wire ▶ button to `/timer` with `TimerSession` state (Phase 6)
- [x] Visual polish (theme tokens) — landed in Phase 5.5
- [ ] `routineExerciseIdsForDay` recomputed each render — micro-optimization with `useMemo` if it ever matters
- [ ] Admin-editable `/defaults/routine` (Phase 8) — currently the constant is the only source

---

### Phase 5.5 — Theme tokens + global styles (Jun 15, 2026)

Inserted out-of-roadmap after Phase 5 because the app was still rendering plain white on a dark-themed spec, and Phase 6's timer needs `--work`/`--rest`/`--complete`/`--paused`/`--ready` anyway.

- [x] `src/ui/tokens.css`: full palette per `docs/design/theme.md` (surfaces, text, brand/accent, timer phases, system semantic, radius, motion), `color-scheme: dark`, system font stack, body bg/text, heading line-heights
- [x] Global element styles: `<button>` (default + `data-variant="primary"` + `aria-pressed="true"` active state), `<input>` family, `<select>`, `<a>`, NavLink active via `[aria-current="page"]`, `:focus-visible` outline, `.tabular` helper, `.centered-page` utility for pre-router screens
- [x] `src/ui/tokens.ts` mirror exports `var(--…)` strings (not raw hex) so inline-styled spots stay single-sourced from CSS
- [x] Imported once from `src/main.tsx`
- [x] Retrofit: removed every hardcoded hex from components (AppShell `#ccc`/`#eee`/`#666`; InstallPrompt + UpdatePrompt `#1B1D26`/`#E8E9EE`/`#2E3142`/`#252835`). Removed inline `fontWeight` toggles from AppShell NavLinks and SettingsPage language buttons in favor of CSS selectors on `[aria-current="page"]` / `[aria-pressed="true"]`.
- [x] `index.html`: `<meta name="color-scheme" content="dark">`

#### Nits & follow-ups (Phase 5.5)

- [ ] Spacing scale not yet exposed as CSS vars (inline `padding`/`gap` numbers remain); add `--space-*` tokens if/when component CSS gets extracted to files
- [ ] No light theme (out of v1 per `theme.md`)

---

### Phase 5.6 — UX overhaul: cards, logo, hamburger nav, fitness fonts (Jun 15, 2026)

User-driven design pass after Phase 5.5 to make the app feel like a fitness product instead of a wireframe.

- [x] Web fonts: Google Fonts `Manrope` (body) + `Oswald` (display/brand), `display=swap`, preconnect to `fonts.gstatic.com`. New tokens `--font-body` and `--font-display` in `tokens.css`. **Diverges from earlier "no web fonts in v1" guidance in `architecture.md` and `theme.md`** — both docs updated to reflect the new reality.
- [x] `BrandLogo` SVG component: "SoloLeveling" in Oswald 700 with a linear gradient fill (`--accent` → `--work`) and a subtle Gaussian-blur glow filter. Accessible via `<svg role="img" aria-label="SoloLeveling">` so `App.test.tsx` continues to find the heading by name.
- [x] Hamburger drawer nav (`src/app/NavDrawer.tsx`): slim 56 px top bar with hamburger left + BrandLogo center. Drawer slides in from the left over a `rgba(0,0,0,0.5)` backdrop. Closes on Escape, backdrop click, or NavLink click. Focus moves to the close (×) button on open and restores to the hamburger button on close (minimal pattern, no focus-trap library).
- [x] `TodayPage` exercise cards: each row is a card (`--surface-1` bg, `--border` 1 px, `--radius-md`) with the entire card acting as the toggle via a label-wraps-`.sr-only`-checkbox pattern. Done state via `[data-done="true"]`: opacity 0.6, border `--complete`, `color-mix` accent background tint, `text-decoration: line-through`, leading `✓` glyph from `::before`. Trailing ▶ button is a sibling of the label (`stopPropagation` on click) so we avoid `<button>` inside `<label>`-inside-`<button>` weirdness.
- [x] Dropped the `today:title` heading from `TodayPage`; promoted `day.label` to `<h1>`.
- [x] Notes restyle: removed the "Notes:" prefix; rendered as italic `--text-muted` block below the exercise name.
- [x] Pre-router fallback views (`App.tsx`) now use `BrandLogo` inside `.centered-page`.
- [x] Three new `common:nav.*` keys: `menuLabel`, `close`, `openMenu` (uk + en).

#### Nits & follow-ups (Phase 5.6)

- [ ] Logo glow filter is fixed; could become a hover-only effect on desktop to feel more alive.
- [ ] Drawer focus-trap is minimal (Tab can escape the dialog while open). A real focus-trap helper would tighten this up if/when a11y audit demands it.
- [ ] Web fonts add ~30–50 KB to first load; if PWA Lighthouse score suffers, consider self-hosting subsets or moving back to system fonts.

---

## In Progress

_(nothing dispatched)_

---

## Rough roadmap (post Phase 5)

Order subject to change. Each phase is one subagent dispatch + verification.

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
