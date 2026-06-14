# Open Questions

Decisions still pending. When resolved, **move the answer into the relevant doc and delete the item from this list** (see [AGENTS.md §2](../AGENTS.md#2-always-update-documentation)).

## Pending — Need Owner Input Eventually

### Behavior — Small Defaults

1. **Get-ready lead-in.** The interval timer spec has an optional 3 s `GetReady` phase before round 1. Default: **on**. Confirm or override before shipping.
2. **Variable timer hint format on the workout row.** Spec proposes joined work durations (`40/30/30`) for variable, `4×40/20` for uniform. OK?
3. **First-time language detection.** Default is `uk`. If the browser locale is `en`, do we still force `uk`, or pick `en` until the user explicitly sets one? Spec currently: prefer `uk` unless the user explicitly changes it.

### Visual — Final Tweaks

4. **App display name in the manifest.** Currently `"SoloLeveling"` for both `name` and `short_name`. Different short name for the home-screen launcher (max ~12 chars looks good on Android)? E.g. `name: "SoloLeveling", short_name: "SoloLvl"`.
5. **Final icon export.** The concept render at `assets/sololeveling-icon.png` is 3:2 and needs a square + maskable export pass. Either re-generate via image gen, hand-edit in a vector tool, or commission. See [design/icon.md](./design/icon.md).

### Data Hygiene

6. **Manual JSON "download all my data" backup.** Documented as a recommendation in `architecture.md`. Build the admin button in v1, or defer to v2?

---

## Resolved (kept here briefly as a changelog, delete after a few iterations)

- ~~Firebase project + region~~ → `solo-leveling-fa230` / `eur3` (Europe multi-region). `.firebaserc` committed.
- ~~GitHub repo~~ → https://github.com/Lev0r/solo-leveling, MIT, public. SSH remote uses host alias `github.com-personal`.
- ~~Owner email~~ → `kir.matienko@gmail.com`, stored in `/allowedUsers/{email}` collection (multi-user-ready, not hardcoded).
- ~~Whitelist storage location~~ → Firestore collection `/allowedUsers/{email}`, manageable from the app.
- ~~App name~~ → **SoloLeveling**. Icon: kettlebell in an RPG "system" frame with "+1 LVL" — not the protagonist, no anime art.
- ~~Default language~~ → **Ukrainian (`uk`)**.
- ~~Anchor date~~ → `2026-01-01`.
- ~~Initial routine~~ → `docs/basic-program-template.md` (Ukrainian, kettlebell-based 3-day split).
- ~~Theme~~ → soft dark (`#13141B`), warm `#FF6B35` for work, cool `#22D3EE` for rest, violet `#A78BFA` accent. Details: [design/theme.md](./design/theme.md).
- ~~Timezone storage~~ → UTC in Firestore; user's IANA timezone stored on `/users/{uid}`; date math always in local timezone.
- ~~Missed-day behavior~~ → cycle advances by calendar day; no log entries for missed days.
- ~~Auto-mark complete after timer~~ → **yes**, writes `dailyLog.exercises[id]` with `completedVia: "timer"`.
- ~~Variable-interval timer support~~ → JSON accepts uniform shorthand and per-round array; reader normalizes to array.
- ~~Real-time listeners~~ → no. One-shot reads only in v1.
- ~~Orientation~~ → portrait, locked via manifest.
- ~~Wake Lock fallback~~ → do nothing if unsupported.
- ~~Notifications~~ → deferred. FCM not wired.
- ~~Backups~~ → trust Firestore for storage; ship a manual "download all my data" admin export (see Q8 above for timing). No scheduled exports in v1 (requires Blaze).
- ~~Data retention~~ → keep raw logs until summarized; one summary per calendar year in `users/{uid}/archives/{year}`; raw logs deletable after archival. See [features/yearly-archive.md](./features/yearly-archive.md).
- ~~Firebase emulator~~ → use it for local dev. Setup guide: [dev/firebase-emulator.md](./dev/firebase-emulator.md).
- ~~CI/CD~~ → none in v1. `npm run deploy` from dev machine. See [dev/deploy.md](./dev/deploy.md).
- ~~Test stack~~ → Vitest + Playwright (Chromium / Pixel device). See [dev/testing.md](./dev/testing.md).
- ~~Linting~~ → ESLint + `@typescript-eslint` + Prettier, defaults.
- ~~License~~ → MIT, public repo.
- ~~Multi-user~~ → out of v1 UI scope, but **data model and security rules are multi-user-ready**. See [features/multi-user.md](./features/multi-user.md).
- ~~Charts / weight logs / sound / haptics~~ → out of v1; hooks reserved in data model and component contracts. See [extensibility.md](./extensibility.md).
- ~~iOS support~~ → not a target. No iOS-specific work.
