# Firebase Emulator Setup

For local development without touching production Firestore. The emulator suite gives a local Auth + Firestore + Hosting stack you can blow away at any time.

## Why use it

- Iterate on security rules without breaking production.
- Test the multi-user / admin flows by signing in as different fake Google accounts.
- No network round-trips; instant reads/writes.
- Free.

## One-time install

Requires Java 11+ (the emulator runs on the JVM) and the Firebase CLI.

```bash
# Firebase CLI
npm install -g firebase-tools

# Verify Java
java -version
# If missing on WSL/Ubuntu:
sudo apt install -y default-jre
```

## Project init

The Firebase project (`solo-leveling-fa230`) already exists, and `firebase.json` + `.firebaserc` are committed at the repo root. You do **not** need to run `firebase init emulators` — the config is in place.

One-time login:

```bash
firebase login
firebase use default          # confirms .firebaserc → solo-leveling-fa230
```

Emulator ports (from committed `firebase.json`):

- Authentication — `9099`
- Firestore — `8080`
- Hosting — `5000`
- Emulator UI — `4000`

## Running locally

```bash
npm run emulators        # firebase emulators:start --import=./.emulator-data --export-on-exit
```

The `--import` / `--export-on-exit` flags persist seeded data across runs so you don't have to recreate test users every time.

In a separate terminal:

```bash
npm run dev              # vite dev server, talks to the emulator
```

## App-side configuration

The Firebase init code detects the emulator via env var:

```ts
// src/data/firebase.ts (sketch)
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
});

export const auth = getAuth(app);
export const db = getFirestore(app);

if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

Template `.env.example` is committed; copy to `.env.local` and fill in the values from Firebase Console → Project settings → Your apps. The values are PUBLIC (web API keys identify the project, not authorize it — access control lives in Firestore rules).

`.env.development` (committed; no secrets):

```
VITE_USE_EMULATOR=true
VITE_FIREBASE_PROJECT_ID=solo-leveling-fa230
```

`.env.production.local` (gitignored; populated from the web app config):

```
VITE_USE_EMULATOR=false
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=solo-leveling-fa230.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=solo-leveling-fa230
VITE_FIREBASE_STORAGE_BUCKET=solo-leveling-fa230.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Seeding the emulator

Create `scripts/seed-emulator.ts` (run via `tsx`) to populate:

- One admin user in Firebase Auth.
- `/allowedUsers/kir.matienko@gmail.com`.
- `/admins/{uid}`.
- `/defaults/routine` (loaded from `docs/basic-program-template.md` translated to the routine JSON shape).
- A few `/users/{uid}/dailyLogs/*` entries for the past week.

`npm run seed` runs this against the local emulator. Idempotent — safe to re-run.

## Security rules: emulator vs production

The emulator enforces `firestore.rules` exactly as production would. Do **not** add an emulator-only "allow all" rule. If you need to bypass a rule for a test, use the seed script (which goes through the Admin SDK and bypasses rules legitimately).

## Useful URLs while emulators are running

| Service | URL |
|---------|-----|
| Emulator UI | http://localhost:4000 |
| Firestore data viewer | http://localhost:4000/firestore |
| Auth users | http://localhost:4000/auth |
| Hosting preview | http://localhost:5000 |

## Tearing down

`Ctrl+C` in the emulator terminal. Because of `--export-on-exit`, state is written to `./.emulator-data` (gitignored).

To start fresh:

```bash
rm -rf .emulator-data
npm run emulators
npm run seed
```
