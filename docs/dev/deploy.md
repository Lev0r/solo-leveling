# Deploy

Manual deploys from the developer machine — no CI/CD in v1. Everything is `npm run ...`.

## Prerequisites

- Firebase CLI installed and logged in (`firebase login`).
- `.firebaserc` points at `solo-leveling-fa230` (already committed at repo root).
- `firebase.json` has `hosting`, `firestore`, and `emulators` blocks configured (already committed).
- Git remote uses the custom SSH host: `git@github.com-personal:Lev0r/solo-leveling.git`.

## Commands

Defined in `package.json` (once it exists):

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "test": "vitest",
    "test:e2e": "playwright test",
    "emulators": "firebase emulators:start --import=./.emulator-data --export-on-exit",
    "seed": "tsx scripts/seed-emulator.ts",
    "deploy": "npm run build && firebase deploy --only hosting,firestore",
    "deploy:hosting": "npm run build && firebase deploy --only hosting",
    "deploy:rules": "firebase deploy --only firestore:rules",
    "deploy:indexes": "firebase deploy --only firestore:indexes"
  }
}
```

## Standard release flow

```bash
git pull
npm install
npm run typecheck
npm run lint
npm run test
npm run deploy
```

If only the rules changed: `npm run deploy:rules` (seconds, no build).

## What `npm run deploy` does

1. `tsc --noEmit` — catches type errors before publishing broken builds.
2. `vite build` — produces `dist/` with the hashed JS/CSS, the PWA manifest, the service worker, and the precached app shell.
3. `firebase deploy --only hosting,firestore` — uploads `dist/` to Firebase Hosting and pushes `firestore.rules` + `firestore.indexes.json`.

## `firebase.json` (canonical)

The canonical `firebase.json` is committed at the repo root. Key choices:

- `hosting.public: "dist"` — Vite's build output.
- `hosting.rewrites` — SPA fallback to `index.html` for all routes.
- `hosting.headers` — long-cache hashed JS/CSS, **no-cache** for `index.html` and `sw.js` so returning users always pick up a new service worker (otherwise they get stuck on a stale one).
- `firestore.rules` / `firestore.indexes` — point at the two committed JSON files.
- `emulators` — local dev ports (UI on `:4000`).

## Verifying a deploy

After `npm run deploy` succeeds:

1. Open the live URL in a fresh incognito tab.
2. Check the build hash in DevTools → Application → Manifest matches the just-built one.
3. Reinstall on Android home screen if testing PWA behavior.

## Rollback

Firebase Hosting keeps the last 10 releases. From the Hosting console: pick a previous release → "Rollback". Firestore rules don't roll back automatically — keep the previous rules in git and `npm run deploy:rules` from a checkout of the old commit if needed.

## Future (not v1)

- GitHub Actions: `on: push to main → build → deploy --only hosting`. Add `FIREBASE_TOKEN` secret. Doc lives here when it's needed.
- Preview channels per branch: `firebase hosting:channel:deploy <branchname>`.
