# Documentation Index

This folder contains design and feature documentation for **SoloLeveling**, a mobile-first PWA home workout tracker. Implementation has not started; these documents define the target behavior before the GitHub repository and Firebase project are created.

## Read First

- **[../AGENTS.md](../AGENTS.md)** — Working agreement for human + AI contributors. Includes the token-efficient subagent workflow.
- **[backlog.md](./backlog.md)** — What's done, in flight, and next. Read on session start to know where things stand.
- **[open-questions.md](./open-questions.md)** — Decisions still pending.

## Foundation

- **[architecture.md](./architecture.md)** — Tech stack, mobile-first + PWA setup, routing, auth, deployment, cycle calculation, multi-user-ready layout.
- **[data-model.md](./data-model.md)** — Firestore collections, document schemas, `schemaVersion`, JSON import/export, migrations.
- **[extensibility.md](./extensibility.md)** — Patterns to keep future features (charts, weight logs, more users, sound) cheap.
- **[basic-program-template.md](./basic-program-template.md)** — Initial v1 training program (Ukrainian, kettlebell-based 3-day split).

## Features

- **[features/interval-timer.md](./features/interval-timer.md)** — Full-screen work/rest interval timer. Supports uniform and per-round variable intervals; auto-marks complete on finish.
- **[features/multi-user.md](./features/multi-user.md)** — Auth whitelist + per-user data isolation. v1 ships single-user; the design supports many.
- **[features/i18n.md](./features/i18n.md)** — Localization. Default locale: Ukrainian (`uk`).
- **[features/yearly-archive.md](./features/yearly-archive.md)** — Per-year log summarization + retention policy.

## Design

- **[design/theme.md](./design/theme.md)** — Soft dark palette, warm-for-work / cool-for-rest, typography, spacing, tokens.
- **[design/icon.md](./design/icon.md)** — App icon concept (kettlebell in an RPG "system" frame) and production asset spec.

## Dev

- **[dev/firebase-emulator.md](./dev/firebase-emulator.md)** — Local Firebase Auth + Firestore emulator setup.
- **[dev/deploy.md](./dev/deploy.md)** — Manual deploys via `npm run deploy`.
- **[dev/testing.md](./dev/testing.md)** — Vitest (unit) + Playwright (e2e).

## Conventions

- **v1.0** — Minimum viable behavior for first release.
- **v2.0** — Planned extensions that should not require breaking changes to v1 data.
- Every persisted shape carries `schemaVersion`. Bump it when the shape changes. See [extensibility.md](./extensibility.md).
- Default UI language is Ukrainian; all strings via i18n.
- Multi-user-ready data model from day one; v1 UI is single-user.

## Related

- [../MOU.md](../MOU.md) — Original memorandum of understanding (superseded in parts by `architecture.md` and `features/multi-user.md`).
