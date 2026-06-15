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

- [x] Real raster icons (192/512/maskable-512 PNGs) — Phase 10 `(see Phase 10 section)`
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
- [x] Admin-editable `/defaults/routine` — Phase 8 admin default-routine editor on `/config`

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

### Phase 5.7 — UX polish round 2 (planned)

User-driven follow-ups from the Phase 5.6 review. Iterative; each bullet is its own dispatch candidate.

- [x] **Font selection** — converged after 4 rounds on **Syncopate** (display/brand) + **Exo 2** (body). `(9b13eda)`
- [x] **Card icons + timer launch from cards.** Checklist cards keep the label-wraps-hidden-checkbox toggle. Timed cards become single-`<button>` tap targets with a leading stopwatch icon in `--work`; tap navigates to `/timer` with `{ exerciseId, exerciseName, rounds }` location state (matches `docs/features/interval-timer.md` `TimerSession` contract; the timer screen itself is still Phase 6).
- [x] **Nav consolidation.** Drawer now has three links: `Today`, `Config`, `Settings`. `/welcome` and `/admin/users` routes removed; `/welcome` → `/config` redirect kept for backward compat. `/timer` route stays (for card-tap navigation) but is no longer in the nav. `ConfigPage` shows routine setup (Use default / Import JSON) always + an admin-only sub-section gated by the new `useIsAdmin(uid)` hook reading `/admins/{uid}`.
- [x] **Interaction polish.** Tap/press feedback via `transform: scale(0.97)` (buttons) / `0.99` (cards). `:hover` now gated behind `@media (hover: hover) and (pointer: fine)` so it never sticks on touch. `-webkit-tap-highlight-color: transparent`. Full `prefers-reduced-motion: reduce` block at the bottom of `tokens.css`. Documented in new `## Interaction` section of `docs/design/theme.md`.
- [x] **Visual interest.** Body bg is now a radial-gradient (violet at top, warm at bottom-right, base `--bg`) with `background-attachment: fixed`. Top app bar gets a 2 px gradient hairline (`--accent` → `--work` @ 0.5 opacity) tying the chrome back to the BrandLogo gradient.

#### Nits & follow-ups (Phase 5.7)

- [x] Admin sub-section in `/config` — Phase 8 whitelist CRUD + default routine editor
- [x] Timed-card manual complete via **long-press** (~500 ms) on the card — marks done with `completedVia: "manual"` without opening the timer. Shipped Phase 6.
- [ ] Exercise category icons / animated level-up moments still on the wish list.

---

### Phase 5.7d — Logo simplification, lighter bg, card facelift, drawer styling (Jun 15, 2026)

User feedback after seeing 5.7c live ("it's pretty boring"):

- [x] **Logo: drop the glow filter entirely**, keep only the gradient fill + thin white stroke (paint-order: stroke fill) for crispness. Default height bumped 28 → 36 so the brand reads bigger in the top bar.
- [x] **Make gym background visible.** Darken overlay opacity dropped from `0.78–0.94` to `0.45–0.70`; gym photo (kettlebells / rig) now visibly carries the page instead of being a near-black slab.
- [x] **Timer icon moved to the trailing edge** on timed cards (name + notes flex-grow on the left, clock on the right) — matches the "tap card → start timer" mental model with a clear affordance on the side opposite the reading direction's start.
- [x] **Day title no longer says "День N — "**; only the body part ("Ноги та тягові", "Жими та балістика", "Відновлення"). The cycle index is implicit from context.
- [x] **Removed UID debug footer** from `AppShell` (and dropped `useAuthState` + `t('debug.uid', ...)` usage that fed it). UID was bootstrap-only debug, no longer needed.
- [x] **Card facelift.** Each card now has:
  - A 4-px left accent stripe colored by kind (`--accent` violet for checklist, `--work` orange for timed) — distinguishes types at a glance.
  - A subtle top-to-transparent surface gradient + 1-px inset white highlight + soft drop shadow → cards "lift off" the background instead of being flat rectangles.
  - Translucent surface (`color-mix(surface-1 92%, transparent)`) with backdrop blur so the gym bg shows through faintly.
  - Done state changes the stripe to `--complete` (green) and dims to 0.55 opacity.
- [x] **Nav drawer redesign.** Background is now layered radial gradients (accent violet top-left, work orange bottom-right) over a subtle `surface-2 → surface-1` vertical gradient, with an inner right-edge accent line and a soft shadow. Brand mark added at the top; active link gets a 3-px accent stripe + accent-tinted background; link labels use the display font in caps for energy.
- [x] **Routine data fixes** in `BUILTIN_DEFAULT_ROUTINE`:
  - `warmup_skipping`: now a `timed` exercise (1 round × 300 s, no rest), since "5 хв безперервно" is literally a single timer block — checklist was wrong.
  - `warmup_plank`: now a `timed` exercise (1 round × 60 s).
  - `kb_swings`, `halo`, `dynamic_plank`: added notes (were missing — easy to miss form cues without them).
