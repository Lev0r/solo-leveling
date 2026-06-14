# Testing

Two layers: **Vitest** for fast unit / component tests, **Playwright** for end-to-end browser tests. Playwright is here partly for the maintainer's learning, partly because the timer + PWA + service worker stack has enough moving parts to benefit from real-browser coverage.

## Vitest (unit & component)

### Setup (planned)

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

### Conventions

- Co-locate tests as `*.test.ts(x)` next to the source.
- One test file per module under test.
- Mock Firestore via thin adapters in `src/data/`; tests pass fake repository implementations.
- Don't import from `firebase/*` in tests — import from `src/data/*`.

### What to test (priority order)

1. **Pure logic** — cycle-index calculation, timezone math, schema normalization (timer uniform → array), validation.
2. **Reducers / hooks** — `useIntervalTimer` state transitions, pause/resume timing.
3. **Components** — Today's Workout row interactions, timer auto-complete callback fires.
4. **i18n** — Ukrainian plural rules render the right key.

```ts
// example
import { describe, it, expect } from 'vitest';
import { normalizeTimer } from './schema';

describe('normalizeTimer', () => {
  it('expands uniform shorthand to per-round array', () => {
    const out = normalizeTimer({ workSeconds: 40, restSeconds: 20, rounds: 3 });
    expect(out.rounds).toEqual([
      { workSeconds: 40, restSeconds: 20 },
      { workSeconds: 40, restSeconds: 20 },
      { workSeconds: 40, restSeconds: 20 },
    ]);
  });

  it('passes variable form through', () => {
    const out = normalizeTimer({ rounds: [{ workSeconds: 40, restSeconds: 20 }] });
    expect(out.rounds).toHaveLength(1);
  });
});
```

### Run

```bash
npm test              # watch mode
npm test -- --run     # single run (CI / pre-deploy)
npm run test:ui       # vitest UI in browser
```

## Playwright (e2e)

### Setup (planned)

```bash
npm install -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'android-pixel',
      use: { ...devices['Pixel 7'] },  // mobile viewport, touch
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 5000',
    port: 5000,
    reuseExistingServer: !process.env.CI,
  },
});
```

Single project (`android-pixel`) — matches the actual target. No need to run a desktop project in v1.

### What to test (priority order)

1. **Auth + whitelist gate** — non-whitelisted user sees the "not invited" screen and cannot read data.
2. **Today's Workout end-to-end** — sign in, complete an exercise, refresh, see it still complete.
3. **Timer flow** — tap timer, run through (with sped-up clock via `page.clock.install()`), verify auto-complete writes to the log.
4. **JSON import/export** — round-trip a routine file.
5. **i18n switch** — change language, see the timer phase label switch.

### Using the emulator for e2e

E2e tests run against the Firebase emulator, not production. The Playwright `webServer` should set `VITE_USE_EMULATOR=true`, and a separate `globalSetup` should start the emulator + seed:

```ts
// e2e/global-setup.ts
import { exec } from 'node:child_process';
export default async function () {
  // start emulator (or expect dev to have it running)
  // run npm run seed
}
```

For learning purposes, it's fine v1 to require running the emulator + seed manually before `npm run test:e2e`.

### Run

```bash
npm run test:e2e
npm run test:e2e -- --ui     # Playwright UI mode (great for learning)
npx playwright show-report   # last run's HTML report
```

## What NOT to test in v1

- Cross-browser parity (Chromium only).
- Visual regression (Percy/Chromatic — overkill for personal app).
- Coverage gates. Aim for thoughtful tests, not metric chasing.

## Coverage targets (informal)

- 100% of `src/lib/cycle.ts`, `src/lib/timezone.ts`, `src/data/schema.ts` — these are the pieces a wrong test would let through silently.
- 1 happy-path e2e per primary screen.

Everything else is judgment.
