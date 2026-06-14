# Feature: Multi-User Foundation

v1 ships with one user (the owner). The data model and security rules are designed so adding more users is a configuration change — no code rewrite, no data migration.

## Identity & Whitelist

- Sign-in: Google via Firebase Authentication.
- Access gate: existence of `/allowedUsers/{email}` document, **not** a hardcoded email.
- Admin role: existence of `/admins/{uid}` document. Admins can manage `/allowedUsers`, `/admins`, and `/defaults`.

### Bootstrap (v1 owner)

After Firebase project creation and the first sign-in by `kir.matienko@gmail.com`:

1. Manually create `/allowedUsers/kir.matienko@gmail.com` (Firebase console or seed script).
2. Manually create `/admins/{owner-uid}` (uid copied from Firebase Auth console).

From that point on, the owner can add new whitelisted users + admins from the in-app admin screen.

## Per-User Data Layout

```
/users/{uid}                       — profile + settings
  /routine/active                  — personal routine (or absent → use default)
  /dailyLogs/{YYYY-MM-DD}          — completion log
  /archives/{YYYY}                 — yearly summary

/defaults/routine                  — shared default routine (read-only for users)
/allowedUsers/{email}              — whitelist
/admins/{uid}                      — admin role
```

Each user's program and history are **fully private**. No user can read another user's `/users/{uid}/...` tree.

The default routine in `/defaults/routine` is shared and readable by every whitelisted user. New users see it on the `/welcome` screen and choose between:

- **Use default** — copy `/defaults/routine` into their own `/users/{uid}/routine/active`.
- **Import JSON** — upload their own.
- **Start empty** — create a placeholder routine.

## Firestore Security Rules (canonical)

These are the rules that go in `firestore.rules`. They enforce the multi-user contract regardless of what the client app does.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isWhitelisted() {
      return isSignedIn()
        && exists(/databases/$(database)/documents/allowedUsers/$(request.auth.token.email));
    }

    function isAdmin() {
      return isSignedIn()
        && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // Per-user data — only the owner of the uid path can access it
    match /users/{uid}/{document=**} {
      allow read, write: if isWhitelisted() && request.auth.uid == uid;
    }

    // Default routine — any whitelisted user can read; only admins can write
    match /defaults/{doc=**} {
      allow read: if isWhitelisted();
      allow write: if isAdmin();
    }

    // Whitelist — any whitelisted user can read (so they see who else is in);
    // only admins can write
    match /allowedUsers/{email} {
      allow read: if isWhitelisted();
      allow write: if isAdmin();
    }

    // Admins — readable by admins, writable by admins
    match /admins/{uid} {
      allow read, write: if isAdmin();
    }
  }
}
```

> Note: `request.auth.token.email` requires the email to be verified by the auth provider. Google Sign-In emails are always verified, so this is safe.

## App Behavior

### Sign-in flow

```
1. User taps "Sign in with Google"
2. Firebase Auth returns user + token
3. App reads /allowedUsers/{user.email}
   - Found → continue
   - Not found → show "Not invited" screen + sign-out button (stop)
4. App reads /users/{uid}
   - Missing → create with defaults (timezone from browser, language "uk")
   - Present → update lastSignInAt
5. App reads /users/{uid}/routine/active
   - Missing → redirect to /welcome
   - Present → /
```

### Routing access

| Route | Required |
|-------|----------|
| `/`, `/timer`, `/config`, `/settings`, `/welcome` | whitelisted |
| `/admin/*` | admin |

Client checks are UX-only; security rules are the source of truth.

## Things v1 Does Not Build (but the design supports)

- **Self-service signup.** v1 owner manually adds emails. Future UI: an admin screen with "Add user" form.
- **Invite tokens.** Could later add `/invites/{token}` with one-shot rules; not needed yet.
- **Per-user themes.** `theme` field on `/users/{uid}` is reserved.
- **Sharing a routine between users.** Future: `/sharedRoutines/{routineId}` + a "subscribe" copy-on-write. Out of scope.

## Migrations from Single-User MOU

The original MOU specified a single hardcoded email in security rules. This design supersedes it. There is no data to migrate (no code has been written yet); the change is documentation-only.