- [x] Verified: typecheck / lint / 31 tests green.

#### Nits & follow-ups (Phase 5.7d)

- [x] Existing users who already ran "Use default" before 5.7d had stale labels/checklist skipping — resolved by re-tapping "Use default" on `/config` (dev account confirmed Jun 15).
- [ ] Card backdrop-filter `blur(8px)` only renders if the browser supports it — Android Chrome ≥ 76 is fine, but old WebViews degrade to no blur (still legible).

---

### Phase 5.7c — Top-bar fixes, logo polish, gym background image (Jun 15, 2026)

User-driven follow-ups after seeing 5.7b live:

- [x] **Top bar layout fix.** Was: hamburger `position: absolute` overlapping the centered logo on narrow screens. Now: three-column flex (menu | brand `flex: 1` | spacer-equal-to-menu) so the brand truly centers without overlap, and the SVG gets `max-width: 100%; height: auto;` for safety on very narrow viewports.
- [x] **Brand name** is now "Solo Leveling" (with space) everywhere user-facing: `BrandLogo` SVG text, `BRAND_NAME` constant, `App.test.tsx` assertion, `common:brand` i18n key (uk + en), `<title>` tag, and PWA manifest (`name: 'Solo Leveling'`, `short_name: 'Solo Lvl'`).
- [x] **Logo edge crispness.** Two stacked `<text>` elements: the back layer has the heavy glow filter, the front layer has the same gradient fill plus a thin `rgba(255,255,255,0.9)` stroke (paint-order: stroke fill) so the letterforms stay readable on top of the glow halo.
- [x] **Stronger glow.** Layered two Gaussian blurs (stdDeviation 5 + 2) with two passes of the wider blur in the feMerge — gives a richer halo without the smudge of a single huge blur.
- [x] **Gym background image.** Generated a dark moody gym photo (kettlebells / dumbbell rack / rig silhouettes, warm orange highlights right, violet ambient left, deep shadows) and committed it as `public/gym-bg.jpg` (~1.7 MB). The body background now layers (top to bottom): the existing two radial accents → a vertical `rgba(19,20,27,0.78–0.94)` darken overlay → the image with `background-size: cover; background-attachment: fixed`. Image is NOT in the SW precache (Workbox default globs exclude `.jpg`), so the 1.7 MB only pays on first network load.

#### Nits & follow-ups (Phase 5.7c)

