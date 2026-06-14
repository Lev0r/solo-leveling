# SoloLeveling — Home Workout Tracker

A personal, **mobile-first PWA** home workout tracker. Assigns daily exercises from a rotating program, logs completion, supports timed intervals via a full-screen work/rest timer, and installs to the Android home screen like a native app.

The name is a manhwa joke (Solo Leveling — getting stronger alone, with an in-system "+1 LVL" vibe). The app is for personal training, not anime reading.

## Status

Pre-development. Project and repo skeleton in place; no application code yet.

| Resource | URL / ID |
|----------|----------|
| GitHub repo | https://github.com/Lev0r/solo-leveling (SSH: `git@github.com-personal:Lev0r/solo-leveling.git`) |
| Firebase project | `solo-leveling-fa230` ([console](https://console.firebase.google.com/u/0/project/solo-leveling-fa230)) |
| Firestore region | `eur3` (Europe multi-region) |
| Owner | `kir.matienko@gmail.com` (in `/allowedUsers` whitelist) |

See [docs/open-questions.md](./docs/open-questions.md) for items still pending.

## Documentation

| Document | Description |
|----------|-------------|
| [AGENTS.md](./AGENTS.md) | Working agreement for human + AI contributors (read first) |
| [MOU.md](./MOU.md) | Original Memorandum of Understanding |
| [docs/README.md](./docs/README.md) | Documentation index |
| [docs/architecture.md](./docs/architecture.md) | System design, tech stack, PWA setup |
| [docs/data-model.md](./docs/data-model.md) | Firestore schemas (multi-user ready) and JSON import format |
| [docs/extensibility.md](./docs/extensibility.md) | Patterns for future features (charts, weight logs, etc.) |
| [docs/open-questions.md](./docs/open-questions.md) | Decisions still needed |
| [docs/basic-program-template.md](./docs/basic-program-template.md) | Initial v1 training program (Ukrainian) |
| [docs/features/interval-timer.md](./docs/features/interval-timer.md) | Full-screen work/rest interval timer (variable intervals supported) |
| [docs/features/multi-user.md](./docs/features/multi-user.md) | Auth whitelist + per-user data isolation |
| [docs/features/i18n.md](./docs/features/i18n.md) | Localization (default: Ukrainian) |
| [docs/features/yearly-archive.md](./docs/features/yearly-archive.md) | Yearly summary + log retention |
| [docs/design/theme.md](./docs/design/theme.md) | Colors, typography, design tokens |
| [docs/design/icon.md](./docs/design/icon.md) | App icon concept and asset spec |
| [docs/dev/firebase-emulator.md](./docs/dev/firebase-emulator.md) | Local Firebase setup |
| [docs/dev/deploy.md](./docs/dev/deploy.md) | Deploy via npm script |
| [docs/dev/testing.md](./docs/dev/testing.md) | Vitest + Playwright |

## Tech Stack

- **Frontend:** React + Vite + TypeScript (`strict: true`)
- **PWA:** `vite-plugin-pwa` (installable, offline app shell, portrait-locked)
- **i18n:** `i18next` + `react-i18next`, default locale **uk** (Ukrainian)
- **Hosting:** Firebase Hosting
- **Database:** Firestore
- **Auth:** Firebase Authentication (Google Sign-In, whitelist collection)
- **Tests:** Vitest (unit) + Playwright (e2e)

## Design Principles

- **Mobile-first, Android-primary.** iOS support is incidental; do not spend effort on Safari-only fixes.
- **Installable PWA.** Standalone display, portrait-locked, soft dark theme.
- **Multi-user-ready data model from day one.** v1 ships with one user; data lives under `/users/{uid}/...`. Whitelist is a Firestore collection, not a hardcoded email.
- **Extensible.** Versioned schemas, discriminated unions for exercise types, per-user yearly archives.
- **Token-conscious development.** See [AGENTS.md §8](./AGENTS.md#8-token-efficient-development-workflow-important) for the subagent workflow.

## App Icon

Concept asset at [`assets/sololeveling-icon.png`](./assets/sololeveling-icon.png). See [docs/design/icon.md](./docs/design/icon.md) for the production asset spec.

## License

MIT (see `LICENSE` once the repo is created on GitHub).