- [ ] `gym-bg.jpg` is 1.7 MB and unoptimized. Compress with `cwebp` / `mozjpeg` once a build tool lands (Phase 10 production-assets pass), aim for ~150–300 KB.
- [ ] Generated image is landscape 1024×683; on portrait mobile we crop the sides via `cover`. If the kettlebell foreground loses too much on narrow screens, regenerate at portrait aspect or use `media`-conditional images.
- [ ] `short_name` of `Solo Lvl` is a guess (resolves open-question #4 by default); confirm or override.
- [ ] `docs/architecture.md` still shows the manifest snippet with the old `SoloLeveling` name and `theme.md` / `icon.md` still reference the old name — minor doc drift; sweep next time a doc is touched.

---

---

### Phase 6 — Interval timer (Jun 15, 2026)

- [x] Full-screen `/timer` route outside `AppShell` — no app chrome, `100dvh`, safe-area insets
- [x] `useIntervalTimer` hook: wall-clock countdown (250 ms tick), get-ready 3 s before **every** work round, variable rounds, pause/resume, skip rest, complete phase ~1.5 s
- [x] Phase gradients from `--work` / `--rest` / `--ready` / `--complete`; paused ~60% overlay
- [x] Web Audio API ticks (soft get-ready; loud last 3 s of work); unlock on first tap
- [x] Wake Lock while running (`useWakeLock` in timer feature)
- [x] Auto-complete via `setExerciseCompletion({ completedVia: 'timer', … })` then navigate home
- [x] Long-press (~500 ms) on timed cards → manual complete (`completedVia: 'manual'`)
- [x] Extended `TimerSession` router state: `dayId`, `routineExerciseIdsForDay`
- [x] `timer` i18n namespace (uk + en); Vitest unit tests for `useIntervalTimer`

#### Nits & follow-ups (Phase 6)

- [x] Playwright e2e for timer happy path (Phase 11)
- [ ] Gate `UpdatePrompt` auto-reload while timer active (Phase 4 nit)

---

### Phase 7 — JSON import/export (Jun 15, 2026)

- [x] `src/data/routineJson.ts`: `exportRoutineToJson`, `importRoutineFromJson` (JSON.parse + `parseRoutine`), `routineExportFilename`, `downloadRoutineJson`
- [x] `ConfigPage`: Export JSON (disabled when no user routine via `useUserRoutine`) + Import JSON (hidden file input, validate then `setUserRoutine`, navigate home on success, show `InvalidRoutineError.message` on failure)
- [x] Export filename: `solo-leveling-routine.json` or `solo-leveling-routine-{name-slug}.json`; pretty-printed 2-space indent
- [x] `config` i18n keys (uk + en): `routine.exportJson`, `routine.importError`, `routine.exportError`, `routine.noRoutineToExport`
- [x] Unit tests in `src/data/routineJson.test.ts` (round-trip, invalid JSON, schemaVersion too high)

#### Nits & follow-ups (Phase 7)

- [ ] WelcomePage stub removed in Phase 5.7 nav consolidation — import/export lives on `/config` only

---

### Phase 8 — Admin whitelist CRUD + default routine editor (Jun 15, 2026)

- [x] `src/data/allowedUsers.ts`: `listAllowedUsers`, `addAllowedUser`, `removeAllowedUser`, `ALLOWED_USER_SCHEMA_VERSION = 1`; kept `useIsWhitelisted`
- [x] `src/data/allowedUsers.test.ts`: unit tests with vi.mock firebase (list/add/remove/invalid email)
- [x] `src/data/routine.ts`: `setDefaultRoutine` writes `/defaults/routine`
- [x] `ConfigPage` admin subsection (`AdminSection.tsx`): whitelist list/reload/add/remove (confirm dialog); default routine export/import/reset-to-built-in; gated by `useIsAdmin`
- [x] `config` i18n keys (uk + en) for all admin strings
- [x] No `/admins` CRUD UI (manual console only, per multi-user.md v1 scope)

---

### Phase 9 — Yearly archive (Jun 15, 2026)

- [x] `src/data/archive.ts`: `summarizeYear`, `createArchive`, `fetchDailyLogsForYear`, `listArchives`, `getArchive`, `deleteRawLogsForYear`, `getPendingArchiveYear`, `useArchivePrompt`
- [x] `ARCHIVE_SCHEMA_VERSION = 1` + `YearlyArchive` type in `schema.ts`
- [x] `ArchiveBanner` on TodayPage when previous-year archive is missing
- [x] Settings "Archives" section: list archives, create previous year, manual year picker (last 3 years), delete raw logs
- [x] `archive` i18n namespace (uk + en)
- [x] Unit tests in `src/data/archive.test.ts` (summarizeYear streaks/totals/work seconds, firebase mocks)

---

### Phase 10 — Production icon export (Jun 15, 2026)

- [x] `scripts/build-icons.mjs` — rasterize SVG sources to PNG via `sharp` (`npm run build:icons`)
- [x] Generated `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` from existing SVG placeholders
- [x] PWA manifest in `vite.config.ts` updated to reference PNG icons (+ SVG `any` fallback)
- [x] `sharp` added as devDependency

---

## Rough roadmap (post Phase 5)

Order subject to change. Each phase is one subagent dispatch + verification.

- [x] **Phase 6 — Interval Timer**: full-screen, normalized variable intervals, auto-complete-on-finish, theme colors from `design/theme.md`, Wake Lock.
- [x] **Phase 7 — JSON Import/Export**: serialize/parse routines with schema validation per `data-model.md`.
- [x] **Phase 8 — Admin screens**: whitelist CRUD + default routine editor.
- [x] **Phase 9 — Yearly archive**: summarizer + raw-log deletion + first-of-year banner trigger.
- [x] **Phase 10 — Production icon export**: 192 / 512 / maskable-512 PNGs, hooked into manifest.
- [x] **Phase 11 — Playwright e2e**: 1 happy-path per primary screen.

---

### Phase 11 — Playwright e2e (Jun 15, 2026)

- [x] `VITE_E2E_FIXTURES=true` build-time fixture mode in `src/e2e/fixtures.ts` — short-circuits auth, whitelist, profile, routine, daily log (no Firestore in happy paths)
- [x] `playwright.config.ts` — two projects: `unauthenticated` (port 5001, sign-in) + `authenticated` (port 5000, Pixel 7, fixtures)
- [x] Happy-path specs: `sign-in`, `today`, `config`, `settings`, `timer`
- [x] `docs/dev/testing.md` — E2E fixture mode note

---

## Unscheduled backlog (small + free-floating)

- [ ] "Download all my data" admin button (per `architecture.md` backups discussion)
- [ ] `short_name` choice for the PWA manifest (open-question #4)
- [ ] Get-ready lead-in default toggle (open-question #1) — **on** in v1; Settings toggle deferred
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
- [~] Sound + haptics on timer phase change — basic Web Audio ticks shipped Phase 6; Settings toggle deferred
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
